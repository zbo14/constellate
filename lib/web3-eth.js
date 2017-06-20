'use strict';

const bip39 = require('bip39');
const HDKey = require('ethereumjs-wallet/HDKey');
const Web3 = require('web3');

//      

/**
 * @module constellate/src/web3-eth
 */

module.exports = function Web3Eth(provider) {
    this.web3 = new Web3(provider);
    this.callContract = callContract;
    this.deployContract = _deployContract(this.web3);
    this.getAccounts = _getAccounts(this.web3);
    this.getAccountStatus = _getAccountStatus(this.web3);
    this.getBlock = _getBlock(this.web3);
    this.getContractAccount = _getContractAccount(this.web3);
    this.getTransaction = _getTransaction(this.web3);
    this.getTransactionReceipt = _getTransactionReceipt(this.web3);
    this.newContract = _newContract(this.web3);
    this.newExternalAccount = newExternalAccount;
    this.sendEther = _sendEther(this.web3);
    this.sendTransaction = sendTransaction;
    this.signData = _signData(this.web3)
}

function callContract(
    contract, from, method, to,
    value, ...params) {
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

function _deployContract(web3) {
    return (contract, from) => {
        return new Promise((resolve, reject) => {
            const data = contract.code;
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
    }
}

function _getAccounts(web3) {
    return () => {
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
}

function _getAccountStatus(web3) {
    return (address) => {
        return new Promise((resolve, reject) => {
            web3.eth.getBalance(address, (err, balance) => {
                if (err) return reject(err);
                web3.eth.getTransactionCount(address, (err, nonce) => {
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
}

function _getBlock(web3) {
    return (argv) => {
        return new Promise((resolve, reject) => {
            web3.eth.getBlock(argv, (err, block) => {
                if (err) return reject(err);
                const instance = {
                    '@context': 'http://ethon.consensys.net/',
                    '@type': 'Block',
                    blockCreationTime: new Date(block.timestamp * 1000).toISOString(),
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
                        return {
                            '@type': 'Tx',
                            txHash
                        };
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
                        return {
                            '@type': 'Block',
                            blockHash
                        };
                    });
                }
                resolve(instance);
            });
        });
    }
}

function _getContractAccount(web3) {
    return (address) => {
        return new Promise((resolve, reject) => {
            web3.eth.getCode(address, (err, code) => {
                if (err) return reject(err);
                const accountCodeHash = Buffer.from(web3.sha3(code).slice(2), 'hex').toString('base64');
                resolve({
                    '@context': 'http://ethon.consensys.net/',
                    '@type': 'ContractAccount',
                    accountCodeHash,
                    address
                });
            });
        });
    }
}

function _getTransaction(web3) {
    return (hash) => {
        return new Promise((resolve, reject) => {
            web3.eth.getTransaction(hash, (err, tx) => {
                if (err) return reject(err);
                const instance = {
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
                resolve(instance);
            });
        });
    }
}

function _getTransactionReceipt(web3) {
    return (hash) => {
        return new Promise((resolve, reject) => {
            web3.eth.getTransactionReceipt(hash, (err, receipt) => {
                if (err) return reject(err);
                resolve(receipt);
            });
        });
    }
}

function _newContract(web3) {
    return (source) => {
        return new Promise((resolve, reject) => {
            web3.eth.compile.solidity(source, (err, compiled) => {
                if (err) return reject(err);
                const contract = web3.eth.contract(compiled.info.abiDefinition);
                console.log(contract, compiled);
                contract.code = compiled.code;
                resolve(contract);
            });
        });
    }
}

function newExternalAccount(address, mnemonic) {
    const hdkey = hdkeyFromMnemonic(mnemonic);
    const wallet = defaultWallet(hdkey);
    const accountPublicKey = wallet.getPublicKeyString();
    return {
        '@context': 'http://ethon.consensys.net/',
        '@type': 'ExternalAccount',
        accountPublicKey,
        address
    }
}

function _sendEther(web3) {
    return (from, to, value) => {
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
}

function sendTransaction(
    contract, from, method, to,
    value, ...params) {
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

function _signData(web3) {
    return (address, data) => {
        return new Promise((resolve, reject) => {
            web3.eth.sign(address, new Web3().sha3(data), (err, sig) => {
                if (err) return reject(err);
                const r = '0x' + sig.slice(2, 66);
                const s = '0x' + sig.slice(66, 130);
                const v = parseInt(sig.slice(130, 132), 16) + 27;
                resolve({
                    r,
                    s,
                    v
                });
            });
        });
    }
}

// The following code is adapted from http://truffleframework.com/tutorials/using-infura-custom-provider

const hdpath = "m/44'/60'/0'/0/";

function defaultWallet(hdkey) {
    return getWallet(hdkey, 0);
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