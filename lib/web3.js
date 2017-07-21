'use strict';

const Web3 = require('web3');

const {
    order
} = require('../lib/util.js');

//      

/**
 * @module constellate/src/web3
 */

module.exports = function(provider) {

    const web3 = new Web3(provider);

    this.callContract = (
        contract, from, method, params,
        to, value, t, id) => {
        const instance = contract.at(to);
        value *= 1.0e18;
        instance[method].estimateGas((err, gas) => {
            if (err) return t.error(err);
            instance[method].call(...params, {
                from,
                gas,
                value
            }, (err, val) => {
                if (err) return t.error(err);
                t.run(val, id);
            });
        });
    }

    this.deployContract = (contract, from, t, id) => {
        const data = contract.code;
        web3.eth.estimateGas({
            data
        }, (err, gas) => {
            if (err) return t.error(err);
            contract.new({
                data,
                from,
                gas
            }, (err, deployed) => {
                if (err) return t.error(err);
                if (deployed.address) t.run(deployed, id);
            });
        });
    }

    this.getAccounts = (t, id) => {
        web3.eth.getAccounts((err, accounts) => {
            if (err) return t.error(err);
            t.run(accounts, id);
        });
    }

    this.getAccountStatus = (address, t, id) => {
        web3.eth.getBalance(address, (err, balance) => {
            if (err) return t.error(err);
            web3.eth.getTransactionCount(address, (err, nonce) => {
                if (err) return t.error(err);
                balance /= 1.0e18;
                t.run(balance, nonce, id);
            });
        });
    }

    this.getBlock = (argv, t, id) => {
        web3.eth.getBlock(argv, (err, block) => {
            if (err) return t.error(err);
            t.run(order(block), id);
        });
    }

    this.getContractCode = (address, t, id) => {
        web3.eth.getCode(address, (err, code) => {
            if (err) return t.error(err);
            t.run(code, id)
        });
    }

    this.getTransaction = (hash, t, id) => {
        web3.eth.getTransaction(hash, (err, tx) => {
            if (err) return t.error(err);
            t.run(order(tx), id);
        });
    }

    this.getTransactionReceipt = (hash, t, id) => {
        web3.eth.getTransactionReceipt(hash, (err, receipt) => {
            if (err) return t.error(err);
            t.run(order(receipt), id);
        });
    }

    this.newContract = (source, t, id) => {
        web3.eth.compile.solidity(source, (err, compiled) => {
            if (err) return t.error(err);
            const contract = web3.eth.contract(compiled.info.abiDefinition);
            contract.code = compiled.code;
            t.run(contract, id);
        });
    }

    this.sendEther = (from, to, value, t, id) => {
        value *= 1.0e18;
        web3.eth.sendTransaction({
            from,
            to,
            value
        }, (err, hash) => {
            if (err) return t.error(err);
            t.run(hash, id)
        });
    }

    this.sendTransaction = (
        contract, from, method, params,
        to, value, t, id) => {
        const instance = contract.at(to);
        value *= 1.0e18;
        return instance[method].estimateGas((err, gas) => {
            if (err) return t.error(err);
            instance[method].sendTransaction(...params, {
                from,
                gas,
                value
            }, (err, hash) => {
                if (err) return t.error(err);
                t.run(hash, id);
            });
        });
    }

    this.signData = (address, data, t, id) => {
        web3.eth.sign(address, new Web3().sha3(data), (err, sig) => {
            if (err) return t.error(err);
            const r = '0x' + sig.slice(2, 66);
            const s = '0x' + sig.slice(66, 130);
            const v = parseInt(sig.slice(130, 132), 16) + 27;
            t.run({
                r,
                s,
                v
            }, id);
        });
    }
}