'use strict'

exports.clone = x => {
  return JSON.parse(JSON.stringify(x))
}

// adapted from https://stackoverflow.com/questions/16167581/sort-object-properties-and-json-stringify#comment73545624_40646557

exports.orderStringify = (x, space) => {
  const keys = []
  JSON.stringify(x, (k, v) => {
    keys.push(k)
    if (v instanceof Array) {
      v.sort(exports.sort)
    }
    return v
  })
  return JSON.stringify(x, keys.sort(), space)
}

exports.order = x => {
  return JSON.parse(exports.orderStringify(x))
}

exports.sort = (x, y) => {
  let i
  if (x instanceof Array && y instanceof Array) {
    x.sort(exports.sort)
    y.sort(exports.sort)
    let result
    for (i = 0; i < x.length && i < y.length; i++) {
      result = exports.sort(x[i], y[i])
      if (result) {
        return result
      }
    }
    return 0
  }
  if (x.constructor === Object && y.constructor === Object) {
    const xkeys = Object.keys(x).sort()
    const ykeys = Object.keys(y).sort()
    for (i = 0; i < xkeys.length && i < ykeys.length; i++) {
      if (xkeys[i] < ykeys[i]) {
        return -1
      }
      if (xkeys[i] > ykeys[i]) {
        return 1
      }
    }
    if (xkeys.length < ykeys.length) {
      return -1
    }
    if (xkeys.length > ykeys.length) {
      return 1
    }
    for (i = 0; i < xkeys.length && i < ykeys.length; i++) {
      if (x[xkeys[i]] < y[ykeys[i]]) {
        return -1
      }
      if (x[xkeys[i]] > y[ykeys[i]]) {
        return 1
      }
    }
    return 0
  }
  if (x < y) {
    return -1
  }
  if (x > y) {
    return 1
  }
  return 0
}

const transform = (val, fn) => {
  val = fn(val)
  if (val instanceof Array) {
    return val.map(v => transform(v, fn))
  } else if (val.constructor === Object) {
    return Object.keys(val).reduce((result, key) => {
      result[key] = transform(val[key], fn)
      return result
    }, {})
  }
  return val
}

exports.transform = transform

const traverse = (val, fn, keys = []) => {
  if (keys.length) {
    fn(val, keys)
  }
  if (val instanceof Array) {
    val.forEach((elem, i) => {
      traverse(elem, fn, keys.concat(i))
    })
  } else if (val.constructor === Object) {
    Object.keys(val).forEach(key => {
      traverse(val[key], fn, keys.concat(key))
    })
  }
}

exports.traverse = traverse
