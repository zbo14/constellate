'use strict'

const React = require('react')
const render = require('react-dom').render
const Provider = require('react-redux').Provider
const createStore = require('redux').createStore
const Constellate = require('../lib/constellate')
const Container = require('./container')
const reducer = require('./reducer')
const fileToAnchor = require('../lib/util').fileToAnchor

const constellate = new Constellate()
const metadataService = 'ipfs-metadata-service'
const store = createStore(reducer)

const stateBtn = document.getElementById('state-btn')
const importBtn = document.getElementById('import-btn')
const generateBtn = document.getElementById('generate-btn')
const pushBtn = document.getElementById('push-btn')
const getBtn = document.getElementById('get-btn')
const get = document.getElementById('get')
const exportBtn = document.getElementById('export-btn')
const clearBtn = document.getElementById('clear-btn')

constellate.IPFS(err => {
	if (err) return console.error(err)
	console.log('Started IPFS Node, configured services')
})

stateBtn.addEventListener('click', () => {
	const project = store.getState()
	console.log(JSON.stringify(project, null, 2))
})

importBtn.addEventListener('click', () => {
	const project = store.getState()
	constellate.importProject(project, err => {
		if (err) return console.error(err)
		console.log('Imported project')
	})
})

generateBtn.addEventListener('click', () => {
	constellate.generateIPLD(metadataService, err => {
		if (err) return console.error(err)
		console.log('Generated IPLD')
	})
})

pushBtn.addEventListener('click', () => {
	constellate.pushIPLD(metadataService, err => {
		if (err) return console.error(err)
		console.log('Pushed IPLD')
	})
})

clearBtn.addEventListener('click', () => {
	constellate.clearMetadata()
	constellate.clearMetaHashes()
	console.log('Cleared')
})

getBtn.addEventListener('click', () => {
	if (!get.value) return
	constellate.getMetadata(metadataService, get.value, true, (err, result) => {
		if (err) return console.error(err)
		alert(JSON.stringify(result, null, 2))
	})
})

exportBtn.addEventListener('click', () => {
	const hashes = JSON.stringify(constellate.exportMetaHashes(), null, 2)
	const ipld = JSON.stringify(constellate.exportIPLD(), null, 2)
	const type = 'application/json'
	downloads.innerHTML = null
	downloads.appendChild(fileToAnchor(new File([hashes], 'hashes.json', { type })))
	downloads.innerHTML += '<br>'
	downloads.appendChild(fileToAnchor(new File([ipld], 'ipld.json', { type })))
	downloads.innerHTML += '<br>'
})

render(
  <Provider store={store}>
    <Container />
  </Provider>,
  document.getElementById('root')
)
