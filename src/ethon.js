'use strict';

const {
  Address,
  Context,
  DateTime,
  Draft,
  Link,
  WholeNumber
} = require('../lib/schema.js');

// @flow

/**
 * @module constellate/src/ethon
 */

const Account = {
  $schema: Draft,
  title: 'Account',
  type: 'object',
  properties: {
    '@context': {
      enum: ['http://ethon.consensys.net/'],
      readonly: true
    },
    '@type': {
      enum: ['Account'],
      readonly: true
    },
    address: Address
  },
  required: [
    '@context',
    '@type',
    'address'
  ]
}

const ContractAccount = {
  $schema: Draft,
  title: 'ContractAccount',
  type: 'object',
  properties: {
    '@context': {
      enum: ['http://ethon.consensys.net/'],
      readonly: true
    },
    '@type': {
      enum: ['ContractAccount'],
      readonly: true
    },
    accountCodeHash: {
      type: 'string',
      pattern: '^([A-Za-z0-9+/]{43}=)?$'
    },
    address: Address,
    refunds: Link
  },
  required: [
    '@context',
    '@type',
    'accountCodeHash',
    'address'
  ]
}

const ExternalAccount = {
  $schema: Draft,
  title: 'ExternalAccount',
  type: 'object',
  properties: {
    '@context': {
      enum: ['http://ethon.consensys.net/'],
      readonly: true
    },
    '@type': {
      enum: ['ExternalAccount'],
      readonly: true
    },
    accountPublicKey: {
      type: 'string',
      pattern: '^0x[A-Fa-f0-9]{128}$'
    },
    address: Address
  },
  required: [
    '@context',
    '@type',
    'address',
    'accountPublicKey'
  ]
}

const Tx = {
  $schema: Draft,
  title: 'Tx',
  type: 'object',
  properties: {
    '@context': {
      enum: ['http://ethon.consensys.net/'],
      readonly: true
    },
    '@type': {
      enum: ['Tx'],
      readonly: true
    },
    from: {
      type: 'object',
      properties: {
        '@type': {
          enum: ['Account'],
          readonly: true
        },
        address: Address
      }
    },
    msgGasPrice: WholeNumber,
    msgPayload: {
      type: 'string',
      pattern: '^0x[A-Fa-f0-9]+$'
    },
    to: {
      type: 'object',
      properties: {
        '@type': {
          enum: ['Account'],
          readonly: true
        },
        address: Address
      }
    },
    txGasUsed: WholeNumber,
    txHash: {
      type: 'string',
      pattern: '0x[A-Fa-f0-9]{64}'
    },
    txNonce: WholeNumber,
    value: WholeNumber
  },
  required: [
    '@context',
    '@type',
    'txHash'
  ]
}

exports.Account = Account;
exports.ContractAccount = ContractAccount;
exports.ExternalAccount = ExternalAccount;
exports.Tx = Tx;
