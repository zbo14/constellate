'use strict';

const Form = require('./lib/form.js');
const IpfsNode = require('./lib/ipfs-node.js');
const ld = require('./lib/linked-data.js');
const request = require('browser-request');
const Web3Eth = require('./lib/web3-eth.js');
require('setimmediate');

const {
  isAncestor,
  newAnchor,
  readFileInput
} = require('./lib/gen-util.js');

const blockContainer = document.getElementById('block-container');
const blockHash = document.getElementById('block-hash');
const contractMethod = document.getElementById('contract-method');
const contractSource = document.getElementById('contract-source');
const dataContainer = document.getElementById('data-container');
const dataHash = document.getElementById('data-hash');
const exportData = document.getElementById('export-data');
const exportHashes = document.getElementById('export-hashes');
const fileHash = document.getElementById('file-hash');
const fileInput = document.getElementById('file-input');
const files = document.getElementById('files');
const formContainer = document.getElementById('form-container');
const methodParams = document.getElementById('method-params');
const schemaSelect = document.getElementById('schema-select');
const sendTo = document.getElementById('send-to');
const sendValue = document.getElementById('send-value');
const txContainer = document.getElementById('tx-container');
const txHash = document.getElementById('tx-hash');

const addFileBtn = document.getElementById('add-file-btn');
const callContractBtn = document.getElementById('call-contract-btn');
const clearBlockBtn = document.getElementById('clear-block-btn');
const clearDataBtn = document.getElementById('clear-data-btn');
const clearFilesBtn = document.getElementById('clear-files-btn');
const clearTxBtn = document.getElementById('clear-tx-btn');
const deployContractBtn = document.getElementById('deploy-contract-btn');
const exportBtn = document.getElementById('export-btn');
const externalAccountBtn = document.getElementById('external-account-btn');
const fingerprintBtn = document.getElementById('fingerprint-btn');
const getBlockBtn = document.getElementById('get-block-btn');
const getDataBtn = document.getElementById('get-data-btn');
const getFileBtn = document.getElementById('get-file-btn');
const getTxBtn = document.getElementById('get-tx-btn');
const saveDataBtn = document.getElementById('save-data-btn');
const saveFileBtn = document.getElementById('save-file-btn');
const sendEtherBtn = document.getElementById('send-ether-btn');
const sendTxBtn = document.getElementById('send-tx-btn');

let data = {},
    hashes = {},
    myAccount = {},
    web3eth;

const node = new IpfsNode();

node.start();

window.addEventListener('load', () => {
  if (!web3) return console.warn('Could not get web3 from MetaMask');
  web3eth = new Web3Eth(web3.currentProvider);
  web3eth.getAccounts().then(accounts => {
    myAccount = accounts[0];
    return web3eth.getAccountStatus(myAccount.address);
  }).then(status => {
    console.log(`---- Account ----\naddress: "${myAccount.address}"\nbalance: ${status.balance}\nnonce: ${status.nonce}\n------------------`);
  });
});

addFileBtn.addEventListener('click', () => {
  if (fileInput.files.length) {
    readFileInput(fileInput, 'array-buffer').then(ab => {
      const buf = Buffer.from(ab);
      return node.addFile(buf);
    }).then(hash => {
      fileHash.value = hash;
      console.log('Added file');
    });
  }
});

callContractBtn.addEventListener('click', () => {
  if (contractSource.files.length) {
    readFileInput(contractSource, 'text').then(source => {
      return web3eth.newContract(source);
    }).then(contract => {
      const method = contractMethod.value;
      const params = JSON.parse(`[${methodParams.value}]`);
      const to = sendTo.value;
      const value = parseFloat(sendValue.value);
      return web3eth.callContract(contract, myAccount.address, method, to, value, ...params);
    }).then(val => {
      console.log('Result:', val);
    });
  }
});

clearBlockBtn.addEventListener('click', () => {
  blockContainer.innerHTML = null;
})

clearDataBtn.addEventListener('click', () => {
  dataContainer.innerHTML = null;
});

clearFilesBtn.addEventListener('click', () => {
  files.innerHTML = null;
});

clearTxBtn.addEventListener('click', () => {
  txContainer.innerHTML = null;
});

deployContractBtn.addEventListener('click', () => {
  if (contractSource.files.length) {
    let account;
    readFileInput(contractSource, 'text').then(source => {
      return web3eth.newContract(source);
    }).then(contract => {
      return web3eth.deployContract(contract, myAccount.address);
    }).then(deployed => {
      sendTo.value = deployed.address;
      txHash.value = deployed.transactionHash;
      return web3eth.getContractAccount(deployed.address);
    }).then(_account => {
      account = _account;
      return ld.validate(account, node);
    }).then(() => {
      return node.addObject(account);
    }).then(cid => {
      dataHash.value = cid.toBaseEncodedString();
      console.log('Deployed contract');
    });
  }
});

exportBtn.addEventListener('click', () => {
  let blob;
  if (Object.keys(data).length) {
    blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    exportData.href = URL.createObjectURL(blob);
  }
  if (Object.keys(hashes).length) {
    blob = new Blob([JSON.stringify(hashes, null, 2)], { type: 'application/json' });
    exportHashes.href = URL.createObjectURL(blob);
  }
});

externalAccountBtn.addEventListener('click', () => {
  const mnemonic = prompt('Please enter your mnemonic', '');
  if (!mnemonic) return;
  const account = web3eth.newExternalAccount(myAccount.address, mnemonic);
  node.addObject(account).then(cid => {
    dataHash.value = cid.toBaseEncodedString();
    console.log('Pushed external account');
  });
});

fingerprintBtn.addEventListener('click', () => {
  if (fileHash.value) {
    const filepath = prompt('Enter path to audio file', '');
    if (!filepath) return;
    request({
      json: { filepath },
      method: 'POST',
      url: 'http://localhost:8888/fingerprint',
    }, (err, _, body) => {
        if (err) throw err;
        const obj = Object.assign({}, body, {
          fingerprintOf: {
            '/': fileHash.value
          }
        });
        node.addObject(obj).then(cid => {
          dataHash.value = cid.toBaseEncodedString();
          console.log('Calculated fingerprint');
        });
      }
    );
  }
});

formContainer.addEventListener('submit', evt => {
  evt.preventDefault();
  const form = new Form(formContainer.firstChild);
  const instance = form.instance();
  ld.validate(instance, node).then(() => {
    return node.addObject(instance);
  }).then(cid => {
    dataHash.value = cid.toBaseEncodedString();
    console.log('Added data');
  });
});

getBlockBtn.addEventListener('click', () => {
  if (blockHash.value) {
    web3eth.getBlock(blockHash.value).then(block => {
      return ld.validate(block, node);
    }).then(expanded => {
      const form = new Form(expanded);
      blockContainer.innerHTML = null;
      blockContainer.appendChild(form.element());
    });
  }
});

getDataBtn.addEventListener('click', () => {
  node.getObject(dataHash.value).then(instance => {
    return ld.validate(instance, node);
  }).then(expanded => {
    const form = new Form(expanded);
    dataContainer.innerHTML = null;
    dataContainer.appendChild(form.element());
  });
});

getFileBtn.addEventListener('click', () => {
  if (fileHash.value) {
    node.getFile(fileHash.value).then(obj => {
      files.appendChild(newAnchor(obj.data, obj.type));
    });
  }
});

getTxBtn.addEventListener('click', () => {
  if (txHash.value) {
    web3eth.getTransaction(txHash.value).then(tx => {
      return ld.validate(tx, node);
    }).then(expanded => {
      const form = new Form(expanded);
      txContainer.innerHTML = null;
      txContainer.appendChild(form.element());
    });
  }
});

saveDataBtn.addEventListener('click', () => {
  if (dataHash.value) {
    const name = prompt('Enter a name for the data', '');
    if (name) {
      let instance;
      node.getObject(dataHash.value).then(_instance => {
        instance = _instance;
        return ld.validate(instance, node);
      }).then(() => {
        data[name] = instance;
        hashes[name] = dataHash.value;
        console.log(`Saved data as "${name}"`);
      });
    }
  }
});

saveFileBtn.addEventListener('click', () => {
  if (fileHash.value) {
    const name = prompt('Enter a name for the file', '');
    if (name) {
      hashes[name] = fileHash.value;
      console.log(`Saved file as "${name}"`);
    }
  }
});

sendEtherBtn.addEventListener('click', () => {
  const to = sendTo.value;
  const value = sendValue.value;
  if (to && value) {
    web3eth.sendEther(myAccount.address, to, value).then(hash => {
      txHash.value = hash;
      console.log('Sent ether');
    });
  }
});

sendTxBtn.addEventListener('click', () => {
  if (contractSource.files.length) {
    let tx;
    readFileInput(contractSource, 'text').then(source => {
      return web3eth.newContract(source);
    }).then(contract => {
      const method = contractMethod.value;
      const params = JSON.parse(`[${methodParams.value}]`);
      const to = sendTo.value;
      const value = sendValue.value;
      return web3eth.sendTransaction(contract, myAccount.address, method, to, value, ...params);
    }).then(hash => {
      txHash.value = hash;
      return web3eth.getTransaction(hash);
    }).then(_tx => {
      tx = _tx;
      return ld.validate(tx, node);
    }).then(() => {
      return node.addObject(tx);
    }).then(cid => {
      dataHash.value = cid.toBaseEncodedString();
      console.log('Sent transaction');
    });
  }
});

schemaSelect.addEventListener('change', () => {
  if (!schemaSelect.value) return;
  formContainer.innerHTML = null;
  const form = new Form(schemaSelect.value);
  formContainer.appendChild(form.element());
});

document.body.addEventListener('keyup', evt => {
  const input = evt.target;
  if (input.nodeName !== 'INPUT' || input.type !== 'text') return;
  if (input.value[0] === '#') {
    let name = input.value.slice(1);
    if (hashes[name]) {
      setTimeout(() => {
        name = input.value.slice(1);
        if (hashes[name]) {
          input.value = hashes[name];
        }
      }, 1000);
    }
  }
});
