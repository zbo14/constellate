'use strict';

exports.clone = function (x) {
  return JSON.parse(JSON.stringify(x));
};

// adapted from https://stackoverflow.com/questions/16167581/sort-object-properties-and-json-stringify#comment73545624_40646557

exports.orderStringify = function (x, space) {
  var keys = [];
  JSON.stringify(x, function (k, v) {
    keys.push(k);
    if (v instanceof Array) {
      v.sort(exports.sort);
    }
    return v;
  });
  return JSON.stringify(x, keys.sort(), space);
};

exports.order = function (x) {
  return JSON.parse(exports.orderStringify(x));
};

exports.sort = function (x, y) {
  var i = void 0;
  if (x instanceof Array && y instanceof Array) {
    x.sort(exports.sort);
    y.sort(exports.sort);
    var result = void 0;
    for (i = 0; i < x.length && i < y.length; i++) {
      result = exports.sort(x[i], y[i]);
      if (result) {
        return result;
      }
    }
    return 0;
  }
  if (x.constructor === Object && y.constructor === Object) {
    var xkeys = Object.keys(x).sort();
    var ykeys = Object.keys(y).sort();
    for (i = 0; i < xkeys.length && i < ykeys.length; i++) {
      if (xkeys[i] < ykeys[i]) {
        return -1;
      }
      if (xkeys[i] > ykeys[i]) {
        return 1;
      }
    }
    if (xkeys.length < ykeys.length) {
      return -1;
    }
    if (xkeys.length > ykeys.length) {
      return 1;
    }
    for (i = 0; i < xkeys.length && i < ykeys.length; i++) {
      if (x[xkeys[i]] < y[ykeys[i]]) {
        return -1;
      }
      if (x[xkeys[i]] > y[ykeys[i]]) {
        return 1;
      }
    }
    return 0;
  }
  if (x < y) {
    return -1;
  }
  if (x > y) {
    return 1;
  }
  return 0;
};

var transform = function transform(val, fn) {
  val = fn(val);
  if (val instanceof Array) {
    return val.map(function (v) {
      return transform(v, fn);
    });
  } else if (val.constructor === Object) {
    return Object.keys(val).reduce(function (result, key) {
      result[key] = transform(val[key], fn);
      return result;
    }, {});
  }
  return val;
};

exports.transform = transform;

var traverse = function traverse(val, fn) {
  var keys = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

  if (keys.length) {
    fn(val, keys);
  }
  if (val instanceof Array) {
    val.forEach(function (elem, i) {
      traverse(elem, fn, keys.concat(i));
    });
  } else if (val.constructor === Object) {
    Object.keys(val).forEach(function (key) {
      traverse(val[key], fn, keys.concat(key));
    });
  }
};

exports.traverse = traverse;