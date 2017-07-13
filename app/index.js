'use strict';

const React = require('react');
const { render } = require('react-dom');
const { Provider } = require('react-redux');
const { createStore } = require('redux');

const Project = require('./components/Project');
const reducer = require('./reducer');

const store = createStore(reducer);

render(
  <Provider store={store}>
    <Project />
  </Provider>,
  document.getElementById('root')
);
