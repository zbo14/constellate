'use strict';

const CID = require('cids');
require('setimmediate');

const {
  callContract,
  compileSource,
  deployContract,
  getAccounts,
  getBalanceAndNonce,
  getContractAccount,
  getTransaction,
  newContract,
  newExternalAccount,
  sendEther,
  sendTransaction,
  setWeb3Provider
} = require('./lib/ethereum.js');

const {
  formToObject,
  getInputs,
  objectToForm,
  schemaToForm
} = require('./lib/form.js');

const {
  addFile,
  getCBOR,
  getFile,
  putCBOR,
  startPeer
} = require('./lib/ipfs.js');

const {
  getTypeSchema,
  validate
} = require('./lib/linked-data.js');

const {
  isAncestor,
  newAnchor,
  readFileInput
} = require('./lib/util.js');

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
const importHashes = document.getElementById('import-hashes');
const methodParams = document.getElementById('method-params');
const schemaSelect = document.getElementById('schema-select');
const sendTo = document.getElementById('send-to');
const sendValue = document.getElementById('send-value');
const txContainer = document.getElementById('tx-container');
const txHash = document.getElementById('tx-hash');

const addFileBtn = document.getElementById('add-file-btn');
const callContractBtn = document.getElementById('call-contract-btn');
const clearDataBtn = document.getElementById('clear-data-btn');
const clearFilesBtn = document.getElementById('clear-files-btn');
const clearTxBtn = document.getElementById('clear-tx-btn');
const deployContractBtn = document.getElementById('deploy-contract-btn');
const exportBtn = document.getElementById('export-btn');
const externalAccountBtn = document.getElementById('external-account-btn');
const getDataBtn = document.getElementById('get-data-btn');
const getFileBtn = document.getElementById('get-file-btn');
const getTxBtn = document.getElementById('get-tx-btn');
const importBtn = document.getElementById('import-btn');
const saveDataBtn = document.getElementById('save-data-btn');
const saveFileBtn = document.getElementById('save-file-btn');
const sendEtherBtn = document.getElementById('send-ether-btn');
const sendTxBtn = document.getElementById('send-tx-btn');

let data = {},
    hashes = {},
    myAccount = {};

window.addEventListener('load', () => {
  if (!web3) return console.warn('Could not get web3 from MetaMask');
  setWeb3Provider(web3.currentProvider);
  console.log('Set Web3 Provider');
  getAccounts().then((accounts) => {
    myAccount = accounts[0];
    return getBalanceAndNonce(myAccount.address);
  }).then((obj) => {
    console.log(`---- Account ----\naddress: "${myAccount.address}"\nbalance: ${obj.balance}\nnonce: ${obj.nonce}\n------------------`);
  });
});

startPeer().then((info) => {
  console.log('Peer info:', info);
  formContainer.addEventListener('submit', (evt) => {
    evt.preventDefault();
    const form = formContainer.firstChild;
    const obj = formToObject(Array.from(form.children));
    validate(obj).then(() => {
      return putCBOR(obj);
    }).then((cid) => {
      dataHash.value = cid.toBaseEncodedString();
      console.log('Added data');
    });
  });
  addFileBtn.addEventListener('click', () => {
    if (fileInput.files.length) {
      readFileInput(fileInput, 'array-buffer').then((ab) => {
        const buf = Buffer.from(ab);
        const path = fileInput.files[0].name;
        return addFile(buf, path);
      }).then((hash) => {
        fileHash.value = hash;
        console.log('Added file');
      });
    }
  });
  getDataBtn.addEventListener('click', () => {
    getCBOR(dataHash.value).then((obj) => {
      return validate(obj);
    }).then((expanded) => {
      const form = objectToForm(expanded);
      dataContainer.innerHTML = null;
      Array.from(form.children).forEach((div) => {
        if (div.nodeName === 'DIV') dataContainer.appendChild(div);
      });
    });
  });
  getFileBtn.addEventListener('click', () => {
    if (fileHash.value) {
      getFile(fileHash.value).then((obj) => {
        files.appendChild(newAnchor(obj.data, obj.type));
      });
    }
  });
});

callContractBtn.addEventListener('click', () => {
  if (contractSource.files.length) {
    readFileInput(contractSource, 'text').then((source) => {
      return compileSource(source);
    }).then((compiled) => {
      const contract = newContract(compiled);
      const method = contractMethod.value;
      const params = JSON.parse(`[${methodParams.value}]`);
      const to = sendTo.value;
      const value = parseFloat(sendValue.value);
      return callContract(contract, myAccount.address, method, params, to, value);
    }).then((val) => {
      console.log('Result:', val);
    });
  }
});

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
    readFileInput(contractSource, 'text').then((source) => {
      return deployContract(myAccount.address, source);
    }).then((deployed) => {
      sendTo.value = deployed.address;
      txHash.value = deployed.transactionHash;
      return getContractAccount(deployed.address);
    }).then((_account) => {
      account = _account;
      return validate(account);
    }).then(() => {
      return putCBOR(account);
    }).then((cid) => {
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
  const account = newExternalAccount(myAccount.address, mnemonic);
  putCBOR(account).then((cid) => {
    dataHash.value = cid.toBaseEncodedString();
    console.log('Pushed external account');
  });
});

getTxBtn.addEventListener('click', () => {
  if (txHash.value) {
    getTransaction(txHash.value).then((tx) => {
      return validate(tx);
    }).then((expanded) => {
      const form = objectToForm(expanded);
      txContainer.innerHTML = null;
      txContainer.appendChild(form);
    });
  }
});

importBtn.addEventListener('click', () => {
  if (importHashes.files.length) {
    readFileInput(importHashes, 'text').then((result) => {
      hashes = JSON.parse(result);
      console.log('Imported hashes');
    });
  }
});

saveDataBtn.addEventListener('click', () => {
  if (dataHash.value) {
    const name = prompt('Enter a name for the data', '');
    if (name) {
      let obj;
      getCBOR(dataHash.value).then((_obj) => {
        obj = _obj;
        return validate(obj);
      }).then(() => {
        data[name] = obj;
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
    sendEther(myAccount.address, to, value).then((hash) => {
      txHash.value = hash;
      console.log('Sent ether');
    });
  }
});

sendTxBtn.addEventListener('click', () => {
  if (contractSource.files.length) {
    let tx;
    readFileInput(contractSource, 'text').then((source) => {
      return compileSource(source);
    }).then((compiled) => {
      const contract = newContract(compiled);
      const method = contractMethod.value;
      const params = JSON.parse(`[${methodParams.value}]`);
      const to = sendTo.value;
      const value = sendValue.value;
      return sendTransaction(contract, myAccount.address, method, params, to, value);
    }).then((hash) => {
      txHash.value = hash;
      return getTransaction(hash);
    }).then((_tx) => {
      tx = _tx;
      return validate(tx);
    }).then(() => {
      return putCBOR(tx);
    }).then((cid) => {
      dataHash.value = cid.toBaseEncodedString();
      console.log('Sent transaction');
    });
  }
});

schemaSelect.addEventListener('change', () => {
  if (!schemaSelect.value) return;
  formContainer.innerHTML = null;
  const schema = getTypeSchema(schemaSelect.value);
  const form = schemaToForm(schema);
  let child, elem, input, label;
  for (let i = 0; i < form.children.length; i++) {
    child = form.children[i];
    if (child.nodeName === 'DIV' &&
        (elem = child.lastChild) &&
        (label = child.firstChild) &&
        label.textContent === '@context') {
      break;
    }
  }
  formContainer.appendChild(form);
});

document.body.addEventListener('keyup', (evt) => {
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
