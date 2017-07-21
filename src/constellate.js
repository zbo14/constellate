'use strict'

const aes = require('aes-js')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const request = require('xhr-request')

const Fingerprint = require('../lib/fingerprint.js')
const Ipfs = require('../lib/ipfs.js')
// const Swarm = require('../lib/swarm.js')

const {
    Tasks,
    assign,
    bufferToFile,
    capitalize,
    clone,
    isArray,
    isObject,
    isString,
    order,
    readFileAs,
    transform,
    traverse
} = require('../lib/util.js')

// @flow

/**
 * @module constellate/src/constellate
 */

const parseCSVs = (csvs: string[], types: string[]): Object[] => {
    if (!csvs || !csvs.length) throw new Error('no csvs')
    if (!types || !types.length) throw new Error('no types')
    if (csvs.length !== types.length) {
        throw new Error('different number of csvs and types')
    }
    let i, j, k, keys, length = 0,
        obj, v
    const combined = csvs.reduce((result, csv, idx) => {
        obj = parseCSV(csv, types[idx])
        keys = Object.keys(obj)
        for (i = 0; i < keys.length; i++) {
            k = keys[i]
            if (!result[k]) {
                result[k] = (Array: any).apply(null, {
                    length
                }).map(() => null)
            }
            result[k] = result[k].concat(obj[k])
        }
        length += obj[k].length
        return result
    }, {})
    const objs = new Array(combined['name'].length)
    keys = Object.keys(combined)
    for (i = 0; i < objs.length; i++) {
        obj = {}
        for (j = 0; j < keys.length; j++) {
            k = keys[j]
            v = combined[k][i]
            if (v) obj[k] = v
        }
        objs[i] = obj
    }
    return objs
}

const parseCSV = (csv: string, type: string): Object => {
    // adapted from https://gist.github.com/jonmaim/7b896cf5c8cfe932a3dd
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

const parseJSONs = (jsons: string[], types: string[]): Object[] => {
    if (!jsons || !jsons.length) throw new Error('no jsons')
    if (!types || !types.length) throw new Error('no types')
    if (jsons.length !== types.length) {
        throw new Error('different number of jsons and types')
    }
    let arr, i
    return jsons.reduce((result, json, idx) => {
        if (!isArray(arr = JSON.parse(json), isObject)) {
            throw new Error('expected array of objects')
        }
        for (i = 0; i < arr.length; i++) {
            arr[i].type = types[idx]
        }
        return result.concat(arr)
    }, [])
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

// if (modName === 'ipfs') {
//   mod = ipfs
// } else if (modName === 'swarm') {
//   mod = new Swarm()
// } else {
//   throw new Error('unexpected module name: ' + modName)
// }

module.exports = function (repoPath: string = '/tmp/constellate', serverAddr: string = 'http://127.0.0.1:8888') {

    const fp = new Fingerprint()

    const ipfs = new Ipfs(repoPath)

    let fileHashes, files, ipld, keys, meta, metaHashes, names

    //-----------------------------------------------------------------------

    const orderMetadata = (t: Object, id?: number|string) => {
        const length = meta.length
        const ordered = []
        let queue = []
        let obj, name, next
        while (ordered.length !== length) {
            if (next) {
                const idx = meta.findIndex(obj => obj.name === next)
                if (idx < 0) {
                  return t.error(`could not find "${next}"`)
                }
                obj = meta.splice(idx, 1)[0]
            } else {
                obj = meta.shift()
            }
            if (!obj.name) {
              return t.error('no name specified')
            }
            if (!obj.type) {
              return t.error('no type specified')
            }
            next = ''
            traverse(obj, (_, val) => {
                if (isString(val) && val[0] === '@') {
                    name = val.slice(1)
                    if (!next && ordered.every(obj => obj.name !== name)) {
                        if (queue.includes(name)) {
                            return t.error(`circular reference between "${name}" and "${obj.name}"`)
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
        t.run(id)
    }

    const pushIPLD = (t: Object, id?: number|string) => {
        if (!ipld || !ipld.length) {
            return t.error('no ipld')
        }
        t.task(hashes => {
            for (let i = 0; i < hashes.length; i++) {
              if (hashes[i] !== metaHashes[names[i]]) {
                  return t.error(`expected hash=${metaHashes[names[i]]}, got ` + hashes[i])
              }
            }
            console.log('Pushed IPLD')
            t.next()
            t.run(id)
        })
        ipfs.addObjects(ipld, t)
    }

    const uploadFiles = (t: Object, id?: number|string) => {
        if (!files || !files.length) {
            return t.error('no files')
        }
        const datas = new Array(files.length)
        const paths = new Array(files.length)
        let count = 0, i;
        t.task(results => {
            let name;
            for (i = 0; i < results.length; i++) {
              name = results[i].path.slice(1)
              if (results[i].hash !== fileHashes[name]) {
                  return t.error(`expected hash=${fileHashes[name]}, got ` + results[i].hash)
              }
            }
            console.log('Uploaded files')
            t.next()
            t.run(id)
        })
        t.task((ab, i) => {
            datas[i] = Buffer.from(ab)
            if (++count !== datas.length) return
            count = 0
            t.next()
            ipfs.addFiles(datas, paths, t)
        })
        for (i = 0; i < files.length; i++) {
            paths[i] = '/' + files[i].name
            readFileAs(files[i], 'arraybuffer', t, i)
        }
    }

    const fingerprint = (file: File, t: Object, id?: number|string) => {
        const type = file.type.split('/')[0]
        if (type !== 'audio') {
            return t.error('expected audio, got ' + type)
        }
        t.task(() => {
          t.next()
          t.run(fp, id)
        })
        t.task(ab => {
            const body = Buffer.from(ab).toString('binary')
            request(
                serverAddr + '/fingerprint', {
                    body,
                    method: 'POST'
                },
                (err, data, res) => {
                    if (err) return t.error(err)
                    if (res.statusCode !== 200) {
                        return t.error(data)
                    }
                    t.next()
                    fp.calc(data, t)
                }
            )
        })
        return readFileAs(file, 'arraybuffer', t)
    }

    const encrypt = (password: string, t: Object, id?: number|string) => {
        const datas = new Array(files.length)
        let count = 0
        t.task(() => {
          if (++count !== datas.length) return
          t.next()
          t.run(id)
        })
        t.task((ab, i) => {
          datas[i] = Buffer.from(ab)
          if (++count !== datas.length) return
          count = 0, keys = {}
          t.next()
          datas.forEach((data, i) => {
            bcrypt.genSalt(10, (err, salt) => {
              if (err) return t.error(err)
              bcrypt.hash(password, salt, (err, hash) => {
                if (err) return t.error(err)
                try {
                  keys[files[i].name] = Buffer.concat([
                      Buffer.from(hash.substr(-31), 'base64'),
                      crypto.randomBytes(9)
                  ]).slice(0, 32)
                  data = new aes.ModeOfOperation.ctr(keys[files[i].name]).encrypt(data)
                  files[i] = new File([data], files[i].name, { type: files[i].type })
                  keys[files[i].name] = keys[files[i].name].toString('hex')
                  t.run()
                } catch(err) {
                  t.error(err)
                }
              })
            })
          })
        })
        files.forEach((file, i) => {
          readFileAs(file, 'arraybuffer', t, i)
        })
    }

    const generateIPLD = (t: Object, id?: number|string) => {
        if (!meta || !meta.length) return t.error('no metadata')
        const hashes = []
        let count = 0, i;
        t.task(hash => {
            if (i === meta.length) {
              t.next()
              console.log('Generated IPLD')
              return t.run(id)
            }
            if (isString(hash)) {
                metaHashes[meta[i++].name] = hash
                return t.run()
            }
            if (meta[i]['#']) {
                metaHashes[meta[i].name] = meta[i++]['#']
                return t.run()
            }
            meta[i] = order(transform(meta[i], val => {
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
            names.push(meta[i].name)
            meta[i].name = meta[i].name.match(/^(.+?)(?:\s*?\(.*?\))?$/)[1]
            ipld.push(meta[i])
            ipfs.hashObject(meta[i], t)
        })
        t.task(() => {
          t.next();
          i = 0, ipld = [], metaHashes = {}, names = []
          orderMetadata(t)
        })
        for (i = 0; i < meta.length; i++) {
            if (meta[i].type === 'Hash' && isString(meta[i]['#'])) {
                hashes.push(meta.splice(i, 1)[0]['#'])
            }
        }
        if (!hashes.length) return t.run()
        t.task((obj, i) => {
            meta.push({
                '#': hashes[i],
                name: obj.name,
                type: obj.type
            })
            if (++count !== hashes.length) return
            t.next()
            t.run()
        })
        for (i = 0; i < hashes.length; i++) {
            ipfs.get(hashes[i], t, i)
        }
    }

    const getContent = (query: string, key: string, t: Object, id?: number|string) => {
        t.task(data => {
            if (key) {
              try {
                data = new aes.ModeOfOperation.ctr(Buffer.from(key, 'hex')).decrypt(data)
              } catch(err) {
                t.error(err)
              }
            }
            t.next()
            bufferToFile(data, query, t, id)
        })
        ipfs.getFile(query, t)
    }

    const importContent = (_files: File[], password: string, t: Object, id?: number|string) => {
        if (!_files || !_files.length) {
            return t.error('no files')
        }
        files = _files
        const datas = new Array(files.length)
        let count = 0
        t.task((hash, i) => {
            fileHashes[files[i].name] = hash
            meta.push({
                contentUrl: ipfs.contentUrl(hash, files[i].name),
                name: files[i].name,
                type: capitalize(files[i].type.split('/')[0]) + 'Object'
            })
            if (++count !== files.length) return
            console.log('Imported content')
            t.next()
            t.run(id)
        })
        t.task((ab, i) => {
            datas[i] = Buffer.from(ab)
            if (++count !== datas.length) return
            count = 0, fileHashes = {}, meta = meta || []
            t.next()
            for (i = 0; i < datas.length; i++) {
                ipfs.hashFile(datas[i], t, i)
            }
        })
        t.task(() => {
            t.next()
            for (let i = 0; i < files.length; i++) {
                readFileAs(files[i], 'arraybuffer', t, i)
            }
        })
        if (!password) return t.run()
        encrypt(password, t)
    }

    const importMetadata = (files: File[], t: Object, id?: number|string) => {
        if (!files || !files.length) return t.error('no files')
        const type = files[0].type
        if (type !== 'application/json' && type !== 'text/csv') {
            return t.error(`expected "application/json" or "text/csv", got "${type}"`)
        }
        const names = new Array(files.length)
        const texts = new Array(files.length)
        let count = 0
        t.task((text, i) => {
            texts[i] = text
            if (++count !== texts.length) return
            if (type === 'application/json') {
                meta.push(...parseJSONs(texts, names))
            }
            if (type === 'text/csv') {
                meta.push(...parseCSVs(texts, names))
            }
            console.log('Imported metadata')
            t.next()
            t.run(id)
        })
        meta = meta || []
        names[0] = files[0].name.split('.')[0]
        readFileAs(files[0], 'text', t, 0)
        for (let i = 1; i < files.length; i++) {
            if (files[i].type !== type) {
                return t.error(`expected type=${type}, got ` + files[i].type)
            }
            names[i] = files[i].name.split('.')[0]
            readFileAs(files[i], 'text', t, i)
        }
    }

    const upload = (t: Object, id?: number|string) => {
        t.task(() => {
            t.next()
            t.run(id)
        })
        if (files && files.length) {
            t.task(() => {
                t.next()
                uploadFiles(t)
            })
        }
        pushIPLD(t)
    }

    //-----------------------------------------------------------------------

    const t = new Tasks()

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

    this.importContent = (files: File[], cb: Function) => {
      // if (typeof password === 'function') {
      //  [cb, password] = [password, '']
      // } else if (!cb) {
      //  throw new Error('no callback')
      // }
      t.callback(cb)
      importContent(files, '', t)
    }

    this.importMetadata = (files: File[], cb: Function) => {
      t.callback(cb)
      importMetadata(files, t)
    }

    this.generateIPLD = (cb: Function) => {
      t.callback(cb)
      generateIPLD(t)
    }

    this.getContent = (query: string, cb: Function) => {
      // if (typeof key === 'function') {
      //  [cb, key] = [key, '']
      // } else if (!cb) {
      //  throw new Error('no callback')
      // }
      t.callback(cb)
      getContent(query, '', t)
    }

    this.getMetadata = (queries: string[], expand: boolean, cb: Function) => {
      t.callback(cb)
      ipfs.get(queries, expand, t)
    }

    this.start = (cb: Function) => {
      t.callback(cb)
      ipfs.start(repoPath, t)
    }

    this.stop = (cb: Function) => {
      t.callback(cb)
      ipfs.stop(t)
    }

    this.upload = (cb: Function) => {
      t.callback(cb)
      upload(t)
    }
}
