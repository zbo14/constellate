'use strict'

const fileToAnchor = require('./lib/util').fileToAnchor

const {
  ContentService,
  MetadataService
} = require('./lib/browser')

let contentService, metadataService

const contentServiceName = document.getElementById('content-service-name')
const contentServicePath = document.getElementById('content-service-path')
const metadataServiceName = document.getElementById('metadata-service-name')
const metadataServicePath = document.getElementById('metadata-service-path')
const setContentServiceBtn = document.getElementById('set-content-service-btn')
const setMetadataServiceBtn = document.getElementById('set-metadata-service-btn')

setContentServiceBtn.addEventListener('click', () => {
  const name = contentServiceName.value
  const path = contentServicePath.value
  if (!name || !path) return
  contentService = new ContentService({ browser: true, name, path })
  console.log('Set content service')
})

setMetadataServiceBtn.addEventListener('click', () => {
  const name = metadataServiceName.value
  const path = metadataServicePath.value
  if (!name || !path) return
  metadataService = new MetadataService({ browser: true, name, path })
  console.log('Set metadata service')
})

const importDecryption = document.getElementById('import-decryption')
const importDecryptionBtn = document.getElementById('import-decryption-btn')
const importContentHashes = document.getElementById('import-content-hashes')
const importContentHashesBtn = document.getElementById('import-content-hashes-btn')
const importMetadataHashes = document.getElementById('import-metadata-hashes')
const importMetadataHashesBtn = document.getElementById('import-metadata-hashes-btn')

importDecryptionBtn.addEventListener('click', () => {
  if (!contentService) return
  const file = importDecryption.files[0]
  if (!file) return
  contentService.importDecryption(file)
  console.log('Imported content decryption')
})

importContentHashesBtn.addEventListener('click', () => {
  if (!contentService) return
  const file = importContentHashes.files[0]
  if (!file) return
  contentService.importHashes(file)
  console.log('Imported content hashes')
})

importMetadataHashesBtn.addEventListener('click', () => {
  if (!metadataService) return
  const file = importMetadataHashes.files[0]
  if (!file) return
  metadataService.importHashes(file)
  console.log('Imported metadata hashes')
})

const decrypt = document.getElementById('decrypt')
const getContent = document.getElementById('get-content')
const getContentBtn = document.getElementById('get-content-btn')
const getContentResult = document.getElementById('get-content-result')

getContentBtn.addEventListener('click', () => {
  if (!contentService) return
  const path = getContent.value
  if (!path) return
  let password
  if (decrypt.checked) {
    password = prompt('Please enter password for decryption', '')
  }
  contentService.get(path, { password }, (err, file) => {
    if (err) {
      return console.error(err)
    }
    getContentResult.innerHTML = null
    getContentResult.appendChild(fileToAnchor(file))
  })
})

const expand = document.getElementById('expand')
const getMetadata = document.getElementById('get-metadata')
const getMetadataBtn = document.getElementById('get-metadata-btn')
const getMetadataResult = document.getElementById('get-metadata-result')

getMetadataBtn.addEventListener('click', () => {
  if (!metadataService) return
  const path = getMetadata.value
  if (!path) return
  metadataService.get(path, expand.checked, (err, obj) => {
    if (err) {
      return console.error(err)
    }
    getMetadataResult.innerHTML = JSON.stringify(obj, null, 2)
  })
})
