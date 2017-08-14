'use strict'

const {
  isArray,
  isMerkleLink,
  isObject,
  order,
  transform,
  traverse
} = require('../lib/util')

// @flow

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

module.exports = function (service: Object) {

  const get = (cid: Object, path: string, tasks: Object, t: number, i?: number) => {
    let t1, t2
    t1 = tasks.add(elem => {
      service.resolve(elem, path, tasks, t2)
    })
    t2 = tasks.add((val, remPath) => {
      path = remPath
      if (!path || path === '/' && (val && !val['/'])) {
        return tasks.run(t, val, i)
      }
      if (val) {
        try {
          val = service.pathToCID(val['/'])
        } catch(err) {
          tasks.error(err)
        }
        cid = val.cid
        if (val.remPath) {
          path = val.remPath + '/' + path
        }
      }
      service.get(cid, tasks, t1)
    })
    service.get(cid, tasks, t1)
  }

  this.get = (cid: Object, path: string, tasks: Object, t: number, i?: number) => {
    const t1 = tasks.add(val => {
      service.toElement(val, path, tasks, t, i)
    })
    get(cid, path, tasks, t1)
  }

  this.expand = (elem: Object, tasks: Object, t: number, i?: number) => {
    const expanded = order(elem)
    const trails = []
    const vals = []
    let t1
    if (isMerkleLink(elem)) {
      try {
        const { cid, remPath } = service.pathToCID(elem['/'])
        t1 = tasks.add(result => {
          this.expand(result, tasks, t, i)
        })
        return get(cid, remPath, tasks, t1)
      } catch (err) {
        tasks.error(err)
      }
    }
    traverse(elem, (trail, val) => {
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
    let count = 0, inner, keys, lastKey, t2, x
    t1 = tasks.add((val, j) => {
        this.expand(val, tasks, t2, j)
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
        get(vals[j].cid, vals[j].remPath, tasks, t1, j)
    }
  }
}
