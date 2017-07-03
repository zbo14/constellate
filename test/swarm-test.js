const SwarmNode = require('../lib/swarm-node.js');

const swarm = new SwarmNode();

const password = 'passwerd';

/*

// PRIVATE

swarm.initPrivate(password).then(obj => {
  console.log(JSON.stringify(obj, null, 2));
});

const bzzkeys = [
    "12d75b9c960bce13d9c2d1c5f042429077676845",
    "47c3d0f2dae2b64c64b9b067adb96f3262e5e995",
    "200c6beb53b757913db7a135ffda3ed66d2b8170",
    "82c0bd6ac04c9d48a035a286341ec6be1f27409f",
    "c485b9391091e2450d58623412b1a97e1090e46f",
    "800e3db9e4a9646303e5679b2d7c6270361f303a",
    "b810b0686a16854843eea91c0222e4738d634466",
    "c12940c939312f27771f957804668a2503f77414",
    "bbc1c30192684dd6dfe7c871fba4290a988303d1",
    "8af196a7cebc0f1f5da50d5e5a7857e7675d9cec"
  ];

const datadir = "/tmp/BZZ/1499110865";

swarm.runPrivate(bzzkeys, datadir, password).then(console.log);

swarm.upload(__dirname + '/test.mp3').then(console.log);

/*

// TESTNET

swarm.initTestnet(password).then(obj => {
  console.log(JSON.stringify(obj, null, 2));
});

const bzzkey = '0510af7a784b05b5f4981b82319ba435ffb21a3e';

const datadir = '/tmp/BZZ/1499109632';

swarm.runTestnet(bzzkey, datadir, password).then(console.log);

*/
