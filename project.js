'use strict'

const fileToAnchor = require('./lib/util').fileToAnchor

const {
  Account,
  Project
} = require('./lib/constellate')

const account = new Account({ browser: true })
const newAccount = document.getElementById('new-account')
const newAccountBtn = document.getElementById('new-account-btn')
const importAccount = document.getElementById('import-account')
const importAccountBtn = document.getElementById('import-account-btn')

newAccountBtn.addEventListener('click', () => {
  const password = prompt('Please enter password', '')
  if (!password) return
  account.generate(password, (err, file) => {
    if (err) {
      return console.error(err)
    }
    newAccount.innerHTML = null
    newAccount.appendChild(fileToAnchor(file))
  })
})

importAccountBtn.addEventListener('click', () => {
  const file = importAccount.files[0]
  if (!file) return
  const password = prompt('Please enter password', '')
  if (!password) return
  account.import(file, password, err => {
    if (err) {
      return console.error(err)
    }
    console.log('Imported account')
  })
})

let project

const contentServiceName = document.getElementById('content-service-name')
const contentServicePath = document.getElementById('content-service-path')
const metadataServiceName = document.getElementById('metadata-service-name')
const metadataServicePath = document.getElementById('metadata-service-path')
const projectTitle = document.getElementById('project-title')
const newProjectBtn = document.getElementById('new-project-btn')

newProjectBtn.addEventListener('click', () => {
  const title = projectTitle.value
  if (!title) return
  project = new Project({
    account,
    browser: true,
    contentService: {
      name: contentServiceName.value,
      path: contentServicePath.value
    },
    metadataService: {
      name: metadataServiceName.value,
      path: metadataServicePath.value
    },
    title
  })
  console.log('Created new project: ' + title)
})

const importContent = document.getElementById('import-content')
const importMetadata = document.getElementById('import-metadata')
const importProjectBtn = document.getElementById('import-project-btn')
const uploadProjectBtn = document.getElementById('upload-project-btn')

importProjectBtn.addEventListener('click', () => {
  const metadata = importMetadata.files[0]
  if (!importContent.files.length || !metadata) return
  const content = Array.from(importContent.files)
  const password = prompt('Password for encryption (optional)', '')
  project.import(content, metadata, password, err => {
    if (err) {
      return console.error(err)
    }
    console.log('Imported content, metadata and generated linked-data')
  })
})

uploadProjectBtn.addEventListener('click', () => {
  let password
  if (account) {
    password = prompt('Please enter account password', '')
  }
  project.upload(password, err => {
    if (err) {
      return console.error(err)
    }
    console.log('Uploaded content, pushed linked-data')
  })
})

const exportDecryptionBtn = document.getElementById('export-decryption-btn')
const exportHashesBtn = document.getElementById('export-hashes-btn')
const exportLinkedDataBtn = document.getElementById('export-linked-data-btn')
const exportFiles = document.getElementById('export-files')

exportDecryptionBtn.addEventListener('click', () => {
  const decryption = project.export('content_decryption')
  // exportFiles.innerHTML = null
  exportFiles.appendChild(fileToAnchor(decryption))
  exportFiles.innerHTML += '<br>'
})

exportHashesBtn.addEventListener('click', () => {
  const contentHashes = project.export('content_hashes')
  const metadataHashes = project.export('metadata_hashes')
  // exportFiles.innerHTML = null
  exportFiles.appendChild(fileToAnchor(contentHashes))
  exportFiles.innerHTML += '<br>'
  exportFiles.appendChild(fileToAnchor(metadataHashes))
  exportFiles.innerHTML += '<br>'
})

exportLinkedDataBtn.addEventListener('click', () => {
  const linkedData = project.export('linked_data')
  // exportFiles.innerHTML = null
  exportFiles.appendChild(fileToAnchor(linkedData))
  exportFiles.innerHTML += '<br>'
})
