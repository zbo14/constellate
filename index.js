const net = require('./lib/net.js');
const util = require('./lib/util.js');
const schema = require('./lib/schema.js');
const spec = require('./lib/spec.js');

/*
net.httpFetch('https://jsonplaceholder.typicode.com/posts', null, (body) => {
  console.log(JSON.stringify(body));
});

net.httpFetch('http://requestb.in/######', {
  body: JSON.stringify({'a': 1, 'b': {'c': 2, 'd': 3}}),
  method: 'post',
  mode: 'no-cors'
});
*/

const composer = spec.newUser(
  'composer@email.com', '000000012150090X',
  'composer', null, 'http://www.composer.com'
);

const lyricist = spec.newUser(
  'lyricist@email.com', '000000012250078X',
  'lyricist', null, 'http://www.lyricist.com'
);

let composition = spec.newComposition(
  composer, null, lyricist, null,
  null, 'trap boogie', 'http://www.composition.com'
);

const performer = spec.newUser(
  'performer@email.com', null,
  'performer', null, 'http://www.performer.com'
);

const producer = spec.newUser(
  'producer@email.com', '001006501215004X',
  'producer', null, 'http://www.producer.com'
);

const recordLabel = spec.newUser(
  'recordLabel@email.com', null, 'recordLabel',
  null, 'http://www.record-label.com'
);

const recording = spec.newRecording(
  null, performer, producer,
  composition, recordLabel, 'http://www.recording.com'
);

composition = spec.addCompositionValue(composition, 'recordedAs', recording)

console.log(composition, recording);

// let parser = new DOMParser();
// let doc = parser.parseFromString(spec.generateForm(schema.composition), 'text/html');
console.log(spec.generateForm(schema.composition));

window.user_schema = util.clone(schema.user);
window.composition_schema = util.clone(schema.composition);
window.recording_schema = util.clone(schema.recording);

/*
let select = document.getElementsByTagName('select')[0];
let submit = document.getElementById('submit');

submit.addEventListener('click', () => {
  let inputs = Array.from(document.getElementsByTagName('input'));
  let labels = Array.from(document.getElementsByTagName('label'));
  switch(select.value) {
    case 'user':
      const user = spec.newUser(...inputs.map((input) => input.value).slice(1));
      try {
        spec.validateUser(user);
      } catch(err) {
        console.error(err.message);
        return;
      }
      break;
    case 'composition':


    let ids = inputs.filter((input) => input.schema.match(/^\$\..*?\[\#\].id$/)).slice(1);
    let urls = inputs.filter((input) => input.schema.match(/^\$\..*?\[\#\].url$/)).slice(1);
    console.log(ids, urls);
    let headers = spec.zip(ids, urls).map(([id, url]) => spec.newHeader(id.value, url.value));
    console.log(headers);
      const composition = spec.newComposition(...inputs.map((input) => input.value).slice(1));
      try {
        spec.validateComposition(composition);
      } catch(err) {
        console.error(err.message);
        return;
      }
      break;
    case 'recording':
      const recording = spec.newRecording(...inputs.map((input) => input.value).slice(1));
      try {
        spec.validateRecording(recording);
      } catch(err) {
        console.error(err.message);
        return;
      }
      break;
    default:
      console.error(`unexpected type: ${select.value}`);
      return;
  }
  console.log(`Valid ${select.value}!`);
});

submit.addEventListener('click', () => {
  let err, i, model, property;
  let inputs = document.getElementsByTagName('input');
  let labels = document.getElementsByTagName('label');
  switch(select.value) {
    case 'header':
      model = Object.create(Header.prototype);
      break;
    case 'composition':
      model = Object.create(Composition.prototype);
      break;
    case 'recording':
      model = Object.create(Recording.prototype);
      break;
  }
  for (i = 0; i < inputs.length; i++) {
    model[labels[i].textContent.match(/^(.*?):/)[1]] = inputs[i].value;
  }
  err = model.validate();
  if (err != null) {
    console.error(err);
    return;
  }
  console.log(model);
});

// CUSTOM ELEMENT

class Constellation extends HTMLElement {
  constructor(hasHeader) {
    super();
    this.setAttribute('class', hasHeader.class);
    this.setAttribute('id', hasHeader.id);
    this.innerHTML = util.orderStringify(hasHeader);
    this.setAttribute('name', hasHeader.name);
  }
}

Constellation.prototype.parse = function() {
  let model;
  switch (this.getAttribute('class')) {
    case 'composition':
    model = Object.create(Composition.prototype);
    break;
    case 'recording':
    model = Object.create(Recording.prototype);
    break;
    case 'user':
    default:
      return null;
  }
  let data = JSON.parse(this.innerHTML);
  for (prop in data) {
    model[prop] = data[prop];
  }
  if (model.validate()) {
    return model;
  }
  return null;
}

window.customElements.define('c-stellar', Constellation);

const constellation = new Constellation(recording);
document.body.appendChild(constellation);
console.log(constellation.parse());

*/
