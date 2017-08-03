const crypto = require('crypto')

const password = 'passwerd'

crypto.pbkdf2(password, 'salt', 100000, 256, 'sha256', (err, dkey) => {
  console.log(dkey.toString('hex'))
})

crypto.pbkdf2(password, 'salt', 100000, 256, 'sha256', (err, dkey) => {
  console.log(dkey.toString('hex'))
})
