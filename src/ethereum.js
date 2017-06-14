'use strict';

const bip39 = require('bip39');
const HDKey = require('ethereumjs-wallet/HDKey');
const HookedWalletTxSubprovider = require('web3-provider-engine/subproviders/hooked-wallet-ethtx');
const ProviderEngine = require('web3-provider-engine');
const RpcSubprovider = require('web3-provider-engine/subproviders/rpc');
const { sign } = require('ethjs-signer');
const SignerProvider = require('ethjs-provider-signer');
const Transaction = require('ethereumjs-tx');
const Wallet = require('ethereumjs-wallet');
const Web3 = require('web3');
const Web3Subprovider = require('web3-provider-engine/subproviders/web3');

// @flow

/**
 * @module constellate/src/ethereum
 */

let web3;

const rpcUrl = 'http://localhost:8545';

function compileSource(source: string): Promise<Object> {
  return new Promise((resolve, reject) => {
    web3.eth.compile.solidity(source, (err, compiled) => {
      if (err) return reject(err);
      resolve(compiled);
    });
  });
}

function deployContract(from: string, source: string): Promise<Object> {
  return new Promise((resolve, reject) => {
    compileSource(source).then((compiled) => {
      const contract = newContract(compiled);
      const data = compiled.code;
      web3.eth.estimateGas({ data }, (err, gas) => {
        if (err) return reject(err);
        contract.new({ data, from, gas }, (err, deployed) => {
          if (err) return reject(err);
          if (deployed.address) resolve(deployed);
        });
      });
    });
  });
}

function callContract(
  contract: Object, from: string, method: string,
  params: any[], to: string, value: number): Promise<any> {
  const instance = contract.at(to);
  value *= 1.0e18;
  return new Promise((resolve, reject) => {
    instance[method].estimateGas((err, gas) => {
      if (err) return reject(err);
      instance[method].call(...params, { from, gas, value }, (err, val) => {
        if (err) return reject(err);
        resolve(val);
      });
    });
  });
}

function getAccounts(): Promise<Object[]> {
  return new Promise((resolve, reject) => {
    web3.eth.getAccounts((err, addrs) => {
      if (err) return reject(err);
      const accounts = [];
      for (let i = 0; i < addrs.length; i++) {
        accounts.push({
          '@context': 'http://ethon.consensys.net/',
          '@type': 'Account',
          address: addrs[i]
        });
        resolve(accounts);
      }
    });
  });
}

function getBalanceAndNonce(addr: string): Promise<Object> {
  return new Promise((resolve, reject) => {
    web3.eth.getBalance(addr, (err, balance) => {
      if (err) return reject(err);
      web3.eth.getTransactionCount(addr, (err, nonce) => {
        if (err) return reject(err);
        balance /= 1.0e18;
        resolve({ balance, nonce });
      });
    });
  });
}

function getContractAccount(address: string): Promise<Object> {
  return new Promise((resolve, reject) => {
    web3.eth.getCode(address, (err, code) => {
      if (err) return reject(err);
      const accountCodeHash = Buffer.from(web3.sha3(code).slice(2), 'hex').toString('base64');
      resolve({
        '@context': 'http://ethon.consensys.net/',
        '@type': 'ContractAccount',
        accountCodeHash, address
      });
    });
  });
}

function getTransaction(hash: string): Promise<Object> {
  return new Promise((resolve, reject) => {
    web3.eth.getTransaction(hash, (err, tx) => {
      if (err) return reject(err);
      const obj : Object = {
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
        obj.msgPayload = tx.input;
      }
      if (tx.to !== '0x0') {
        obj.toAccount = {
          '@type': 'Account',
          address: tx.to
        }
      }
      const value = parseInt(tx.value);
      if (value) {
        obj.value = value;
      }
      resolve(obj);
    });
  });
}

function getTransactionReceipt(hash: string): Promise<Object> {
  return new Promise((resolve, reject) => {
    web3.eth.getTransactionReceipt(hash, (err, receipt) => {
      if (err) return reject(err);
      resolve(receipt);
    });
  });
}

function isEthereumAddress(addr: string): boolean {
  return new Web3().isAddress(addr);
}

function newContract(compiled: Object): Object {
  return web3.eth.contract(compiled.info.abiDefinition);
}

function newExternalAccount(address: string, mnemonic: string): Object {
  const hdkey = hdkeyFromMnemonic(mnemonic);
  const wallet = defaultWallet(hdkey);
  const accountPublicKey = wallet.getPublicKeyString();
  return {
    '@context': 'http://ethon.consensys.net/',
    '@type': 'ExternalAccount',
    accountPublicKey, address
  }
}

function newSignerProvider(input: string): Object {
  return new SignerProvider(rpcUrl, {
    accounts: (cb) => {
      const password = prompt('Please enter password', '');
      if (!password) {
        return cb(new Error('password required'));
      }
      const wallet = Wallet.fromV3(input, password);
      cb(null, [wallet.getAddressString()]);
    },
    signTransaction: (rawTx, cb) => {
      const password = prompt('Please enter password', '');
      if (!password) {
        return cb(new Error('password required'));
      }
      const wallet = Wallet.fromV3(input, password);
      cb(null, sign(rawTx, wallet.getPrivateKeyString()));
    }
  });
}

function sendEther(from: string, to: string, value: number): Promise<string> {
  value *= 1.0e18;
  return new Promise((resolve, reject) => {
    web3.eth.sendTransaction({ from, to, value }, (err, hash) => {
      if (err) return reject(err);
      resolve(hash);
    });
  });
}

function sendTransaction(
  contract: Object, from: string, method: string,
  params: any[], to: string, value: number): Promise<string> {
  const instance = contract.at(to);
  value *= 1.0e18;
  return new Promise((resolve, reject) => {
    return instance[method].estimateGas((err, gas) => {
      if (err) return reject(err);
      instance[method].sendTransaction(...params, { from, gas, value }, (err, hash) => {
        if (err) return reject(err);
        resolve(hash);
      });
    });
  });
}

function setWeb3Provider(provider: Object) {
  web3 = new Web3(provider);
}

function signData(addr: string, data: string): Promise<Object> {
  return new Promise((resolve, reject) => {
    web3.eth.sign(addr, web3.sha3(data), (err, sig) => {
      if (err) return reject(err);
      const r = '0x' + sig.slice(2, 66);
      const s = '0x' + sig.slice(66, 130);
      const v = parseInt(sig.slice(130, 132), 16) + 27;
      resolve({ r, s, v });
    });
  });
}

exports.callContract = callContract;
exports.compileSource = compileSource;
exports.deployContract = deployContract;
exports.getBalanceAndNonce = getBalanceAndNonce;
exports.getContractAccount = getContractAccount;
exports.getAccounts = getAccounts;
exports.getTransaction = getTransaction;
exports.getTransactionReceipt = getTransactionReceipt;
exports.isEthereumAddress = isEthereumAddress;
exports.newContract = newContract;
exports.newExternalAccount = newExternalAccount;
exports.newSignerProvider = newSignerProvider;
exports.sendEther = sendEther;
exports.sendTransaction = sendTransaction;
exports.setWeb3Provider = setWeb3Provider;
exports.signData = signData;

// The following code is adapted from http://truffleframework.com/tutorials/using-infura-custom-provider

const hdpath = "m/44'/60'/0'/0/";

function defaultWallet(hdkey: Object): Object {
  return getWallet(hdkey, 0);
}

function generateMnemonic(entropy?: string): string {
  if (!entropy) return bip39.generateMnemonic();
  return bip39.entropyToMnemonic(entropy);
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

exports.defaultWallet = defaultWallet;
exports.generateMnemonic = generateMnemonic;
exports.hdkeyFromMnemonic = hdkeyFromMnemonic;


/*

  The following code is adapted from https://github.com/ethereumjs/ethereumjs-wallet/blob/master/provider-engine.js

  -------------------------------- LICENSE --------------------------------

  The MIT License (MIT)

  Copyright (c) 2015 Alex Beregszaszi

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.

*/

function newProviderEngine(wallet: Object): Object {
  const engine = new ProviderEngine();
  engine.addProvider(new RpcSubprovider({ rpcUrl }));
  engine.addProvider(new HookedWalletTxSubprovider({
    getAccounts: function(cb) {
      cb(null, [wallet.getAddressString()]);
    },
    getPrivateKey: function(addr, cb) {
      if (addr !== wallet.getAddressString()) {
        return cb(new Error('Account not found'));
      }
      cb(null, wallet.getPrivateKey());
    }
  }));
  return engine;
}

exports.newProviderEngine = newProviderEngine;
