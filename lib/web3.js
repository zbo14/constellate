'use strict'

const Web3 = require('web3')

const {
    order
} = require('../lib/util')

//      

/**
 * @module constellate/src/web3
 */

module.exports = function(provider) {

    const web3 = new Web3(provider)

    this.callContract = (
        contract, from, method, params,
        to, value, tasks, t, i) => {
        const instance = contract.at(to)
        value *= 1.0e18
        instance[method].estimateGas((err, gas) => {
            if (err) {
                return tasks.error(err)
            }
            instance[method].call(...params, {
                from,
                gas,
                value
            }, (err, val) => {
                if (err) {
                    return tasks.error(err)
                }
                tasks.run(t, val, i)
            })
        })
    }

    this.deployContract = (contract, from, tasks, t, i) => {
        const data = contract.code
        web3.eth.estimateGas({
            data
        }, (err, gas) => {
            if (err) {
                return tasks.error(err)
            }
            contract.new({
                data,
                from,
                gas
            }, (err, deployed) => {
                if (err) {
                    return tasks.error(err)
                }
                if (deployed.address) {
                    tasks.run(t, deployed, i)
                }
            })
        })
    }

    this.getAccounts = (tasks, t, i) => {
        web3.eth.getAccounts((err, accounts) => {
            if (err) {
                return tasks.error(err)
            }
            tasks.run(t, accounts, i)
        })
    }

    this.getAccountStatus = (address, tasks, t, i) => {
        web3.eth.getBalance(address, (err, balance) => {
            if (err) {
                return tasks.error(err)
            }
            web3.eth.getTransactionCount(address, (err, nonce) => {
                if (err) {
                    return tasks.error(err)
                }
                balance /= 1.0e18
                tasks.run(t, balance, nonce, i)
            })
        })
    }

    this.getBlock = (argv, tasks, t, i) => {
        web3.eth.getBlock(argv, (err, block) => {
            if (err) {
                return tasks.error(err)
            }
            tasks.run(t, order(block), i)
        })
    }

    this.getContractCode = (address, tasks, t, i) => {
        web3.eth.getCode(address, (err, code) => {
            if (err) {
                return tasks.error(err)
            }
            tasks.run(t, code, i)
        })
    }

    this.getTransaction = (hash, tasks, t, i) => {
        web3.eth.getTransaction(hash, (err, tx) => {
            if (err) {
                return tasks.error(err)
            }
            tasks.run(t, order(tx), i)
        })
    }

    this.getTransactionReceipt = (hash, tasks, t, i) => {
        web3.eth.getTransactionReceipt(hash, (err, receipt) => {
            if (err) {
                return tasks.error(err)
            }
            tasks.run(t, order(receipt), i)
        })
    }

    this.newContract = (source, tasks, t, i) => {
        web3.eth.compile.solidity(source, (err, compiled) => {
            if (err) {
                return tasks.error(err)
            }
            const contract = web3.eth.contract(compiled.info.abiDefinition)
            contract.code = compiled.code
            tasks.run(t, contract, i)
        })
    }

    this.sendEther = (from, to, value, tasks, t, i) => {
        value *= 1.0e18
        web3.eth.sendTransaction({
            from,
            to,
            value
        }, (err, hash) => {
            if (err) {
                return tasks.error(err)
            }
            tasks.run(t, hash, i)
        })
    }

    this.sendTransaction = (
        contract, from, method, params,
        to, value, tasks, t, i) => {
        const instance = contract.at(to)
        value *= 1.0e18
        return instance[method].estimateGas((err, gas) => {
            if (err) {
                return tasks.error(err)
            }
            instance[method].sendTransaction(...params, {
                from,
                gas,
                value
            }, (err, hash) => {
                if (err) {
                    return tasks.error(err)
                }
                tasks.run(t, hash, i)
            })
        })
    }

    this.signData = (address, data, tasks, t, i) => {
        web3.eth.sign(address, new Web3().sha3(data), (err, sig) => {
            if (err) {
                return tasks.error(err)
            }
            const r = '0x' + sig.slice(2, 66)
            const s = '0x' + sig.slice(66, 130)
            const v = parseInt(sig.slice(130, 132), 16) + 27
            tasks.run(t, {
                r,
                s,
                v
            }, i)
        })
    }
}