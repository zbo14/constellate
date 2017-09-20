'use strict'

exports.errInvalidPassword = password => {
  return new Error('invalid password: ' + password)
}

exports.errPathNotFound = path => {
  return new Error('path not found: ' + path)
}

exports.errUnexpectedCID = cid => {
  return new Error('unexpected cid: ' + JSON.stringify(cid))
}

exports.errUnexpectedHash = (actual, expected) => {
  return new Error(`expected hash="${expected}", got "${actual}"`)
}

exports.errUnexpectedType = (actual, expected) => {
  return new Error(`expected type="${expected}", got "${actual}"`)
}

exports.errUnsupportedService = name => {
  return new Error(`"${name}" is not a supported service`)
}
