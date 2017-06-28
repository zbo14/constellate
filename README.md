## Constellate

Beware of 🔥🔥

### Install

Clone the repo and `npm install`.

### Usage

#### Browser

`npm run gulp` if it's the first time or there's no `bundle.js` file in the project directory.

This should bundle dependencies with Browserify.

`npm start` should start the express app.

Then go to `localhost:8888/main.html` in your browser and open developer tools to see console logs.

On window load, we ask [MetaMask](https://metamask.io/) for the current web3 provider.

If you haven't installed/aren't running MetaMask on a network, `web3-eth` functionality won't be available.

Also, you'll need to install [chromaprint](https://acoustid.org/chromaprint) if you want to generate audio fingerprints.

If you're on mac, you can `brew install chromaprint`.

#### Tests

`npm test` should write JSON instances to the `test/` subdirectories and validate them.
