'use strict'

const ContentService = require('../src/content-service/browser')
const endpoint = require('../test/fixtures/endpoints').ipfs

const contentService = new ContentService({
  name: 'ipfs',
  path: endpoint
})

const fileInput = document.querySelector('input[type="file"]')
const importBtn = document.getElementById('import-btn')
const metadata = document.getElementById('metadata')

importBtn.addEventListener('click', () => {
  const files = Array.from(fileInput.files)
  if (files.length) {
    const password = prompt('Enter a password (optional)', '')
    contentService.import(files, password, (err, mediaObjects) => {
      if (err) {
        return console.error(err)
      }
      const meta = mediaObjects.map(mediaObj => mediaObj.data())
      metadata.innerHTML = JSON.stringify(meta, null, 2)
    })
  }
})
