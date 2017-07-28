'use strict'

const Block = require('ipfs-block')
const CID = require('cids')

const {
  isArray,
  isMerkleLink,
  isObject,
  order,
  transform,
  traverse
} = require('../lib/util.js')

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

  this.get = (cid: Object, path: string, tasks: Object, t: number, i?: number) => {
    let t1, t2
    t1 = tasks.add(node => {
      service.resolve(node, path, tasks, t2)
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
          path = val.remPath
        }
      }
      service.get(cid, tasks, t1)
    })
    service.get(cid, tasks, t1)
  }

  this.expand = (node: Object, tasks: Object, t: number, i?: number) => {
    const expanded = order(node)
    const trails = []
    const vals = []
    let parts
    traverse(node, (trail, val) => {
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
    let count = 0, inner, keys, lastKey, t1, t2, x
    t1 = tasks.add((val, j) => {
      vals[j] = val
      if (++count !== vals.length) return
      count = 0
      for (j = 0; j < vals.length; j++) {
        this.expand(vals[j], tasks, t2, j)
      }
    })
    t2 = tasks.add((val, j) => {
      vals[j] = val
      if (++count !== vals.length) return
      for (j = 0; j < vals.length; j++) {
        keys = trails[j].split('.')
        lastKey = keys.pop()
        inner = keys.reduce((result, key) => {
            return result[key]
        }, expanded)
        x = inner[lastKey]
        if ((isObject(x) && !x['/']) || (isArray(x) && !x[0]['/'])) {
            inner[lastKey] = [].concat(x, vals[j])
        } else {
            inner[lastKey] = vals[j]
        }
      }
      tasks.run(t, expanded, i)
    })
    for (let j = 0; j < vals.length; j++) {
      this.get(vals[j].cid, vals[j].remPath, tasks, t1, j)
    }
  }
}
