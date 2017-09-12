'use strict'

const {
    Tasks,
    errPathNotFound,
    isArray,
    isMerkleLink,
    isObject,
    order,
    traverse
} = require('../lib/util')

//      

/**
 * @module constellate/src/resolver
 */

/*

  The following code is adapted from https://github.com/ipld/js-ipld-resolver/blob/master/src/index.js

  --------------------------------- LICENSE ---------------------------------

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

const _get = (service, cid, path, id, tasks, t, i) => {
    let p = path,
        t1, t2
    t1 = tasks.add(elem => {
        service._resolve(elem, p, tasks, t2)
    })
    t2 = tasks.add((val, remPath) => {
        if (!remPath || remPath === '/' && (val && !val['/'])) {
            if (id) {
                val[id] = service.hashFromCID(cid) + '/' + path
            }
            return tasks.run(t, val, i)
        }
        if (val) {
            try {
                val = service.pathToCID(val['/'])
            } catch (err) {
                // tasks.error(err)
                tasks.error(errPathNotFound(path))
            }
            cid = val.cid
            if (val.remPath) {
                p = val.remPath + '/' + remPath
            }
        }
        service._get(cid, tasks, t1)
    })
    service._get(cid, tasks, t1)
}

function Resolver(service) {
    this._service = service
}

Resolver.prototype.get = function(cid, path, expand, id, cb) {
    const tasks = new Tasks(cb)
    this._get(cid, path, expand, id, tasks, -1)
}

Resolver.prototype._expand = function(obj, id, tasks, t, i) {
    const expanded = order(obj)
    const service = this._service
    const trails = []
    const vals = []
    let t1
    if (isMerkleLink(obj)) {
        try {
            const {
                cid,
                remPath
            } = service.pathToCID(obj['/'])
            t1 = tasks.add(result => {
                this._expand(result, id, tasks, t, i)
            })
            return _get(service, cid, remPath, id, tasks, t1)
        } catch (err) {
            tasks.error(err)
        }
    }
    traverse(obj, (trail, val) => {
        if (!isMerkleLink(val)) return
        try {
            val = service.pathToCID(val['/'])
        } catch (err) {
            return
        }
        trails.push(trail)
        vals.push(val)
    })
    if (!vals.length) {
        return tasks.run(t, expanded, i)
    }
    let count = 0,
        inner, keys, lastKey, t2, x
    t1 = tasks.add((val, j) => {
        this._expand(val, id, tasks, t2, j)
    })
    t2 = tasks.add((val, j) => {
        keys = trails[j].split('.').filter(Boolean)
        lastKey = keys.pop()
        if (!isNaN(Number(lastKey))) {
            lastKey = Number(lastKey)
        }
        try {
            inner = keys.reduce((result, key) => {
                if (!isNaN(Number(key))) {
                    key = Number(key)
                }
                return result[key]
            }, expanded)
        } catch (err) {
            tasks.error(err)
        }
        x = inner[lastKey]
        if ((isObject(x) && !x['/']) || (isArray(x) && !x[0]['/'])) {
            inner[lastKey] = [].concat(x, val)
        } else {
            inner[lastKey] = val
        }
        if (++count !== vals.length) return
        tasks.run(t, expanded, i)
    })
    for (let j = 0; j < vals.length; j++) {
        _get(service, vals[j].cid, vals[j].remPath, id, tasks, t1, j)
    }
}

Resolver.prototype._get = function(cid, path, expand, id, tasks, t, i) {
    const service = this._service
    let t1, t2
    t1 = tasks.add(val => {
        service._toElement(val, path, tasks, t, i)
    })
    if (expand) {
        t2 = t1
        t1 = tasks.add(val => {
            this._expand(val, id, tasks, t2)
        })
    }
    _get(service, cid, path, id, tasks, t1)
}

module.exports = Resolver