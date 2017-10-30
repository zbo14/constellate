'use strict';

var MetadataService = require('./metadata-service');
var ContentService = require('./content-service');
var ContentServiceBrowser = require('./content-service/browser');

module.exports = {
  MetadataService: MetadataService,
  ContentService: ContentService,
  ContentServiceBrowser: ContentServiceBrowser
};