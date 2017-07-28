'use strict'

const Constellate = require('./lib/constellate.js')
const { fileToAnchor } = require('./lib/util.js')

const content = document.getElementById('content')
// const decrypt = document.getElementById('decrypt')
const downloads = document.getElementById('downloads')
// const encrypt = document.getElementById('encrypt')
const expand = document.getElementById('expand')
const getContent = document.getElementById('get-content')
const getMeta = document.getElementById('get-meta')
const json = document.getElementById('json')
const meta = document.getElementById('meta')

const exportBtn = document.getElementById('export-btn')
const generateBtn = document.getElementById('generate-btn')
const getContentBtn = document.getElementById('get-content-btn')
const getMetaBtn = document.getElementById('get-meta-btn')
const importContentBtn = document.getElementById('import-content-btn')
const importMetaBtn = document.getElementById('import-meta-btn')
const uploadBtn = document.getElementById('upload-btn')

const constellate = new Constellate()

constellate.BigchainDB('http://192.168.99.100:9984/api/v1', err => {
  if (err) return console.error(err)
  console.log('Configured BigchainDB MetadataService')
})

constellate.IPFS(err => {
  if (err) return console.error(err)
  console.log('Started IPFS Node and configured services')
})

exportBtn.addEventListener('click', () => {
  downloads.innerHTML = null
  const hashes = constellate.exportHashes()
  const ipld = constellate.exportIPLD()
  const type = 'application/json'
  downloads.appendChild(fileToAnchor(
    new File([JSON.stringify(hashes, null, 2)], 'hashes.json', { type })
  ))
  downloads.innerHTML += '<br>'
  downloads.appendChild(fileToAnchor(
    new File([JSON.stringify(ipld, null, 2)], 'ipld.json', { type })
  ))
  downloads.innerHTML += '<br>'
})

generateBtn.addEventListener('click', () => {
  constellate.generateIPLD(err => {
    if (err) return console.error(err);
    console.log('Done')
  })
})

getContentBtn.addEventListener('click', () => {
  if (!getContent.value) return
  // let key
  // if (decrypt.checked) {
  //  key = prompt('Please enter key to decrypt file', '')
  //  if (!key) return
  // }
  constellate.getContent(getContent.value, (err, result) => {
    if (err) return console.error(err)
    downloads.innerHTML = null
    downloads.appendChild(fileToAnchor(result))
    downloads.innerHTML += '<br>'
  })
})

getMetaBtn.addEventListener('click', () => {
  if (!getMeta.value) return
  constellate.getMetadata('bigchaindb-metadata-service', getMeta.value, expand.checked, (err, result) => {
    if (err) return console.error(err)
    json.value = JSON.stringify(result, null, 2)
  })
})

importContentBtn.addEventListener('click', () => {
  if (!content.files.length) return
  const files = Array.from(content.files)
  constellate.importContent(files, err => {
    if (err) return console.error(err)
    console.log('Done')
  })
})

importMetaBtn.addEventListener('click', () => {
  if (!meta.files.length) return
  const files = Array.from(meta.files)
  constellate.importMetadata(files, err => {
    if (err) return console.error(err)
    console.log('Done')
  })
})

uploadBtn.addEventListener('click', () => {
  constellate.upload(err => {
    if (err) return console.error(err)
    console.log('Done')
  })
})
