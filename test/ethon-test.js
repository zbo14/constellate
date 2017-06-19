import { assert } from 'chai';
import { describe, it } from 'mocha';
import { readFileSync } from 'fs';
import { validateSchema } from '../lib/schema.js';

import {
  ContractAccount,
  ExternalAccount
} from '../lib/ethon.js';

const contractAccount = JSON.parse(readFileSync(__dirname + '/ethon/contract-account.json'));
const externalAccount = JSON.parse(readFileSync(__dirname + '/ethon/external-account.json'));

describe('EthOn', () => {
  it('validates ContractAccount schema', () => {
    assert.isNull(
      validateSchema(contractAccount, ContractAccount),
      'should validate ContractAccount schema'
    );
  });
  it('validates ExternalAccount schema', () => {
    assert.isNull(
      validateSchema(externalAccount, ExternalAccount),
      'should validate ExternalAccount schema'
    );
  });
});
