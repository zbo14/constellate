'use strict'

const errPathNotFound = require('./errors').errPathNotFound

const {
  order,
  traverse
} = require('./util')

/*

  The following code is adapted from https://github.com/ipfs/js-ipfs-api/tree/master/src/block

  ------------------------------- LICENSE -------------------------------

  The MIT License (MIT)

  Copyright (c) 2016 IPFS

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.

*/

function Resolver (service) {
  this.service = service
}

Resolver.prototype.expand = function (obj, id, cb, val = obj, keys = []) {
  if (keys.length) {
    const lastKey = keys[keys.length-1]
    const inner = keys.slice(0, -1).reduce((result, key) => {
      return result[key]
    }, obj)
    const x = inner[lastKey]
    if ((x.constructor === Object && !x['/']) || (x instanceof Array && !x[0]['/'])) {
      inner[lastKey] = [].concat(x, val)
    } else {
      inner[lastKey] = val
    }
  }
  if (val.constructor !== Object) {
    return cb(null, obj)
  }
  if (obj['/']) {
    const { cid, path } = this.service.pathToCID(obj['/'])
    return this.get(cid, path, id, (err, result) => {
      if (err) {
        return cb(err)
      }
      this.expand(result, id, (err, result) => {
        if (err) {
          return cb(err)
        }
        cb(null, result)
      })
    })
  }
  const queries = []
  traverse(val, (v, key) => {
    if (v.constructor === Object && v['/']) {
      const { cid, path } = this.service.pathToCID(v['/'])
      queries.push({ cid, path, key })
    }
  })
  if (!queries.length) {
    return cb(null, obj)
  }
  let count = 0
  for (let i = 0; i < queries.length; i++) {
    const { cid, path, key } = queries[i]
    this.get(cid, path, id, (err, result) => {
      if (err) {
        return cb(err)
      }
      this.expand(obj, id, (err, result) => {
        if (err) {
          return cb(err)
        }
        if (++count === queries.length) {
          cb(null, result)
        }
      }, result, keys.concat(key))
    })
  }
}

Resolver.prototype.get = function (cid, path, id, cb, p = path) { 
  this.service.get(cid, (err, obj) => {
    if (err) {
      return cb(err)
    }
    this.service.resolve(obj, p, (err, val, remPath) => {
      if (err) {
        return cb(err)
      }
      if (!remPath || remPath === '/' && (val && !val['/'])) {
        if (!id) {
          return cb(null, val)
        }
        return this.service.hashFromCID(cid, (err, hash) => {
          if (err) {
            return cb(err)
          }
          val[id] = hash
          if (path) {
            val[id] += '/' + path
          }
          cb(null, val)
        })
      }
      if (val) {
        try {
          val = this.service.pathToCID(val['/'])
        } catch (err) {
          cb(errPathNotFound(path))
        }
        cid = val.cid
        if (val.remPath) {
          p = val.remPath + '/' + remPath
        } else {
          p = remPath
        }
      }
      this.get(cid, path, id, cb, p)
    })
  })
}

module.exports = Resolver
