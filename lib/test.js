const driver = require('bigchaindb-driver')

for (let i = 0; i < 100; i++) {
  console.log(new driver.Ed25519Keypair())
}
/*
const newEd25519Condition = (publicKey: Buffer): Object => {
  const condition = cc.Ed25519Sha256()
  condition.setPublicKey(publicKey)
  return condition
}

const newSha256Condition = (preimage: string): Object => {
  const condition = new cc.PreimageSha256()
  condition.preimage = Buffer.from(preimage, 'utf8')
  return condition
}

const newThresholdCondition = (subconditions: Object[], threshold: number,): Object => {
  const condition = cc.ThresholdSha256()
  condition.threshold = threshold
  for (let i = 0; i < subconditions.length; i++) {
    condition.addSubfulfillment(subconditions[i])
  }
  return condition
}

const CONDITION = 'condition'
const FULFILLMENT = 'fulfillment'
const ED25519_SHA_256 = 'ed25519-sha-256'
const THRESOLD_SHA_256 = 'threshold-sha-256'
const VERSION = '1.0'

const fulfillmentFromObject = (obj: Object) : Object => {
  if (obj.hash) {
    const condition = new cc.Condition()
    condition.type = obj.type_id
    condition.bitmask = obj.bitmask
    condition.hash = base58.decode(obj.hash)
    condition.maxFulfillmentLength = parseInt(obj.max_fulfillment_length)
    return condition
  }
  let fulfillment = {}
  if (obj.type === ED25519_SHA_256) {
    fulfillment = new cc.Ed25519Sha256()
    fulfillment.publicKey = base58.decode(obj.public_key)
  }
  if (obj.type === THRESOLD_SHA_256) {
    fulfillment = new cc.ThresholdSha256()
    fulfillment.threshold = obj.threshold
    let subcondition
    for (let i = 0; i < obj.subconditions; i++) {
      subcondition = fulfillmentFromObject(obj.subconditions[i])
      if (subcondition.getConditionUri) {
        fulfillment.addSubfulfillment(subcondition)
      } else {
        fulfillment.addSubcondition(subcondition)
      }
    }
  }
  return fulfillment
}

const fulfillmentToObject = (fulfillment: Object): Object => {
  let uri
  if (fulfillment.getConditionUri) {
    uri = fulfillment.getConditionUri()
  } else {
    uri = fulfillment.serializeUri()
  }
  const details = {}
  const typeId = fulfillment.getTypeId()
  if (typeId === 0) {
    details.bitmask = 3
    details.type_id = typeId
    if (fulfillment.preimage) {
      details.preimage = fulfillment.preimage.toString()
      details.type =  FULFILLMENT
    }
  }
  if (typeId === 2) {
    details.subconditions = fulfillment.subconditions.map(subcondition => {
      return fulfillmentToObject(subcondition).details
    })
    details.threshold = fulfillment.threshold
    details.type = THRESOLD_SHA_256
  }
  if (typeId === 4) {
    if (fulfillment.publicKey) {
      details.public_key = base58.encode(fulfillment.publicKey)
    }
    details.type = ED25519_SHA_256
  }
  if (fulfillment.hash) {
    details.hash = base58.encode(fulfillment.hash)
    details.max_fulfillment_length = fulfillment.maxFulfillmentLength
    details.type = CONDITION
  }
  return { details, uri }
}

const getPublicKeys = (details: Object) => {
  if (details.type === ED25519_SHA_256) {
    return details.public_key
  }
  if (details.type === THRESOLD_SHA_256) {
    return details.subconditions.map(getPublicKeys)
  }
}

const newOutput = (_amount: number, condition: Object): Object  => {
  const amount = _amount.toString()
  condition = fulfillmentToObject(condition)
  let public_keys = getPublicKeys(condition.details)
  if (isArray(public_keys)) {
    public_keys = Array.from(new Set(public_keys))
  } else {
    public_keys = [public_keys]
  }
  return { amount, condition, public_keys }
}

const newInput = (issuers: Buffer[], fulfills: ?Object = null, fulfillment: ?string = null): Object => {
  const owners_before = issuers.map(base58.encode)
  return { fulfillment, fulfills, owners_before }
}


BigchainDB.PublicKey = {

  codec: PUBLIC_KEY,

  version,

  cid: (publicKey: string, tasks: Object, t: number, i?: number) => {
    try {
      const data = base58.decode(publicKey)
      const mh = multihash.encode(sha3_256(data), 'sha3-256')
      const cid = new CID(version, codec, mh)
      tasks.run(t, cid, i)
    } catch(err) {
      tasks.error(err)
    }
  }
}

BigchainDB.PublicKeyList = {

  codec: PUBLIC_KEY_LIST,

  version,

  cid: () => {},

  resolve: (publicKeys: string[], path: string, tasks: Object, t: number, i?: number) => {
    if (!path || path === '/') {
      return tasks.run(t, publicKeys, '', i)
    }
    try {
      const parts = path.split('/')
      const first = Number(parts.shift())
      const remPath = parts.join('/')
      tasks.run(t, publicKeys[first], i)
    } catch(err) {
      tasks.error(err)
    }
  }
}

BigchainDB.Details = {

  codec: DETAILS,

  version,

  cid: () => {},

  resolve: (details: Object, path: string, tasks: Object, t: number, i?: number) => {
    if (!path || path === '/') {
      return tasks.run(t, details, '', i)
    }
    const parts = path.split('/')
    const first = parts.shift()
    const remPath = parts.join('/')
    switch(first) {
      case 'public_key':
      case 'type':
        return tasks.run(t, details[first], i)
      default:
        tasks.error(`path="${path}" not found`)
    }
  }
}

BigchainDB.Fulfills = {

  codec: FULFILLS,

  version,

  cid: () => {},

  resolve: (fulfills: Object, path: string, tasks: Object, t: number, i?: number) => {
    if (!path || path === '/') {
      return tasks.run(t, fulfills, '', i)
    }
    const parts = path.split('/')
    const first = parts.shift()
    const remPath = parts.join('/')
    let result
    switch(first) {
      case 'output_index':
        try {
          return tasks.run(t, Number(fulfills[first]), remPath, i)
        } catch(err) {
          tasks.error(err)
        }
      case 'transaction_id':
        return tasks.run(t, fulfills[first], remPath, i)
      default:
        tasks.error(`path="${path}" not found`)
    }
  }
}

BigchainDB.Condition = {

  codec: CONDITION,

  version,

  cid: () => {},

  resolve: (condition: Object, path: string, tasks: Object, t: number, i?: number) => {
    if (!path || path === '/') {
      return tasks.run(t, condition, '', i)
    }
    const parts = path.split('/')
    const first = parts.shift()
    const remPath = parts.join('/')
    switch(first) {
      case 'details':
        const t1 = tasks.add(cid => {
          tasks.run(t, {
            '/': cid.toBaseEncodedString()
          }, remPath, i)
        })
        return BigchainDB.Details.cid(condition[first], tasks, t1)
      case 'uri':
        return tasks.run(t, condition[first], remPath, i)
      default:
        tasks.error(`path="${path}" not found`)
    }
  }
}

BigchainDB.InputList = {

  codec: INPUT_LIST,

  version,

  cid: () => {},

  resolve: (inputs: Object[], path: string, tasks: Object, t: number, i?: number) => {
    if (!path || path === '/') {
      return tasks.run(t, inputs, '', i)
    }
    try {
      inputs = order(inputs)
      const parts = path.split('/')
      const first = Number(parts.shift())
      const remPath = parts.join('/')
      const t1 = tasks.add(cid => {
        tasks.run(t, {
          '/': cid.toBaseEncodedString()
        }, remPath, i)
      })
      BigchainDB.Input.cid(inputs[first], tasks, t1)
    } catch(err) {
      tasks.error(err)
    }
  }
}

BigchainDB.OutputList = {

  codec: OUTPUT_LIST,

  version,

  cid: () => {},

  resolve: (outputs: Object[], path: string, tasks: Object, t: number, i?: number) => {
    if (!path || path === '/') {
      return tasks.run(t, outputs, '', i)
    }
    try {
      outputs = order(outputs)
      const parts = path.split('/')
      const first = Number(parts.shift())
      const remPath = parts.join('/')
      const t1 = tasks.add(cid => {
        tasks.run(t, {
          '/': cid.toBaseEncodedString()
        }, remPath, i)
      })
      BigchainDB.Output.cid(outputs[first], tasks, t1)
    } catch(err) {
      tasks.error(err)
    }
  }
}

BigchainDB.Input = {

  codec: INPUT,

  version,

  cid: () => {},

  resolve: (input: Object, path: string, tasks: Object, t: number, i?: number) => {
    if (!path || path === '/') {
      return tasks.run(t, input, '', i)
    }
    const parts = path.split('/')
    const first = parts.shift()
    const remPath = parts.join('/')
    const t1 = tasks.add(cid => {
      tasks.run(t, {
        '/': cid.toBaseEncodedString()
      }, remPath, i)
    })
    switch(first) {
      case 'fulfills':
        return BigchainDB.Fulfills.cid(input[first], tasks, t1)
      case 'issuers':
        return BigchainDB.PublicKeys.cid(input['owners_before'], tasks, t1)
      case 'fulfillment':
        if (isObject(input[first])) {
          return BigchainDB.Details.cid(input[first], tasks, t1)
        }
        if (isString(input[first])) {
          return tasks.run(t, input[first], remPath, i)
        }
      default:
        tasks.error(`path="${path}" not found`)
    }
  }
}

BigchainDB.Output = {

  codec: OUTPUT,

  version,

  cid: () => {},

  resolve: (output: Object, path: string, tasks: Object, t: number, i?: number) => {
    if (!path || path === '/') {
      return tasks.run(t, output, '', i)
    }
    const parts = path.split('/')
    const first = parts.shift()
    const remPath = parts.join('/')
    const t1 = tasks.add(cid => {
      tasks.run(t, {
        '/': cid.toBaseEncodedString()
      }, remPath, i)
    })
    switch(first) {
      case 'condition':
        return BigchainDB.Condition.cid(output[first], tasks, t1)
      case 'holders':
        return BigchainDB.PublicKeys.cid(output['public_keys'], tasks, t1)
      case 'amount':
        try {
          return tasks.run(t, Number(output[first]), remPath, i)
        } catch(err) {
          tasks.error(err)
        }
      default:
        tasks.error(`path="${path}" not found`)
    }
  }
}

BigchainDB.Asset = {

  codec: ASSET,

  version,

  cid: (asset: Object, tasks: Object, t: number, i?: number) => {
    if (!asset.id) {
      return tasks.error('no asset id')
    }
    try {
      const data = Buffer.from(asset.id, 'hex')
      const mh = multihash.encode(data, 'sha3-256')
      const cid = new CID(version, ASSET, mh)
      tasks.run(t, cid, i)
    } catch(err) {
      tasks.error(err)
    }
  },

  resolve: (asset: Object, path: string, tasks: Object, t: number, i?: number) => {
    if (!path || path === '/') {
      return tasks.run(t, asset, '', i)
    }
    const parts = path.split('/')
    const first = parts.shift()
    const remPath = parts.join('/')
    switch(first) {
      case 'id':
      try {
        const mh = multihash.encode(Buffer.from(asset[first], 'hex'), 'sha3_256')
        const cid = new CID(version, TX, mh)
        return tasks.run(t, {
          '/': cid.toBaseEncodedString()
        }, remPath, i)
      } catch(err) {
        tasks.error(err)
      }
      case 'data':
        return tasks.run(t, asset[first], remPath, i)
      default:
        tasks.error(`path="${path}" not found`)
    }
  }
}
*/
