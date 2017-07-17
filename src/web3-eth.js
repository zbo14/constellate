'use strict';

const bip39 = require('bip39');
const HDKey = require('ethereumjs-wallet/HDKey');
const Web3 = require('web3');

const {
  order
} = require('../lib/util.js');

// @flow

/**
 * @module constellate/src/web3-eth
 */ 

module.exports = function(provider: Object) {

  const web3 = new Web3(provider);

  this.callContract = (
    contract: Object, from: string, method: string, params: any[],
    to: string, value: number, t: Object, id: number|string) => {
    const instance = contract.at(to);
    value *= 1.0e18;
    instance[method].estimateGas((err, gas) => {
      if (err) return t.error(err);
      instance[method].call(...params, { from, gas, value }, (err, val) => {
        if (err) return t.error(err);
        t.run(val, id);
      });
    });
  }

  this.deployContract = (contract: Object, from: string, t: Object, id: number|string) => {
    const data = contract.code;
    web3.eth.estimateGas({ data }, (err, gas) => {
      if (err) return t.error(err);
      contract.new({ data, from, gas }, (err, deployed) => {
        if (err) return t.error(err);
        if (deployed.address) t.run(deployed, id);
      });
    });
  }

  this.getAccounts = (t: Object, id: number|string) => {
    web3.eth.getAccounts((err, addrs) => {
      if (err) return t.error(err);
      const accounts = new Array(addrs.length);
      for (let i = 0; i < addrs.length; i++) {
        accounts[i] = {
          '@context': 'http://ethon.consensys.net/',
          '@type': 'Account',
          address: addrs[i]
        }
      }
      t.run(accounts, id);
    });
  }

  this.getAccountStatus = (address: string, t: Object, id: number|string) => {
    web3.eth.getBalance(address, (err, balance) => {
      if (err) return t.error(err);
        web3.eth.getTransactionCount(address, (err, nonce) => {
        if (err) return t.error(err);
        balance /= 1.0e18;
        t.run({ balance, nonce }, id);
      });
    });
  }


  this.getBlock = (argv: number|string, t: Object, id: number|string) => {
    web3.eth.getBlock(argv, (err, block) => {
      if (err) return t.error(err);
      const instance : Object  = {
        '@context': 'http://ethon.consensys.net/',
        '@type': 'Block',
        blockCreationTime: new Date(block.timestamp*1000).toISOString(),
        blockDifficulty: block.difficulty.toString(),
        blockGasLimit: block.gasLimit,
        blockGasUsed: block.gasUsed,
        blockHash: block.hash,
        blockSize: block.size,
        createsPostBlockState: {
          '@type': 'WorldState',
          stateRoot: block.stateRoot
        },
        containsTx: block.transactions.map((txHash) => {
          return { '@type': 'Tx', txHash };
        }),
        hasBeneficiary: {
          '@type': 'Account',
          address: block.miner
        },
        hasParentBlock: {
          '@type': 'Block',
          blockHash: block.parentHash
        },
        hasTxTrie: {
          '@type': 'TxTrie',
          transactionsRoot: block.transactionsRoot
        },
        number: block.number
      }
      if (block.nonce !== '0x0') {
        instance.blockNonce = block.nonce;
      }
      if (block.uncles.length) {
        instance.knowsOfUncle = block.uncles.map((blockHash) => {
          return { '@type': 'Block', blockHash };
        });
      }
      t.run(order(instance), id);
    });
  }

  this.getContractAccount = (address: string, t: Object, id: number|string) => {
    web3.eth.getCode(address, (err, code) => {
      if (err) return t.error(err);
      const accountCodeHash = Buffer.from(web3.sha3(code).slice(2), 'hex').toString('base64');
      t.run({
        '@context': 'http://ethon.consensys.net/',
        '@type': 'ContractAccount',
        accountCodeHash, address
      }, id);
    });
  }

  this.getTransaction = (hash: string, t: Object, id: number|string) => {
    web3.eth.getTransaction(hash, (err, tx) => {
      if (err) return t.error(err);
      const instance : Object = {
        '@context': 'http://ethon.consensys.net/',
        '@type': 'Tx',
        fromAccount: {
          '@type': 'Account',
          address: tx.from
        },
        msgGasPrice: parseInt(tx.gasPrice),
        txGasUsed: tx.gas,
        txHash: tx.hash,
        txNonce: tx.nonce
      }
      if (tx.input !== '0x0') {
        instance.msgPayload = tx.input;
      }
      if (tx.to !== '0x0') {
        instance.toAccount = {
          '@type': 'Account',
          address: tx.to
        }
      }
      const value = parseInt(tx.value);
      if (value) {
        instance.value = value;
      }
      t.run(order(instance), id);
    });
  }

  this.getTransactionReceipt = (hash: string, t: Object, id:number|string) => {
    web3.eth.getTransactionReceipt(hash, (err, receipt) => {
      if (err) return t.error(err);
      t.run(receipt, id);
    });
  }

  this.newContract = (source: string, t: Object, id: number|string) => {
    web3.eth.compile.solidity(source, (err, compiled) => {
      if (err) return t.error(err);
      const contract = web3.eth.contract(compiled.info.abiDefinition);
      contract.code = compiled.code;
      t.run(contract, id);
    });
  }

  this.newExternalAccount = (address: string, mnemonic: string): Object => {
    const hdkey = hdkeyFromMnemonic(mnemonic);
    const wallet = defaultWallet(hdkey);
    const accountPublicKey = wallet.getPublicKeyString();
    return {
      '@context': 'http://ethon.consensys.net/',
      '@type': 'ExternalAccount',
      accountPublicKey, address
    }
  }

  this.sendEther = (from: string, to: string, value: number): Promise<string> => {
    value *= 1.0e18;
    return new Promise((resolve, reject) => {
      web3.eth.sendTransaction({ from, to, value }, (err, hash) => {
        if (err) return reject(err);
        resolve(hash);
      });
    });
  }

  this.sendTransaction = (
    contract: Object, from: string, method: string, params: any[],
    to: string, value: number, t: Object, id: number|string) => {
    const instance = contract.at(to);
    value *= 1.0e18;
    return instance[method].estimateGas((err, gas) => {
      if (err) return t.error(err);
      instance[method].sendTransaction(...params, { from, gas, value }, (err, hash) => {
        if (err) return t.error(err);
        t.run(hash, id);
      });
    });
  }

  this.signData = (address: string, data: string, t: Object, id: number|string) => {
    web3.eth.sign(address, new Web3().sha3(data), (err, sig) => {
      if (err) return t.error(err);
      const r = '0x' + sig.slice(2, 66);
      const s = '0x' + sig.slice(66, 130);
      const v = parseInt(sig.slice(130, 132), 16) + 27;
      t.run({ r, s, v }, id);
    });
  }
}

// The following code is adapted from http://truffleframework.com/tutorials/using-infura-custom-provider

const hdpath = "m/44'/60'/0'/0/";

function defaultWallet(hdkey: Object): Object {
  return getWallet(hdkey, 0);
}

function getWallet(hdkey: Object, n: number): Object {
  return hdkey.derivePath(hdpath + n).getWallet();
}

function hdkeyFromMnemonic(mnemonic: string): Object {
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error('invalid mnemonic');
  }
  return HDKey.fromMasterSeed(bip39.mnemonicToSeed(mnemonic));
}
