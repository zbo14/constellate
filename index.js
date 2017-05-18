const { encodeKeypair } = require('./lib/crypto.js');
const ed25519 = require('./lib/ed25519.js');
const FileSaver = require('file-saver');
const { generateForm, parseForm } = require('./lib/form.js');
const { generateFrames, readTags, writeTags } = require('./lib/id3.js');
const { encodeBase58, decodeBase58 } = require('./lib/util.js');

const {
  Create,
  License,
  ed25519Header,
  secp256k1Header,
  setClaimsId,
  signClaims,
  timestamp,
  validateClaims,
  verifyClaims
} = require('./lib/jwt.js');

const {
  Album,
  Audio,
  Composition,
  Recording,
  setMetaId,
  validateMeta
} = require('./lib/meta.js');

const {
  Artist,
  Organization,
  setAddr,
  validateParty
} = require('./lib/party.js');

const claims = document.getElementById('claims');
const audioFile = document.getElementById('audio-file');
const form = document.querySelector('form');
const meta = document.getElementById('meta');
const newKeypairBtn = document.getElementById('new-keypair-btn');
const ols = document.getElementsByTagName('ol');
const party = document.getElementById('party');
const readTagsBtn = document.getElementById('read-tags-btn');
const select = document.querySelector('select');
const sig = document.getElementById('sig');
const signClaimsBtn = document.getElementById('sign-claims-btn');
const submit = document.createElement('input');
submit.type = 'submit';
const writeTagsBtn = document.getElementById('write-tags-btn');
const verifySigBtn = document.getElementById('verify-sig-btn');

let claimsObj, metaObj, partyObj,
    schemaClaims, schemaMeta, schemaParty,
    mode, publicKey;

readTagsBtn.addEventListener('click', () => {
  readTags(audioFile, (tags) => {
    console.log(tags);
  });
}, false);

writeTagsBtn.addEventListener('click', () => {
  if (metaObj) {
    const frames = generateFrames(metaObj);
    // console.log(frames);
    writeTags(audioFile, frames, (writer) => {
      console.log(writer.getBlob());
      FileSaver.saveAs(writer.getBlob(), 'test.mp3');
    });
  }
}, false);

newKeypairBtn.addEventListener('click', () => {
  if (mode === 'party') {
    const password = prompt('Please enter a password to generate keypair', 'passwerd');
    if (!password) return;
    const keypair = ed25519.keypairFromPassword(password);
    publicKey = keypair.publicKey;
    party.textContent = JSON.stringify(encodeKeypair(keypair), null, 2);
  }
}, false);

signClaimsBtn.addEventListener('click', () => {
  if (mode === 'claims' && claimsObj && publicKey) {
    const secretKey = prompt('Please enter your secret key to sign claims', '');
    if (!secretKey) return;
    sig.innerHTML = encodeBase58(signClaims(claimsObj, ed25519Header(publicKey), decodeBase58(secretKey)));
  }
}, false);

verifySigBtn.addEventListener('click', () => {
  if (mode === 'claims'
      && claimsObj && metaObj && publicKey
      && schemaClaims && schemaMeta) {
    const signature = decodeBase58(sig.innerHTML);
    console.log(verifyClaims(claimsObj, ed25519Header(publicKey), metaObj, schemaClaims, schemaMeta, signature));
  }
}, false);

function listModifiers() {
  const lis = Array.from(document.getElementsByTagName('li')).map((li) => {
    return li.cloneNode(true);
  });
  Array.from(ols).forEach((ol, idx) => {
    const remover = document.createElement('button');
    remover.className = 'remover';
    remover.id = 'remover-' + idx;
    remover.textContent = '-';
    remover.addEventListener('click', (event) => {
      event.preventDefault();
      if (!ol.children.length) return;
      if (ol.hasAttribute('required')
          && ol.hasAttribute('minimum')
          && parseInt(ol.attributes.minimum.value) === ol.children.length) {
        const label = ol.previousElementSibling;
        alert(label.textContent + ' is required');
        return;
      }
      ol.removeChild(ol.lastChild);
    });
    form.insertBefore(remover, ol.parentElement);
    const adder = document.createElement('button');
    adder.className = 'adder';
    adder.id = 'adder-' + idx;
    adder.textContent = '+';
    adder.addEventListener('click', (event) => {
      event.preventDefault();
      ol.appendChild(lis[idx].cloneNode(true));
    });
    form.insertBefore(adder, remover);
  });
}

select.addEventListener('change', () => {
  form.innerHTML = null;
  mode = select.selectedOptions[0].parentNode.label;
  newKeypairBtn.hidden = true;
  signClaimsBtn.hidden = true;
  verifySigBtn.hidden = true;
  switch(select.value) {
    case 'artist':
      schemaParty = Artist;
      break;
    case 'organization':
      schemaParty = Organization;
      break;
    //------------------------------
    case 'album':
      schemaMeta = Album;
      break;
    case 'audio':
      schemaMeta = Audio;
      break;
    case 'composition':
      schemaMeta = Composition;
      break;
    case 'recording':
      schemaMeta = Recording;
      break;
    //------------------------------
    case 'create':
      schemaClaims = Create;
      break;
    case 'license':
      schemaClaims = License;
      break;
      //..
    default:
      console.error('unexpected type: ' + select.value);
      return;
  }
  if (mode === 'party') {
    generateForm(schemaParty).forEach((div) => form.appendChild(div));
    newKeypairBtn.hidden = false;
  }
  if (mode === 'meta') {
    generateForm(schemaMeta).forEach((div) => form.appendChild(div));
  }
  if (mode === 'claims') {
    generateForm(schemaClaims).forEach((div) => form.appendChild(div));
    signClaimsBtn.hidden = false;
    verifySigBtn.hidden = false;
  }
  form.appendChild(submit);
  listModifiers();
}, false);

function includeElement(elem, label) {
  switch (elem.nodeName) {
    case 'INPUT':
      if (!elem.value) return false;
      return true;
    case 'FIELDSET':
      if (!elem.children.length) return false;
      return Array.from(elem.children).map((div) => {
        if (!div.children.length) {
          if (!elem.hasAttribute('required')) return false;
          throw new Error(label.textContent + ' is required');
        }
        return includeElement(div.lastChild);
      }).every((bool) => bool);
    case 'OL':
      if (!elem.children.length) {
        if (!elem.hasAttribute('required')) return false;
        throw new Error(label.textContent + ' is required');
      }
      return Array.from(elem.children).map((li) => {
        if (!li.children.length) return false;
        return includeElement(li.firstChild);
      }).every((bool) => bool);
    case 'SELECT':
      return true;
    default:
      return false;
  }
}

form.addEventListener('submit', (event) => {
  try {
    event.preventDefault();
    const divs = Array.from(form.children).filter((div) => {
      return div.nodeName === 'DIV'
             && div.children.length === 2
             && includeElement(div.lastChild, div.firstChild);
    });
    if (mode === 'party') {
      partyObj = parseForm(divs);
      if (partyObj) {
        partyObj = setAddr(partyObj, publicKey);
        if (partyObj && validateParty(partyObj, publicKey, schemaParty)) {
          party.textContent = JSON.stringify(partyObj, null, 2);
          return;
        }
      }
    } else if (mode === 'meta') {
      metaObj = parseForm(divs);
      if (metaObj) {
        metaObj = setMetaId(metaObj);
        if (metaObj && validateMeta(metaObj, schemaMeta)) {
          meta.textContent = JSON.stringify(metaObj, null, 2);
          return;
        }
      }
    } else if (mode === 'claims') {
      claimsObj = parseForm(divs);
      if (claimsObj) {
        claimsObj = setClaimsId(timestamp(claimsObj));
        if (claimsObj && validateClaims(claimsObj, metaObj, schemaClaims, schemaMeta)) {
          claims.textContent = JSON.stringify(claimsObj, null, 2);
          return;
        }
      }
    } else {
      throw new Error('unexpected mode: ' + mode);
    }
  } catch(err) {
    console.error(err);
  }
  // party.textContent = null;
  // meta.textContent = null;
  // claims.textContent = null;
}, false);
