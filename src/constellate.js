'use strict'

const aes = require('aes-js')
// const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const pbkdf2 = require('pbkdf2')
const request = require('xhr-request')

const BigchainDB = require('../lib/bigchaindb')
const Fingerprint = require('../lib/fingerprint')
const Ipfs = require('../lib/ipfs')
const Resolver = require('../lib/resolver')
const Services = require('../lib/services')
const Swarm = require('../lib/swarm')

const {
    Tasks,
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
} = require('../lib/util')

// @flow

/**
 * @module constellate/src/constellate
 */

const parseCSVs = (csvs: string[], types: string[], tasks: Object, t: number, i?: number) => {
     if (csvs.length !== types.length) {
         return tasks.error('different number of csvs and types')
     }
     let a, b, key, keys, length = 0, obj, val
     const combined = csvs.reduce((result, csv, idx) => {
         obj = parseCSV(csv, types[idx])
         keys = Object.keys(obj)
         for (a = 0; a < keys.length; a++) {
             key = keys[a]
             if (!result[key]) {
                 result[key] = newArray(null, length)
             }
             result[key] = result[key].concat(obj[key])
         }
         length += obj[key].length
         return result
     }, {})
     const objs = new Array(combined['name'].length)
     keys = Object.keys(combined)
     for (a = 0; a < objs.length; a++) {
         obj = {}
         for (b = 0; b < keys.length; b++) {
             key = keys[b]
             val = combined[key][a]
             if (val) {
               obj[key] = val
             }
         }
         objs[a] = obj
     }
     tasks.run(t, objs, i)
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
     data.type = newArray(type, lines.length-1)
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
     let arr, j
     return jsons.reduce((result, json, idx) => {
         if (!isArray(arr = JSON.parse(json), isObject)) {
             return tasks.error('expected array of objects')
         }
         for (j = 0; j < arr.length; j++) {
             arr[j].type = types[idx]
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

const readFilesAs = (_files: File[], readAs: string, tasks: Object, t: number, i?: number) => {
   const files = new Array(_files.length)
   let count = 0
   const t1 = tasks.add((result, j) => {
     files[j].content = isString(result) ? result : Buffer.from(result)
     if (++count !== files.length) return
     tasks.run(t, files, j)
   })
   for (let j = 0; j < _files.length; j++) {
     files[j] = {
       name: _files[j].name,
       path: '',
       type: _files[j].type
     }
     readFileAs(_files[j], readAs, tasks, t1, j)
   }
}

const saltLength = 20
const iters = 100000
const digest = 'sha256'
const keyLength = 32

const hashPassword2x = (password: string, salt: Buffer, tasks: Object, t: number, i?: number) => {
  crypto.pbkdf2(password, salt, iters, keyLength, digest, (err, hash1) => {
    if (err) {
      return tasks.error(err)
    }
    crypto.pbkdf2(hash1, salt, iters, keyLength, digest, (err, hash2) => {
      if (err) {
        return tasks.error(err)
      }
      tasks.run(t, hash1, hash2, i)
    })
  })
}

const defaultPath = '/tmp/constellate'

const Constellate = {}

module.exports = function () {

    // const fp = new Fingerprint()

    const services = new Services()

    let decryption, fileHashes, files, ipld, meta, metaHashes, names

    //-----------------------------------------------------------------------

    const importDecryption = (text: string, tasks: Object, t: number, i?: number) => {
      let dec = {}
      try {
        dec = JSON.parse(text)
      } catch(err) {
        tasks.error(err)
      }
      if (!dec.keys) {
        return tasks.error('no decryption keys')
      }
      if (!dec.password) {
        return tasks.error('no decryption password')
      }
      if (!dec.salt) {
        return tasks.error('no decryption salt')
      }
      decryption = dec
      tasks.run(t, i)
    }

    const importProject = (project: Object, tasks: Object, t: number, i?: number) => {
        if (!project.title) {
            return tasks.error('no project title')
        }
        if (!project.sheets || !project.sheets.length) {
            return tasks.error('no sheets in project')
        }
        meta = meta || []
        let c, r, objs, sheet, val
        for (let s = 0; s < project.sheets.length; s++) {
            sheet = project.sheets[s]
            if (!sheet.subject) {
                return tasks.error('no sheet subject')
            }
            if (!sheet.cols || !sheet.cols.length) {
                return tasks.error('no columns in sheet')
            }
            if (!sheet.rows || !sheet.rows.length) {
                return tasks.error('no rows in sheet')
            }
            objs = (Array : any).apply(null, { length: sheet.rows.length }).map(() => {
              return { type: sheet.subject }
            })
            for (c = 0; c < sheet.cols.length; c++) {
                if (!sheet.cols[c]) {
                    return tasks.error('empty column in sheet')
                }
                for (r = 0; r < sheet.rows.length; r++) {
                    val = sheet.rows[r][c]
                    if (val) {
                        val = val.split(/,\s*/)
                        if (val.length === 1) {
                          val = val[0]
                        }
                        objs[r][sheet.cols[c]] = val
                    }
                }
            }
            meta.push(...objs)
        }
        tasks.run(t, i)
    }

    const orderMetadata = (tasks: Object, t: number, i?: number) => {
        const ordered = []
        let next, obj, queue = [], stop = false
        while (meta.length) {
            if (next) {
                const idx = meta.findIndex(obj => obj.name === next)
                if (idx < 0) {
                  return tasks.error(`could not find "${next}"`)
                }
                obj = meta.splice(idx, 1)[0]
            } else {
                obj = meta.shift()
            }
            if (obj.type === 'Hash') {
              continue
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
                    val = val.slice(1)
                    if (!next && ordered.every(obj => obj.name !== val)) {
                        if (queue.includes(val)) {
                            stop = true
                            return tasks.error(`circular reference between "${val}" and "${obj.name}"`)
                        }
                        meta.push(obj)
                        next = val
                        queue.push(obj.name)
                    }
                }
            })
            if (stop) return
            if (next) continue
            ordered.push(obj)
            queue = []
        }
        meta = ordered
        tasks.run(t, i)
    }

    const pushIPLD = (service: Object, tasks: Object, t: number, i?: number) => {
        if (!ipld || !ipld.length) {
            return tasks.error('no ipld')
        }
        let count = 0, hash
        const t1 = tasks.add((cid, j) => {
            hash = cid.toBaseEncodedString()
            if (hash !== metaHashes[names[j]]) {
                return tasks.error(`expected hash=${metaHashes[names[j]]}, got ` + hash)
            }
            if (++count !== ipld.length) return
            tasks.run(t, i)
        })
        for (let j = 0; j < ipld.length; j++) {
          service.put({
            data: ipld[j]
            // issuer
            // owner
          }, tasks, t1, j)
        }
    }

    const uploadContent = (service: Object, tasks: Object, t: number, i?: number) => {
        if (!files || !files.length) {
            return tasks.error('no content')
        }
        // const paths = new Array(files.length)
        let count = 0
        const t1 = tasks.add((hash, j) => {
            if (hash !== fileHashes[files[j].name]) {
              return tasks.error(`expected hash=${fileHashes[files[j].name]}, got ` + hash)
            }
            if (++count !== files.length) return
            tasks.run(t, i)
        })
        for (let j = 0; j < files.length; j++) {
            // paths[j] = '/' + files[j].name
            service.put(files[j], tasks, t1, j)
        }
    }

    /*

    const fingerprint = (file: Object, tasks: Object, t: number, i?: number) => {
        const t1 = tasks.add(() => {
          tasks.run(t, fp, i)
        })
        const body = file.content.toString('binary')
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
    }

    */

    const encrypt = (password: string, tasks: Object, t: number, i?: number) => {
      if (!files || !files.length) {
        return tasks.error('no content')
      }
      const salt = crypto.randomBytes(saltLength)
      const t1 = tasks.add((hash1, hash2) => {
        decryption = {}
        decryption.keys = {}
        decryption.hash2 = hash2.toString('hex')
        decryption.salt = salt.toString('hex')
        let aesCtr, key
        for (let j = 0; j < files.length; j++) {
          key = crypto.randomBytes(keyLength)
          aesCtr = new aes.ModeOfOperation.ctr(key)
          console.log(files[j].content.lenth)
          files[j].content = Buffer.from(aesCtr.encrypt(files[j].content).buffer)
          aesCtr = new aes.ModeOfOperation.ctr(hash1)
          key = Buffer.from(aesCtr.encrypt(key).buffer)
          decryption.keys[files[j].name] = key.toString('hex')
        }
        tasks.run(t, i)
      })
      hashPassword2x(password, salt, tasks, t1)
    }

    /*

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
          readFileAs(files[j], 'arraybuffer', tasks, t1, j)
        }
    }

    */

    const generateIPLD = (service: Object, tasks: Object, t: number, i?: number) => {
      if (!meta || !meta.length) {
        return tasks.error('no metadata')
      }
      const hashes = []
      const resolver = new Resolver(service)
      let j, t2, t3;
      ipld = [], metaHashes = {}, names = []
      t2 = tasks.add(() => {
        j = 0
        orderMetadata(tasks, t3)
      })
      t3 = tasks.add(hash => {
        if (j === meta.length) {
          return tasks.run(t, i)
        }
        if (isString(hash)) {
          metaHashes[meta[j++].name] = hash
          return tasks.run(t3)
        }
        if (meta[j]['#']) {
          metaHashes[meta[j].name] = meta[j++]['#']
          return tasks.run(t3)
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
        service.hash({ data: meta[j] }, tasks, t3)
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
      const t1 = tasks.add((node, j) => {
        node['#'] = hashes[j]
        meta.push(node)
        if (++count !== hashes.length) return
        tasks.run(t2)
      })
      let val
      for (j = 0; j < hashes.length; j++) {
        try {
          val = service.pathToCID(hashes[j])
          resolver.get(val.cid, val.remPath, tasks, t1, j)
        } catch(err) {
          tasks.error(err)
        }
      }
    }

    const getContent = (service: Object, path: string, decrypt: Object, tasks: Object, t: number, i?: number) => {
      let t1 = t, t2
      if (decrypt && decrypt.name && decrypt.password) {
        t1 = tasks.add(node => {
          let key = decryption.keys[decrypt.name]
          if (!key) {
            return tasks.error('no decryption key associated with name: ' + decrypt.name)
          }
          const salt = Buffer.from(decryption.salt, 'hex')
          hashPassword2x(decrypt.password, salt, tasks, t2)
        })
        t2 = tasks.add((hash1, hash2) => {
          if (decryption.hash2 !== hash2.toString('hex')) {
            return tasks.error('hash of password hash does not equal decryption hash2')
          }
          try {
            let aesCtr = new aes.ModeOfOperation.ctr(hash1)
            key = Buffer.from(aesCtr.decrypt(Buffer.from(key, 'hex')).buffer)
            aesCtr = new aes.ModeOfOperation.ctr(key)
            node.content = Buffer.from(aesCtr.decrypt(node.content).buffer)
            console.log(node.content.length)
            tasks.run(t, node, i)
          } catch(err) {
            tasks.error(err)
          }
        })
      }
      service.get(path, tasks, t1, i)
    }

    const importContent = (service: Object, _files: Object[], password: string, tasks: Object, t: number, i?: number) => {
      fileHashes = {}, files = _files, meta = meta || []
      let count = 0, t2
      const t1 = tasks.add(() => {
        for (let j = 0; j < files.length; j++) {
          service.hash(files[j], tasks, t2, j)
        }
      })
      t2 = tasks.add((hash, j) => {
        fileHashes[files[j].name] = hash
        meta.push({
            contentUrl: service.pathToIRI(hash),
            name: files[j].name,
            type: capitalize(files[j].type.split('/')[0]) + 'Object'
        })
        if (++count !== files.length) return
        tasks.run(t, i)
      })
      if (password) {
        return encrypt(password, tasks, t1)
      }
      tasks.run(t1)
    }

    const importMetadata = (files: Object[], tasks: Object, t: number, i?: number) => {
        meta = meta || []
        const t1 = tasks.add(objs => {
          meta.push(...objs)
          tasks.run(t, i)
        })
        const type = files[0].type
        if (type !== 'application/json' && type !== 'text/csv') {
          return tasks.error('expected "application/json" or "text/csv", got ' + type)
        }
        const texts = new Array(files.length)
        const names = new Array(files.length)
        texts[0] = files[0].content
        names[0] = files[0].name
        for (let j = 1; j < files.length; j++) {
          if (files[j].type !== type) {
            return tasks.error(`expected ${type}, got ` + files[j].type)
          }
          texts[j] = files[j].content
          names[j] = files[j].name
        }
        if (type === 'application/json') {
          parseJSONs(texts, names, tasks, t1)
        }
        if (type === 'text/csv') {
          parseCSVs(texts, names, tasks, t1)
        }
    }

    //-----------------------------------------------------------------------

    const tasks = new Tasks()

    this.clearFileHashes = () => {
      fileHashes = undefined
    }

    this.clearMetaHashes = () => {
      metaHashes = undefined
    }

    this.clearMetadata = () => {
      meta = undefined // ipld = undefined
    }

    this.exportDecryption = (): ?Object => {
      return decryption ? decryption : null
    }

    this.exportFileHashes = (): ?Object => {
      return fileHashes ? fileHashes : null
    }

    this.exportIPLD = (): ?Object[] => {
      return ipld ? ipld : null
    }

    this.exportMetaHashes = (): ?Object => {
      return metaHashes ? metaHashes : null
    }

    // this.exportMetadata = (): ?Object[] => {
    //    return meta ? meta : null
    // }

    // this.exportFiles = (): ?File[] => {
    //    return files ? files : null
    // }

    this.importContent = (name: string, files: Object[], password: string, cb: Function) => {
      if (typeof password === 'function') {
        [cb, password] = [password, '']
      } else if (!cb) {
        throw new Error('no callback')
      }
      tasks.init(cb)
      tasks.add(service => {
        importContent(service, files, password, tasks, -1)
      })
      services.use(name, tasks, 0)
    }

    this.importDecryption = (text: string, cb: Function) => {
      tasks.init(cb)
      importDecryption(text, tasks, -1)
    }

    this.importKeypair = (keypair: Object)

    this.importMetadata = (files: Object[], cb: Function) => {
      tasks.init(cb)
      importMetadata(files, tasks, -1)
    }

    this.importProject = (project: Object, cb: Function) => {
      tasks.init(cb)
      importProject(project, tasks, -1)
    }

    this.generateIPLD = (name: string, cb: Function) => {
      tasks.init(cb)
      tasks.add(service => {
        generateIPLD(service, tasks, -1)
      })
      services.use(name, tasks, 0)
    }

    this.getContent = (service: string, path: string, decrypt: Object, cb: Function) => {
      if (typeof decrypt === 'function') {
        [cb, decrypt] = [decrypt, {}]
      } else if (!cb) {
        throw new Error('no callback')
      }
      tasks.init(cb)
      tasks.add(service => {
        getContent(service, path, decrypt, tasks, -1)
      })
      services.use(service, tasks, 0)
    }

    this.getMetadata = (name: string, path: string, expand: boolean, cb: Function) => {
      tasks.init(cb)
      let resolver
      tasks.add(service => {
        try {
          const { cid, remPath } = service.pathToCID(path)
          resolver = new Resolver(service)
          resolver.get(cid, remPath, tasks, 1)
        } catch(err) {
          tasks.error(err)
        }
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

    this.IPFS = (repoPath: string, cb: Function) => {
      if (typeof repoPath === 'function') {
        [cb, repoPath] = [repoPath, defaultPath]
      }
      tasks.init(cb)
      let count = 0, t1, t2
      t1 = tasks.add(ipfs => {
        try {
          const contentService = new Ipfs.ContentService(ipfs.files)
          const metadataService = new Ipfs.MetadataService(ipfs._blockService)
          services.add(contentService, tasks, t2)
          services.add(metadataService, tasks, t2)
        } catch(err) {
          tasks.error(err)
        }
      })
      t2 = tasks.add(() => {
        if (++count === 2) {
          tasks.run(-1)
        }
      })
      const ipfs = new Ipfs.Node()
      ipfs.start(repoPath, tasks, t1)
    }

    this.Swarm = (url: string, cb: Function) => {
      tasks.init(cb)
      const service = new Swarm.ContentService(url)
      services.add(service, tasks, -1)
    }

    this.pushIPLD = (name: string, cb: Function) => {
      tasks.init(cb)
      tasks.add(service => {
        pushIPLD(service, tasks, -1)
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

    //-----------------------------------------------------------------------

    this.Browser = {}

    this.Browser.getContent = (service: string, path: string, decrypt: Object, cb: Function) => {
      if (typeof decrypt === 'function') {
        [cb, decrypt] = [decrypt, {}]
      } else if (!cb) {
        throw new Error('no callback')
      }
      tasks.init(cb)
      tasks.add(service => {
        getContent(service, path, decrypt, tasks, 1)
      })
      tasks.add(node => {
        bufferToFile(node.content, node.path, tasks, -1)
      })
      services.use(service, tasks, 0)
    }

    this.Browser.importContent = (name: string, files: File[], password: string, cb: Function) => {
      if (typeof password === 'function') {
        [cb, password] = [password, '']
      } else if (!cb) {
        throw new Error('no callback')
      }
      tasks.init(cb)
      let service
      tasks.add(result => {
        service = result
        readFilesAs(files, 'arraybuffer', tasks, 1)
      })
      tasks.add(files => {
        importContent(service, files, password, tasks, -1)
      })
      services.use(name, tasks, 0)
    }

    this.Browser.importDecryption = (file: File, cb: Function) => {
      tasks.init(cb)
      tasks.add(text => {
        importDecryption(text, tasks, -1)
      })
      readFileAs(file, 'text', tasks, 0)
    }

    this.Browser.importMetadata = (files: File[], cb: Function) => {
      tasks.init(cb)
      tasks.add(files => {
        importMetadata(files, tasks, -1)
      })
      readFilesAs(files, 'text', tasks, 0)
    }
}
