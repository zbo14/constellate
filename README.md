## Constellate

Beware of 🔥🔥

### Install

Clone the repo and `npm install`.

### Usage

#### Browser

`npm run gulp` if it's the first time or there's no `bundle.js` file in the project directory.

This should bundle dependencies with Browserify.

`npm start` should start the http-server and open a browser window.

Click on `main.html` and open developer tools to see console logs.

On window load, we ask [MetaMask](https://metamask.io/) for the current web3 provider.

If you haven't installed/aren't running MetaMask on a network, `web3-eth` functionality won't be available.

TODO: walkthrough

#### Tests

`npm test` should write JSON instances to the `test/` subdirectories and validate them.
