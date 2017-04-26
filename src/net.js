'use strict';

const fetch = require('node-fetch');
const request = require('request');

// @flow

/**
* @module constellate/src/net
*/

function httpFetch(url: string, options: ?Object, callback: Function) {
  fetch(url, options)
    .then(function(res) {
      if (res.ok) { return res.text(); };
      throw new Error(`Request failed.\n
                       StatusCode: ${res.status}`);
    }).then(function(body) {
      callback(body);
    }).catch(function(err) {
      console.error(err.message);
    });
}

function httpRequest(options: Object, callback: Function) {
  // options should include url
  request(options, (err, res, body) => {
    if (err == null && res.statusCode !== 200) {
      err = new Error(`Request failed.\n
                       StatusCode: ${res.statusCode}`);
    }
    if (err != null) {
      console.error(err);
      return;
    }
    callback(body);
  });
}

exports.httpFetch = httpFetch;
exports.httpRequest = httpRequest;
