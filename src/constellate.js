'use strict'

const aes = require('aes-js')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const request = require('xhr-request')

const BigchainDB = require('../lib/bigchaindb.js')
const Fingerprint = require('../lib/fingerprint.js')
const Ipfs = require('../lib/ipfs.js')
const Resolver = require('../lib/resolver.js')
const Services = require('../lib/services.js')
const Swarm = require('../lib/swarm.js')

const {
    Tasks,
    assign,
    bufferToFile,
    capitalize,
    clone,
    isArray,
    isObject,
    isString,
    newArray,
    order,
    readFileAs,
    transform,
    traverse
} = require('../lib/util.js')

// @flow

/**
 * @module constellate/src/constellate
 */

const parseCSVs = (csvs: string[], types: string[], tasks: Object, t: number, i?: number) => {
    if (csvs.length !== types.length) {
      return tasks.error('different number of csvs and types')
    }
    const combined = {}
    let a, b, key, keys, length = 0, obj, val
    for (a = 0; a < csvs.length; a++) {
      obj = parseCSV(csvs[a], types[a])
      keys = Object.keys(obj)
      for (b = 0; b < keys.length; b++) {
          key = keys[b]
          if (!combined[key]) {
              combined[key] = newArray(null, length)
          }
          combined[key].push(obj[key])
      }
      length += obj[key].length
    }
    const objs = new Array(length)
    keys = Object.keys(combined)
    for (a = 0; a < objs.length; a++) {
        obj = {}
        for (b = 0; b < keys.length; b++) {
            key = keys[b]
            val = combined[key][a]
            if (val) obj[key] = val
        }
        objs[a] = obj
    }
    tasks.run(t, objs, i)
}

const parseCSV = (csv: string, type: string): Object => {
    const data = {}
    const lines = csv.replace(/\r/g, '').split('\n').filter(line => !!line)
    const headers = lines[0].split(',')
    let i
    for (i = 0; i < headers.length; i++) {
        data[headers[i]] = new Array(lines.length - 1)
    }
    data.type = (Array: any).apply(null, {
        length: lines.length - 1
    }).map(() => type)
    let idx, queryIdx, startIdx
    let key, length, obj, row, v, vals
    for (i = 1; i < lines.length; i++) {
        idx = 0, queryIdx = 0, startIdx = 0
        obj = {}, row = lines[i]
        if (!row.trim()) continue
        while (idx < row.length) {
            if (row[idx] === '"') {
                while (idx < row.length - 1) {
                    if (row[++idx] === '"') break
                }
            }
            if (row[idx] === ',' || idx + 1 === row.length) {
                length = idx - startIdx
                if (idx + 1 === row.length) length++
                v = row.substr(startIdx, length).replace(/\,\s+/g, ',').trim()
                if (v[0] === '"') {
                    v = v.substr(1)
                }
                if (v.substr(-1) === ',' || v.substr(-1) === '"') {
                    v = v.substr(0, v.length - 1)
                }
                const key = headers[queryIdx++]
                if (!v) {
                    data[key][i - 1] = null
                } else {
                    vals = v.split(',')
                    if (vals.length > 1) {
                        data[key][i - 1] = vals
                    } else {
                        data[key][i - 1] = v
                    }
                }
                startIdx = idx + 1
            }
            idx++
        }
    }
    return data
}

const parseJSONs = (jsons: string[], types: string[], tasks: Object, t: number, i?: number) => {
    if (jsons.length !== types.length) {
      return tasks.error('different number of jsons and types')
    }
    const objs = new Array(jsons.length)
    let j
    for (let i = 0; i < jsons.length; i++) {
      try {
        objs[i] = JSON.parse(jsons[i])
      } catch(err) {
        tasks.error(err)
      }
      if (!isArray(objs[i], isObject)) {
          return tasks.error('expected array of objects')
      }
      for (j = 0; j < objs[i].length; j++) {
          objs[i][j].type = types[i]
      }
    }
    tasks.run(t, objs, i)
}

const toCSV = (arr: Array < Array < string | string[] >> ): string => {
    let csv = '',
        i, j, k, val
    for (i = 0; i < arr[0].length; i++) {
        for (j = 0; j < arr.length; j++) {
            val = arr[j][i]
            if (typeof val === 'string') { // isString(val)
                csv += val
            } else if (isArray(val, isString)) {
                csv += '"'
                for (k = 0; k < val.length; k++) {
                    csv += val[k]
                }
                csv += '"'
            } else {
                throw new Error('unexpected value: ' + JSON.stringify(val))
            }
            if (j === arr.length - 1) {
                csv += '\n'
            } else {
                csv += ','
            }
        }
    }
    return csv
}

const defaultRepoPath = '/tmp/constellate'

module.exports = function () {

    // const fp = new Fingerprint()

    const services = new Services()

    let fileHashes, files, ipld, keys, meta, metaHashes, names, owners, publicKeys

    //-----------------------------------------------------------------------

    const orderMetadata = (tasks: Object, t: number, i?: number) => {
        const length = meta.length
        const ordered = []
        let queue = []
        let obj, name, next
        while (ordered.length !== length) {
            if (next) {
                const idx = meta.findIndex(obj => obj.name === next)
                if (idx < 0) {
                  return tasks.error(`could not find "${next}"`)
                }
                obj = meta.splice(idx, 1)[0]
            } else {
                obj = meta.shift()
            }
            if (!obj.name) {
              return tasks.error('no name specified')
            }
            if (!obj.type) {
              return tasks.error('no type specified')
            }
            next = ''
            traverse(obj, (_, val) => {
                if (isString(val) && val[0] === '@') {
                    name = val.slice(1)
                    if (!next && ordered.every(obj => obj.name !== name)) {
                        if (queue.includes(name)) {
                            return tasks.error(`circular reference between "${name}" and "${obj.name}"`)
                        }
                        meta.push(obj)
                        next = name
                        queue.push(obj.name)
                    }
                }
            })
            if (next) continue
            ordered.push(obj)
            queue = []
        }
        meta = ordered
        tasks.run(t, i)
    }

    const pushIPLD = (service: Object, privateKey: string, tasks: Object, t: number, i?: number) => {
        if (!ipld || !ipld.length) {
            return tasks.error('no ipld')
        }
        let count = 0
        const t1 = tasks.add((hash, j) => {
            if (hash !== metaHashes[names[j]]) {
                return tasks.error(`expected hash=${metaHashes[names[j]]}, got ` + hash)
            }
            if (++count !== ipld.length) return
            console.log('Pushed IPLD')
            tasks.run(t, i)
        })
        for (let j = 0; j < ipld.length; j++) {
          service.put({
            data: ipld[j],
            issuer: privateKey,
            metadata: null,
            owners: owners[names[j]]
          }, tasks, t1, j)
        }
    }

    const uploadContent = (service: Object, tasks: Object, t: number, i?: number) => {
        if (!files || !files.length) {
            return tasks.error('no files')
        }
        const paths = new Array(files.length)
        let count = 0, t1, t2;
        t1 = tasks.add((ab, j) => {
            service.put({
              content: Buffer.from(ab),
              path: paths[j]
            }, tasks, t2, j)
        })
        t2 = tasks.add((hash, j) => {
            if (hash !== fileHashes[files[j].name]) {
              return tasks.error(`expected hash=${fileHashes[files[j].name]}, got ` + hash)
            }
            if (++count !== files.length) return
            console.log('Uploaded files')
            tasks.run(t, i)
        })
        for (let j = 0; j < files.length; j++) {
            paths[j] = '/' + files[j].name
            readFileAs(files[j], 'arraybuffer', tasks, t1, j)
        }
    }

    /*

    const fingerprint = (file: File, tasks: Object, t: number, i?: number) => {
        const type = file.type.split('/')[0]
        if (type !== 'audio') {
            return tasks.error('expected audio, got ' + type)
        }
        let t1, t2
        t1 = tasks.add(ab => {
            const body = Buffer.from(ab).toString('binary')
            request(
                serverAddr + '/fingerprint', {
                    body,
                    method: 'POST'
                },
                (err, data, res) => {
                    if (err) return tasks.error(err)
                    if (res.statusCode !== 200) {
                        return tasks.error(data)
                    }
                    fp.calc(data, tasks, t2)
                }
            )
        })
        t2 = tasks.add(() => {
          tasks.run(t, fp, i)
        })
        return readFileAs(file, 'arraybuffer', tasks, t1)
    }

    */

    const encrypt = (password: string, tasks: Object, t: number, i?: number) => {
        let count = 0, t1, t2
        t1 = tasks.add((ab, j) => {
          const name = files[j].name
          bcrypt.genSalt(10, (err, salt) => {
            if (err) return tasks.error(err)
            bcrypt.hash(password, salt, (err, hash) => {
              if (err) return tasks.error(err)
              try {
                keys[name] = Buffer.concat([
                    Buffer.from(hash.substr(-31), 'base64'),
                    crypto.randomBytes(9)
                ]).slice(0, 32)
                const aesCtr = new aes.ModeOfOperation.ctr(keys[name])
                const data = aesCtr.encrypt(Buffer.from(ab))
                files[j] = new File([data], name)
              } catch(err) {
                tasks.error(err)
              }
              keys[name] = keys[name].toString('hex')
              tasks.run(t2)
            })
          })
        })
        t2 = tasks.add(() => {
          if (++count !== files.length) return
          tasks.run(t, i)
        })
        for (let j = 0; j < files.length; j++) {
          readFileAs(files[j], 'arraybuffer', tasks, t, j)
        }
    }

    const generateIPLD = (service: Object, tasks: Object, t: number, i?: number) => {
        if (!meta || !meta.length) {
          return tasks.error('no metadata')
        }
        const hashes = []
        const resolver = new Resolver(service)
        let j, t2, t3;
        ipld = [], metaHashes = {}, names = [], owners = {}, publicKeys = {}
        t2 = tasks.add(() => {
          j = 0
          orderMetadata(tasks, t3)
        })
        t3 = tasks.add(hash => {
            if (j === meta.length) {
              console.log('Generated IPLD')
              return tasks.run(t, i)
            }
            if (isString(hash)) {
              metaHashes[meta[j++].name] = hash
              return tasks.run(t3)
            }
            if (meta[j].publicKey) {
              publicKeys[meta[j].name] = meta[j].publicKey
            }
            if (meta[j]['#']) {
              metaHashes[meta[j].name] = meta[j++]['#']
              return tasks.run(t3)
            }
            if (meta[j].owner) {
              if (!meta[j].amount) {
                return tasks.error('owner with no amount')
              }
              meta[j].amount = [].concat(meta[j].amount)
              meta[j].owner = [].concat(meta[j].owner)
              if (meta[j].amount.length !== meta[j].owner.length) {
                return tasks.error('different number of amounts and owners')
              }
              owners[meta[j].name]= {
                amount: meta[j].amount,
                publicKeys: meta[j].owner.map(owner => publicKeys[owner.slice(1)])
              }
            }
            names.push(meta[j].name)
            meta[j].name = meta[j].name.match(/^(.+?)\s*(?:\s*?\(.*?\))?$/)[1]
            meta[j] = order(transform(meta[j], val => {
              if (isString(val)) {
                if (val[0] === '@') {
                    return {
                        '/': metaHashes[val.slice(1)]
                    }
                }
                if (val[0] === '#') {
                    return {
                        '/': val.slice(1)
                    }
                }
              }
              return val
            }))
            ipld.push(meta[j])
            service.hash(meta[j], tasks, t3)
        })
        for (j = 0; j < meta.length; j++) {
            if (meta[j].type === 'Hash' && isString(meta[j]['#'])) {
                hashes.push(meta[j]['#'])
            }
        }
        if (!hashes.length) {
          return tasks.run(t2)
        }
        let count = 0
        const t1 = tasks.add((obj, j) => {
          obj['#'] = hashes[j]
          meta.push(obj)
          if (++count !== hashes.length) return
          tasks.run(t2)
        })
        for (j = 0; j < hashes.length; j++) {
            resolver.get(hashes[j], tasks, t1, j)
        }
    }

    const getContent = (service: Object, path: string, key: string, tasks: Object, t: number, i?: number) => {
        const t1 = tasks.add(data => {
            if (key) {
              try {
                const aesCtr = new aes.ModeOfOperation.ctr(Buffer.from(key, 'hex'))
                data = aesCtr.decrypt(data)
              } catch(err) {
                tasks.error(err)
              }
            }
            bufferToFile(data, path, tasks, t, i)
        })
        service.get(path, tasks, t1)
    }

    const importContent = (service: Object, filez: File[], password: string, tasks: Object, t: number, i?: number) => {
        if (!filez || !filez.length) {
            return tasks.error('no files')
        }
        let count = 0, t1, t2, t3
        fileHashes = {}, files = filez, meta = meta || []
        t1 = tasks.add(() => {
            for (let j = 0; j < files.length; j++) {
                readFileAs(files[j], 'arraybuffer', tasks, t2, j)
            }
        })
        t2 = tasks.add((ab, j) => {
            const content = Buffer.from(ab)
            service.hash(service, { content }, tasks, t3, j)
        })
        t3 = tasks.add((hash, j) => {
            fileHashes[files[j].name] = hash
            meta.push({
                contentUrl: service.pathToIRI(hash + '/' + files[j].name),
                name: files[j].name,
                type: capitalize(files[j].type.split('/')[0]) + 'Object'
            })
            if (++count !== files.length) return
            console.log('Imported content')
            tasks.run(t, i)
        })
        if (password) {
          return encrypt(password, tasks, t1)
        }
        tasks.run(t1)
    }

    const importMetadata = (files: File[], tasks: Object, t: number, i?: number) => {
        if (!files || !files.length) {
          return tasks.error('no files')
        }
        const type = files[0].type
        if (type !== 'application/json' && type !== 'text/csv') {
            return tasks.error(`expected "application/json" or "text/csv", got "${type}"`)
        }
        const names = new Array(files.length)
        const texts = new Array(files.length)
        let count = 0, t1, t2
        t1 = tasks.add((text, j) => {
            texts[j] = text
            if (++count !== texts.length) return
            if (type === 'application/json') {
                parseJSONs(texts, names, tasks, t2)
            }
            if (type === 'text/csv') {
                parseCSVs(texts, names, tasks, t2)
            }
        })
        t2 = tasks.add(objs => {
          meta.push(...objs)
          console.log('Imported metadata')
          tasks.run(t, i)
        })
        meta = meta || []
        names[0] = files[0].name.split('.')[0]
        readFileAs(files[0], 'text', t, 0)
        for (let j = 1; j < files.length; j++) {
            if (files[j].type !== type) {
                return tasks.error(`expected type=${type}, got ` + files[j].type)
            }
            names[j] = files[j].name.split('.')[0]
            readFileAs(files[j], 'text', tasks, t1, j)
        }
    }

    //-----------------------------------------------------------------------

    const tasks = new Tasks()

    this.exportHashes = (): Object => {
        return clone({
            fileHashes,
            metaHashes
        })
    }

    this.exportIPLD = (): ?Object[] => {
        return !ipld ? null : ipld
    }

    // this.exportKeys = (): ?Object => {
    //    return !keys ? null : keys
    // }

    // this.exportMetadata = (): ?Object[] => {
    //    return !meta ? null : meta
    // }

    // this.exportFiles = (): ? File[] => {
    //    return !files ? null : files
    // }

    this.importContent = (name: string, files: File[], cb: Function) => {
      // if (typeof password === 'function') {
      //  [cb, password] = [password, '']
      // } else if (!cb) {
      //  throw new Error('no callback')
      // }
      tasks.init(cb)
      tasks.add(service => {
        importContent(service, files, '', tasks, -1)
      })
      services.use(name, tasks, 0)
    }

    this.importMetadata = (files: File[], cb: Function) => {
      tasks.init(cb)
      importMetadata(files, tasks, -1)
    }

    this.generateIPLD = (name: string, cb: Function) => {
      tasks.init(cb)
      tasks.add(service => {
        generateIPLD(service, tasks, -1)
      })
      services.use(name, tasks, 0)
    }

    this.getContent = (service: string, path: string, cb: Function) => {
      // if (typeof key === 'function') {
      //  [cb, key] = [key, '']
      // } else if (!cb) {
      //  throw new Error('no callback')
      // }
      tasks.init(cb)
      tasks.add(service => {
        getContent(service, path, '', tasks, -1)
      })
      services.use(service, tasks, 0)
    }

    this.getMetadata = (name: string, path: string, expand: boolean, cb: Function) => {
      tasks.init(cb)
      let resolver
      tasks.add(service => {
        resolver = new Resolver(service)
        resolver.get(path, tasks, 1)
      })
      tasks.add(result => {
        if (expand) {
          return resolver.expand(result, tasks, -1)
        }
        tasks.run(-1, result)
      })
      services.use(name, tasks, 0)
    }

    this.BigchainDB = (url: string, cb: Function) => {
      tasks.init(cb)
      const service = new BigchainDB.MetadataService(url)
      services.add(service, tasks, -1)
    }

    this.IPFS = (repoPath: string = defaultRepoPath, cb: Function) => {
      tasks.init(cb)
      if (typeof repoPath === 'function') {
        [cb, repoPath] = [repoPath, defaultRepoPath]
      }
      let count = 0
      tasks.add(ipfs => {
        services.add(new Ipfs.ContentService(ipfs._blockService), tasks, 1)
        services.add(new Ipfs.MetadataService(ipfs.files), tasks, 1)
      })
      tasks.add(() => {
        if (++count === 2) {
          tasks.run(-1)
        }
      })
      const ipfs = new Ipfs.Node()
      ipfs.start(repoPath, tasks, 0)
    }

    this.Swarm = (url: string, cb: Function) => {
      tasks.init(cb)
      if (typeof url === 'function') {
        [cb, url] = [url, '']
      }
      const service = new Swarm.ContentService(url)
      services.add(service, tasks, -1)
    }

    this.pushIPLD = (name: string, privateKey: string, cb: Function) => {
      tasks.init(cb)
      tasks.add(service => {
        pushIPLD(service, privateKey, tasks, -1)
      })
      services.use(name, tasks, 0)
    }

    this.uploadContent = (name: string, cb: Function) => {
      tasks.init(cb)
      tasks.add(service => {
        uploadContent(service, tasks, -1)
      })
      services.use(name, tasks, 0)
    }
}
