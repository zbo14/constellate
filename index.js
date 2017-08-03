'use strict'

const Constellate = require('./lib/constellate')
const fileToAnchor = require('./lib/util').fileToAnchor

const constellate = new Constellate()

// constellate.BigchainDB('', err => {
//   if (err) return console.error(err)
//   console.log('Configured BigchainDB metadata-service')
// })

constellate.IPFS(err => {
  if (err) return console.error(err)
  console.log('Started IPFS Node, configured services')
})

// constellate.Swarm('http://swarm-gateways.net/', err => {
//   if (err) return console.error(err)
//   console.log('Configured Swarm content-service')
// })

// Services

const contentService = document.getElementById('content-service')
const metaService = document.getElementById('meta-service')

// Import

const importContent = document.getElementById('content')
const importContentBtn = document.getElementById('import-content-btn')
const importDecryption = document.getElementById('decryption')
const importDecryptionBtn = document.getElementById('import-decryption-btn')
const importMeta = document.getElementById('meta')
const importMetaBtn = document.getElementById('import-meta-btn')
const encrypt = document.getElementById('encrypt')

importContentBtn.addEventListener('click', () => {
  const service = contentService.value
  if (!service || !content.files.length) return
  const files = Array.from(content.files)
  let password
  if (encrypt.checked) {
    password = prompt('Please enter password', '')
    if (!password) return
  }
  constellate.Browser.importContent(service, files, password, err => {
    if (err) return console.error(err)
    console.log('Imported content')
  })
})

importDecryptionBtn.addEventListener('click', () => {
  const file = importDecryption.files[0]
  if (!file) return
  constellate.Browser.importDecryption(file, err => {
    if (err) return console.error(err)
    console.log('Imported decryption')
  })
})

importMetaBtn.addEventListener('click', () => {
  if (!importMeta.files.length) return
  const files = Array.from(importMeta.files)
  constellate.Browser.importMetadata(files, err => {
    if (err) return console.error(err)
    console.log('Imported metadata')
  })
})

// Generate

const generateBtn = document.getElementById('generate-btn')

generateBtn.addEventListener('click', () => {
  const service = metaService.value
  if (!service) return
  constellate.generateIPLD(service, err => {
    if (err) return console.error(err);
    console.log('Generated IPLD')
  })
})

// Upload

const uploadContentBtn = document.getElementById('upload-content-btn')
const pushIpldBtn = document.getElementById('push-ipld-btn')

uploadContentBtn.addEventListener('click', () => {
  const service = contentService.value
  if (!service) return
  constellate.uploadContent(service, err => {
    if (err) return console.error(err)
    console.log('Uploaded content')
  })
})

pushIpldBtn.addEventListener('click', () => {
  const service = metaService.value
  if (!service) return
  constellate.pushIPLD(service, err => {
    if (err) return console.error(err)
    console.log('Pushed IPLD')
  })
})

// Export

const exportDecryptionBtn = document.getElementById('export-decryption-btn')
const exportHashesBtn = document.getElementById('export-hashes-btn')
const exportIpldBtn = document.getElementById('export-ipld-btn')
const downloads = document.getElementById('downloads')

exportDecryptionBtn.addEventListener('click', () => {
  const decryption = JSON.stringify(constellate.exportDecryption(), null, 2)
  downloads.innerHTML = null
  downloads.appendChild(fileToAnchor(new File([decryption], 'decryption.json', { type: 'application/json' })))
})

exportHashesBtn.addEventListener('click', () => {
  const fileHashes = constellate.exportFileHashes()
  const metaHashes = constellate.exportMetaHashes()
  const hashes = JSON.stringify({ fileHashes, metaHashes }, null, 2)
  downloads.innerHTML = null
  downloads.appendChild(fileToAnchor(new File([hashes], 'hashes.json', { type: 'application/json' })))
  downloads.innerHTML += '<br>'
})

exportIpldBtn.addEventListener('click', () => {
  const ipld = JSON.stringify(constellate.exportIPLD(), null, 2)
  downloads.innerHTML = null
  downloads.appendChild(fileToAnchor(new File([ipld], 'ipld.json', { type: 'application/json' })))
  downloads.innerHTML += '<br>'
})

const getContent = document.getElementById('get-content')
const getContentBtn = document.getElementById('get-content-btn')
const decrypt = document.getElementById('decrypt')
const getMeta = document.getElementById('get-meta')
const getMetaBtn = document.getElementById('get-meta-btn')
const expand = document.getElementById('expand')
const getResult = document.getElementById('get-result')

getContentBtn.addEventListener('click', () => {
  const service = contentService.value
  const value = getContent.value
  if (!service || !value) return
  let name, password
  if (decrypt.checked) {
    name = prompt('Please enter filename', '')
    if (!name) return
    password = prompt('Please enter password', '')
    if (!password) return
  }
  constellate.Browser.getContent(service, value, { name, password }, (err, result) => {
    if (err) return console.error(err)
    getResult.innerHTML = null
    getResult.appendChild(fileToAnchor(result))
    getResult.innerHTML += '<br>'
  })
})

getMetaBtn.addEventListener('click', () => {
  const service = metaService.value
  const value = getMeta.value
  if (!service || !value) return
  constellate.getMetadata(service, value, expand.checked, (err, result) => {
    if (err) return console.error(err)
    json.value = JSON.stringify(result, null, 2)
  })
})
