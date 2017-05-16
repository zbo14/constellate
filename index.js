const crypto = require('./lib/crypto.js');
const { generateForm, parseForm } = require('./lib/form.js');
const jwt = require('./lib/jwt.js');
const meta = require('./lib/meta.js');
const { encodeBase64, decodeBase64 } = require('./lib/util.js');

const claims = document.getElementById('claims');
const form = document.querySelector('form');
const _meta = document.getElementById('meta');
const newKeypairBtn = document.getElementById('new-keypair-btn');
const ols = document.getElementsByTagName('ol');
const select = document.querySelector('select');
const sig = document.getElementById('sig');
const signClaimsBtn = document.getElementById('sign-claims-btn');
const submit = document.createElement('input');
submit.type = 'submit';
const verifySigBtn = document.getElementById('verify-sig-btn');

let claimsObj, metaObj, mode, publicKey, schema;

newKeypairBtn.addEventListener('click', () => {
  if (mode === 'meta') {
    const password = prompt('Please enter a password to generate keypair', 'passwerd');
    const keypair = crypto.keypairFromPassword(password);
    publicKey = keypair.publicKey;
    _meta.textContent = JSON.stringify(crypto.encodeKeypair(keypair), null, 2);
  }
}, false);

signClaimsBtn.addEventListener('click', () => {
  if (mode === 'claims' && claimsObj) {
    const secretKey = prompt('Please enter your secret key to sign claims', '');
    sig.innerHTML = encodeBase64(jwt.sign(claimsObj, decodeBase64(secretKey)));
  }
}, false);

verifySigBtn.addEventListener('click', () => {
  if (mode === 'claims' && claimsObj && schema) {
    const signature = decodeBase64(sig.innerHTML);
    console.log(jwt.verify(claimsObj, schema, signature));
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
    })
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
    case 'album':
      schema = meta.Album;
      break;
    case 'artist':
      schema = meta.Artist;
      newKeypairBtn.hidden = false;
      break;
    case 'audio':
      schema = meta.Audio;
      break;
    case 'composition':
      schema = meta.Composition;
      break;
    case 'organization':
      schema = meta.Organization;
      newKeypairBtn.hidden = false;
      break;
    case 'recording':
      schema = meta.Recording;
      break;
    //------------------------------
    case 'compose':
      schema = jwt.Compose;
      break;
    case 'license':
      schema = jwt.License;
      break;
    case 'record':
      schema = jwt.Record;
      break;
    default:
      console.error('unexpected type: ' + select.value);
      return;
  }
  if (mode === 'claims') {
    signClaimsBtn.hidden = false;
    verifySigBtn.hidden = false;
  }
  generateForm(schema).forEach((div) => form.appendChild(div));
  form.appendChild(submit);
  listModifiers();
}, false);

function includeElement(elem, label) {
  switch (elem.nodeName) {
    case 'INPUT':
      if (!elem.value) return false;
      return true;
    case 'FIELDSET':
      if (!elem.children.length) {
        return false;
      }
      return Array.from(elem.children).map((div) => {
        if (!div.children.length) {
          if (!elem.hasAttribute('required')) {
            return false;
          }
          throw new Error(label.textContent + ' is required');
        }
        return includeElement(div.lastChild);
      }).every((bool) => bool);
    case 'OL':
      if (!elem.children.length) {
        if (!elem.hasAttribute('required')) {
          return false;
        }
        throw new Error(label.textContent + ' is required');
      }
      return Array.from(elem.children).map((li) => {
        if (!li.children.length) {
          return false;
        }
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
    if (mode === 'meta') {
      metaObj = parseForm(divs);
      if (metaObj) {
        if (select.value !== 'artist' && select.value !== 'organization') {
          publicKey = null;
        } else if (!publicKey || publicKey.length !== 32) {
          throw new Error(`invalid public key: ${publicKey}`);
        }
        metaObj = meta.setId(metaObj, publicKey)
        if (meta.validate(metaObj, schema, publicKey)) {
          _meta.textContent = JSON.stringify(metaObj, null, 2);
          return;
        }
      }
    } else if (mode === 'claims') {
      claimsObj = parseForm(divs);
      if (claimsObj) {
        claimsObj = jwt.setTimestamp(claimsObj);
        if (jwt.validate(claimsObj, schema)) {
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
  // _meta.textContent = null;
  // claims.textContent = null;
}, false);
