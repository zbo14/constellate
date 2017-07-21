'use strict';

const Web3 = require('web3');

const {
  order
} = require('../lib/util.js');

// @flow

/**
 * @module constellate/src/web3
 */

module.exports = function(provider: Object) {

  const web3 = new Web3(provider);

  this.callContract = (
    contract: Object, from: string, method: string, params: any[],
    to: string, value: number, t: Object, id?: number|string) => {
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

  this.deployContract = (contract: Object, from: string, t: Object, id?: number|string) => {
    const data = contract.code;
    web3.eth.estimateGas({ data }, (err, gas) => {
      if (err) return t.error(err);
      contract.new({ data, from, gas }, (err, deployed) => {
        if (err) return t.error(err);
        if (deployed.address) t.run(deployed, id);
      });
    });
  }

  this.getAccounts = (t: Object, id?: number|string) => {
    web3.eth.getAccounts((err, accounts) => {
      if (err) return t.error(err);
      t.run(accounts, id);
    });
  }

  this.getAccountStatus = (address: string, t: Object, id?: number|string) => {
    web3.eth.getBalance(address, (err, balance) => {
      if (err) return t.error(err);
        web3.eth.getTransactionCount(address, (err, nonce) => {
        if (err) return t.error(err);
        balance /= 1.0e18;
        t.run(balance, nonce, id);
      });
    });
  }

  this.getBlock = (argv: number|string, t: Object, id?: number|string) => {
    web3.eth.getBlock(argv, (err, block) => {
      if (err) return t.error(err);
      t.run(order(block), id);
    });
  }

  this.getContractCode = (address: string, t: Object, id?: number|string) => {
    web3.eth.getCode(address, (err, code) => {
      if (err) return t.error(err);
      t.run(code, id)
    });
  }

  this.getTransaction = (hash: string, t: Object, id?: number|string) => {
    web3.eth.getTransaction(hash, (err, tx) => {
      if (err) return t.error(err);
      t.run(order(tx), id);
    });
  }

  this.getTransactionReceipt = (hash: string, t: Object, id?:number|string) => {
    web3.eth.getTransactionReceipt(hash, (err, receipt) => {
      if (err) return t.error(err);
      t.run(order(receipt), id);
    });
  }

  this.newContract = (source: string, t: Object, id?: number|string) => {
    web3.eth.compile.solidity(source, (err, compiled) => {
      if (err) return t.error(err);
      const contract = web3.eth.contract(compiled.info.abiDefinition);
      contract.code = compiled.code;
      t.run(contract, id);
    });
  }

  this.sendEther = (from: string, to: string, value: number, t: Object, id?: number|string)  => {
    value *= 1.0e18;
    web3.eth.sendTransaction({ from, to, value }, (err, hash) => {
      if (err) return t.error(err);
      t.run(hash, id)
    });
  }

  this.sendTransaction = (
    contract: Object, from: string, method: string, params: any[],
    to: string, value: number, t: Object, id?: number|string) => {
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

  this.signData = (address: string, data: string, t: Object, id?: number|string) => {
    web3.eth.sign(address, new Web3().sha3(data), (err, sig) => {
      if (err) return t.error(err);
      const r = '0x' + sig.slice(2, 66);
      const s = '0x' + sig.slice(66, 130);
      const v = parseInt(sig.slice(130, 132), 16) + 27;
      t.run({ r, s, v }, id);
    });
  }
}
