'use strict'

const {
  ContentService,
  MetadataService
} = require('./lib/browser')

const {
  fileToMedia,
  prettyJSON
} = require('./lib/util')

let contentService, metadataService

const contentServiceName = document.getElementById('content-service-name')
const contentServicePath = document.getElementById('content-service-path')
const setContentServiceBtn = document.getElementById('set-content-service-btn')

setContentServiceBtn.addEventListener('click', () => {
  const name = contentServiceName.value
  const path = contentServicePath.value
  if (!name || !path) return
  contentService = new ContentService({ name, path })
  console.log('Set content service')
})

const metadataServiceName = document.getElementById('metadata-service-name')
const metadataServicePath = document.getElementById('metadata-service-path')
const setMetadataServiceBtn = document.getElementById('set-metadata-service-btn')

setMetadataServiceBtn.addEventListener('click', () => {
  const name = metadataServiceName.value
  const path = metadataServicePath.value
  if (!name || !path) return
  metadataService = new MetadataService({ name, path })
  console.log('Set metadata service')
})

const content = document.getElementById('content')
const importContentBtn = document.getElementById('import-content-btn')

importContentBtn.addEventListener('click', () => {
  if (!contentService || !content.files.length) return
  const files = Array.from(content.files)
  contentService.import(files, (err, meta) => {
    if (err) {
      throw err
    }
    console.log(prettyJSON(meta))
  })
})

const metadata = document.getElementById('metadata')
const importMetadataBtn = document.getElementById('import-metadata-btn')

importMetadataBtn.addEventListener('click', () => {
  const file = metadata.files[0]
  if (!metadataService || !file) return
  metadataService.import(file, err => {
    if (err) {
      throw err
    }
    const elems = metadataService._elems
    console.log(prettyJSON(elems))
  })
})

/*
const contentHash = document.getElementById('content-hash')
const getContentBtn = document.getElementById('get-content-btn')
const media = document.getElementById('media')

getContentBtn.addEventListener('click', () => {
  const hash = contentHash.value
  if (!contentService || !hash) return
  contentService.get(hash, (err, file) => {
    if (err) {
      throw err
    }
    const el = fileToMedia(file)
    // media.innerHTML = null
    media.appendChild(el)
  })
})
*/
