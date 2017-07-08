'use strict';

const fileType = require('file-type');
const fpcalc = require('fpcalc');
const fs = require('fs');
const http = require('http');

//      

/**
 * @module constellate/src/fingerprint-server.js
 */

module.exports = function() {
    const server = http.createServer((req, res) => {
        console.log(req);
        res.setHeader('Content-Type', 'text/plain');
        const chunks = [];
        req.on('data', chunk => {
            chunks.push(chunk);
        });
        req.on('error', err => {
            res.writeHead(500);
            res.end(err.message);
        })
        req.on('end', () => {
            console.log(typeof chunks[0]);
            const data = Buffer.from(chunks.join(''), 'binary');
            console.log(typeof data, data.length);
            // const { ext, _ } = fileType(data);
            const filepath = '/tmp/' + Date.now() / 1000; // + '.' + ext;
            fs.writeFile(filepath, data, err => {
                if (err) {
                    res.writeHead(500);
                    res.end(err.message);
                }
                fpcalc(filepath, (err, result) => {
                    if (err) {
                        res.writeHead(500);
                        res.end(err.message);
                    }
                    res.writeHead(200);
                    res.end(result.fingerprint);
                });
            });
        });
    });
    this.listen = (port) => server.listen(port);
}