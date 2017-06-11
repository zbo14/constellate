'use strict';

const bip39 = require('bip39');
const HDKey = require('ethereumjs-wallet/HDKey');
const HookedWalletTxSubprovider = require('web3-provider-engine/subproviders/hooked-wallet-ethtx');
const ProviderEngine = require('web3-provider-engine');
const RpcSubprovider = require('web3-provider-engine/subproviders/rpc');
const {
    sign
} = require('ethjs-signer');
const SignerProvider = require('ethjs-provider-signer');
const Wallet = require('ethereumjs-wallet');
const Web3 = require('web3');
const Web3Subprovider = require('web3-provider-engine/subproviders/web3');

//      

/**
 * @module constellate/src/ethereum
 */

/*

  The following code is adapted from..
    > http://truffleframework.com/tutorials/using-infura-custom-provider
    > https://github.com/MetaMask/provider-engine/blob/master/test/wallet.js

*/

const hdpath = "m/44'/60'/0'/0/";

function defaultWallet(hdkey) {
    return getWallet(hdkey, 0);
}

function generateMnemonic(entropy) {
    if (!entropy) return bip39.generateMnemonic();
    return bip39.entropyToMnemonic(entropy);
}

function getWallet(hdkey, n) {
    return hdkey.derivePath(hdpath + n).getWallet();
}

function hdkeyFromMnemonic(mnemonic) {
    if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('invalid mnemonic');
    }
    return HDKey.fromMasterSeed(bip39.mnemonicToSeed(mnemonic));
}

exports.defaultWallet = defaultWallet;
exports.generateMnemonic = generateMnemonic;
exports.hdkeyFromMnemonic = hdkeyFromMnemonic;

const rpcUrl = 'http://localhost:8545';

let web3;

function compileSource(source) {
    return new Promise((resolve, reject) => {
        web3.eth.compile.solidity(source, (err, compiled) => {
            if (err) return reject(err);
            resolve(compiled);
        });
    });
}

function deployContract(from, source) {
    return new Promise((resolve, reject) => {
        compileSource(source).then((compiled) => {
            const contract = newContract(compiled);
            const data = compiled.code;
            web3.eth.estimateGas({
                data
            }, (err, gas) => {
                if (err) return reject(err);
                contract.new({
                    data,
                    from,
                    gas
                }, (err, deployed) => {
                    if (err) return reject(err);
                    if (deployed.address) resolve(deployed);
                });
            });
        });
    });
}

function newContract(compiled) {
    return web3.eth.contract(compiled.info.abiDefinition);
}

function callContract(
    contract, from, method,
    params, to, value) {
    const instance = contract.at(to);
    value *= 1.0e18;
    return new Promise((resolve, reject) => {
        instance[method].estimateGas((err, gas) => {
            if (err) return reject(err);
            instance[method].call(...params, {
                from,
                gas,
                value
            }, (err, val) => {
                if (err) return reject(err);
                resolve(val);
            });
        });
    });
}

function getAccountAddrs() {
    return new Promise((resolve, reject) => {
        web3.eth.getAccounts((err, addrs) => {
            if (err) return reject(err);
            resolve(addrs);
        });
    });
}

function getAccountDetails(addr) {
    return new Promise((resolve, reject) => {
        web3.eth.getBalance(addr, (err, balance) => {
            if (err) return reject(err);
            web3.eth.getTransactionCount(addr, (err, nonce) => {
                if (err) return reject(err);
                balance /= 1.0e18;
                resolve({
                    balance,
                    nonce
                });
            });
        });
    });
}

function getTransaction(hash) {
    return new Promise((resolve, reject) => {
        web3.eth.getTransaction(hash, (err, tx) => {
            if (err) return reject(err);
            resolve(tx);
        });
    });
}

function newSignerProvider(input) {
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
            cb(null, sign(rawTx, '0x' + wallet.getPrivateKey().toString('hex')));
        }
    });
}

function sendEther(from, to, value) {
    value *= 1.0e18;
    return new Promise((resolve, reject) => {
        web3.eth.sendTransaction({
            from,
            to,
            value
        }, (err, hash) => {
            if (err) return reject(err);
            resolve(hash);
        });
    });
}

function sendTransaction(
    contract, from, method,
    params, to, value) {
    const instance = contract.at(to);
    value *= 1.0e18;
    return new Promise((resolve, reject) => {
        return instance[method].estimateGas((err, gas) => {
            if (err) return reject(err);
            instance[method].sendTransaction(...params, {
                from,
                gas,
                value
            }, (err, hash) => {
                if (err) return reject(err);
                resolve(hash);
            });
        });
    });
}

function setWeb3Provider(provider) {
    web3 = new Web3(provider);
}

function signData(addr, data) {
    return new Promise((resolve, reject) => {
        web3.eth.sign(addr, web3.sha3(data), (err, sig) => {
            if (err) return reject(err);
            resolve(sig);
        });
    });
}

exports.callContract = callContract;
exports.compileSource = compileSource;
exports.deployContract = deployContract;
exports.getAccountAddrs = getAccountAddrs;
exports.getAccountDetails = getAccountDetails;
exports.getTransaction = getTransaction;
exports.newContract = newContract;
exports.newSignerProvider = newSignerProvider;
exports.sendEther = sendEther;
exports.sendTransaction = sendTransaction;
exports.setWeb3Provider = setWeb3Provider;
exports.signData = signData;

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

function newProviderEngine(wallet) {
    const engine = new ProviderEngine();
    engine.addProvider(new RpcSubprovider({
        rpcUrl
    }));
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