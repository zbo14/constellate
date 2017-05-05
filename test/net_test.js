import { httpFetch } from '../lib/net.js';

net.httpFetch('https://jsonplaceholder.typicode.com/posts', null, (body) => {
  console.log(JSON.stringify(body));
});

net.httpFetch('http://requestb.in/######', {
  body: JSON.stringify({'a': 1, 'b': {'c': 2, 'd': 3}}),
  method: 'post',
  mode: 'no-cors'
});
