'use strict'

const Constellate = require('./lib/constellate.js')
const { fileToAnchor } = require('./lib/util.js')

const content = document.getElementById('content')
const decrypt = document.getElementById('decrypt')
const downloads = document.getElementById('downloads')
const encrypt = document.getElementById('encrypt')
const get = document.getElementById('get')
const json = document.getElementById('json')
const meta = document.getElementById('meta')

const exportBtn = document.getElementById('export-btn')
const generateBtn = document.getElementById('generate-btn')
const getBtn = document.getElementById('get-btn')
const importContentBtn = document.getElementById('import-content-btn')
const importMetaBtn = document.getElementById('import-meta-btn')
const uploadBtn = document.getElementById('upload-btn')

const constellate = new Constellate()

constellate.start(err => {
  if (err) return console.error(err)
  console.log('Constellate is running!')
})

exportBtn.addEventListener('click', () => {
  downloads.innerHTML = null
  const hashes = constellate.exportHashes()
  const keys = constellate.exportKeys()
  const type = 'application/json'
  if (hashes) {
    downloads.appendChild(fileToAnchor(
      new File([JSON.stringify(hashes, null, 2)], 'hashes.json', { type })
    ))
    downloads.innerHTML += '<br>'
  }
  if (keys) {
    downloads.appendChild(fileToAnchor(
      new File([JSON.stringify(keys, null, 2)], 'keys.json', { type })
    ))
    downloads.innerHTML += '<br>'
  }
})

generateBtn.addEventListener('click', () => {
  constellate.generate(err => {
    if (err) throw err;
    console.log('Done')
  })
})

getBtn.addEventListener('click', () => {
  if (!get.value) return
  let key
  if (decrypt.checked) {
    key = prompt('Please enter key to decrypt file', '')
    if (!key) return
  }
  constellate.get(get.value, key, (err, result) => {
    if (err) throw err
    if (result instanceof File) {
      downloads.innerHTML = null
      downloads.appendChild(fileToAnchor(result))
      downloads.innerHTML += '<br>'
    } else {
      json.value = JSON.stringify(result, null, 2)
    }
  })
})

importContentBtn.addEventListener('click', () => {
  if (!content.files.length) return
  const files = Array.from(content.files)
  constellate.importContent(files, err => {
    if (err) throw err
    console.log('Done')
  })
})

importMetaBtn.addEventListener('click', () => {
  if (!meta.files.length) return
  const files = Array.from(meta.files)
  constellate.importMeta(files, err => {
    if (err) throw err
    console.log('Done')
  })
})

uploadBtn.addEventListener('click', () => {
  constellate.upload(err => {
    if (err) throw err
    console.log('Done')
  })
})
