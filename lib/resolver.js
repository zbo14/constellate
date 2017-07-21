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

    const resolvePath = (block, cid, path, t, id) => {
        t.task((val, remPath) => {
            if (!(path = remPath) || path === '/' && (val && !val['/'])) {
                t.next()
                return t.run(val, id)
            }
            if (val) cid = new CID(val['/'])
            blockService.get(cid, (err, _block) => {
                if (err) return t.error(err)
                block = _block
                t.move(-1)
                t.run()
            })
        })
        t.task(() => {
            t.next()
            mods[cid.codec].resolve(block, path, t)
        })
        t.run()
    }

    this.get = (cids, paths, t, id) => {
        const results = new Array(cids.length)
        let count = 0
        t.task((val, i) => {
            results[i] = val // { val, remPath }
            if (++count !== results.length) return
            t.next()
            t.run(results, id)
        })
        t.task((block, i) => {
            results[i] = block
            if (++count !== cids.length) return
            count = 0
            t.next()
            for (i = 0; i < cids.length; i++) {
                if (!paths[i]) {
                    mods[cids[i].codec].deserialize(results[i].data, t, i)
                } else {
                    resolvePath(results[i], cids[i], paths[i], t, i)
                }
            }
        })
        cids.forEach((cid, i) => {
            if (!mods[cid.codec]) {
                return t.error(cid.codec + ' not supported')
            }
            blockService.get(cid, (err, block) => {
                if (err) return t.error(err)
                t.run(block, i)
            })
        })
    }

    this.put = (nodes, codecs, t, id) => {
        // hashAlg = hashAlg | 'sha2-256'
        const cids = new Array(nodes.length)
        let count = 0
        t.task((data, i) => {
            blockService.put(new Block(Buffer.from(data.buffer), cids[i]), err => {
                if (err) return t.error(err)
                if (++count !== nodes.length) return
                t.next()
                t.run(cids, id)
            })
        })
        t.task((cid, i) => {
            cids[i] = cid
            if (++count !== nodes.length) return
            count = 0
            t.next()
            for (i = 0; i < nodes.length; i++) {
                mods[codecs[i]].serialize(nodes[i], t, i)
            }
        })
        for (let i = 0; i < nodes.length; i++) {
            if (!mods[codecs[i]]) {
                return t.error(codecs[i] + ' not supported')
            }
            mods[codecs[i]].cid(nodes[i], t, i)
        }
    }

    this.expand = (node, t, id) => {
        const expanded = order(node)
        const trails = []
        const vals = []
        let cid, count = 0,
            i, inner, keys, lastKey, parts, x
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
            return t.run(expanded, id)
        }
        t.task((obj, i) => {
            vals[i] = obj
            if (++count !== vals.length) return
            count = 0
            for (i = 0; i < vals.length; i++) {
                keys = trails[i].split('.')
                lastKey = keys.pop()
                inner = keys.reduce((result, key) => {
                    return result[key]
                }, expanded)
                x = inner[lastKey]
                if ((isObject(x) && !x['/']) || (isArray(x) && !x[0]['/'])) {
                    inner[lastKey] = [].concat(x, vals[i])
                } else {
                    inner[lastKey] = vals[i]
                }
            }
            t.next()
            t.run(expanded, id)
        })
        t.task(results => {
            t.next()
            for (i = 0; i < results.length; i++) {
                this.expand(results[i], t, i)
            }
        })
        this.get(vals, [], t, i)
    }
}

/*

this.compact = (node: Object, t: Object, id?: number|string) => {
    const trails = []
    const vals = []
    let count = 0, compacted = order(node), i, inner, keys, lastKey, x
    t.task(cid => {
        t.run({ cid, compacted }, id)
    })
    traverse(node, (trail, val) => {
        if (!isObject(val) || val['/']) return
        if (trails.some(tr => trail !== tr && trail.includes(tr))) return
        trails.push(trail)
        vals.push(val)
    })
    if (!vals.length) {
        return this.cid(compacted, t);
    }
    t.task((obj, i) => {
        vals[i] = obj
        if (++count !== vals.length) return
        count = 0
        for (i = 0; i < vals.length; i++) {
            keys = vals[i].path.split('.')
            lastKey = keys.pop()
            inner = keys.reduce((result, key) => {
                return result[key]
            }, compacted)
            x = inner[lastKey]
            if ((isObject(x) && x['/']) || (isArray(x) && x[0]['/'])) {
                inner[lastKey] = [].concat(x, {
                    '/': vals[i].cid.toBaseEncodedString()
                })
            } else {
                inner[lastKey] = {
                    '/': vals[i].cid.toBaseEncodedString()
                }
            }
        }
        compacted = order(compacted)
        t.next()
        this.cid(compacted, t)
    })
    for (i = 0; i < vals.length; i++) {
        this.compact(vals[i], t, i)
    }
}

*/
