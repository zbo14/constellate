'use strict'

const Block = require('ipfs-block')
const CID = require('cids')

const {
    isArray,
    isMerkleLink,
    isObject,
    order,
    traverse
} = require('../lib/util.js')

//      

/**
 * @module constellate/src/resolver
 */

module.exports = function(blockService) {

    const mods = {}

    this.addSupport = (mod) => {
        if (!mod.codec) {
            throw new Error('could not get codec');
        }
        if (mods[mod.codec]) {
            throw new Error(mod.codec + ' already supported')
        }
        mods[mod.codec] = mod
    }

    this.removeSupport = (codec) => {
        delete mods[codec]
    }

    const resolvePath = (block, cid, path, tasks, t, i) => {
        let t1, t2
        t1 = tasks.add(() => {
            mods[cid.codec].resolve(block, path, tasks, t2)
        })
        t2 = tasks.add((val, remPath) => {
            if (!(path = remPath) || path === '/' && (val && !val['/'])) {
                return tasks.run(t, val, i)
            }
            if (val) cid = new CID(val['/'])
            blockService.get(cid, (err, _block) => {
                if (err) return tasks.error(err)
                block = _block
                tasks.run(t1)
            })
        })
        tasks.run(t1)
    }

    this.get = (cid, path, tasks, t, i) => {
        if (!mods[cid.codec]) {
            return tasks.error(cid.codec + ' not supported')
        }
        const t1 = tasks.add(block => {
            if (!path) {
                mods[cid.codec].deserialize(block.data, tasks, t, i)
            } else {
                resolvePath(block, cid, path, tasks, t, i)
            }
        })
        blockService.get(cid, (err, block) => {
            if (err) return tasks.error(err)
            tasks.run(t1, block)
        })
    }

    this.put = (node, codec, tasks, t, i) => {
        if (!mods[codec]) {
            return tasks.error(codec + ' not supported')
        }
        let cid, t1, t2
        t1 = tasks.add(_cid => {
            cid = _cid
            mods[codec].serialize(node, tasks, t2)
        })
        t2 = tasks.add(data => {
            blockService.put(new Block(Buffer.from(data.buffer), cid), err => {
                if (err) return tasks.error(err)
                tasks.run(t, cid, i)
            })
        })
        mods[codec].cid(node, tasks, t1)
    }

    this.expand = (node, tasks, t, i) => {
        const expanded = order(node)
        const trails = []
        const vals = []
        let cid, parts
        traverse(node, (trail, val) => {
            if (!isMerkleLink(val)) return
            try {
                cid = new CID(val['/'])
            } catch (err) {
                return
            }
            trails.push(trail)
            vals.push(cid)
        })
        if (!vals.length) {
            return tasks.run(t, expanded, i)
        }
        let count = 0,
            inner, keys, lastKey, t1, t2, x
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
            this.get(vals[j], '', tasks, t1, j)
        }
    }
}