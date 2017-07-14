'use strict';

const EventEmitter = require('events');
const { assign } = require('../lib/util.js');

// @flow

/**
 * @module constellate/src/event.js
 */

const RUN = 'run';
const START = 'start';
const NEXT = 'next';
const END = 'end';
const QUEUE = 'queue';
const ERROR = 'error';

function Task() {
  const ee = new EventEmitter();
  this.run = (...args: any[]) => {
    ee.emit(RUN, ...args);
  }
  this.error = (err: Error) => {
    ee.emit(ERROR, err);
  }
  this.onRun = (fn: Function) => {
    ee.on(RUN, fn);
  }
  ee.on(ERROR, err => {
    throw err;
  });
}

function Emitter() {
  const ee = new EventEmitter();
  this.start = (...args: any[]) => {
    ee.emit(START, ...args);
  }
  this.next = (...args: any[]) => {
    ee.emit(NEXT, ...args);
  }
  this.end = (...args: any[]) => {
    ee.emit(END, ...args);
  }
  this.queue = (...args: any[]) => {
    ee.emit(NEXT, ...args);
  }
  this.error = (err: Error) => {
    ee.emit(ERROR, err);
  }
  this.onStart = (fn: Function) => {
    ee.on(START, fn);
  }
  this.onNext = (fn: Function) => {
    ee.on(NEXT, fn);
  }
  this.onEnd = (fn: Function) => {
    ee.on(END, fn);
  }
  this.onQueue = (fn: Function) => {
    ee.on(QUEUE, fn);
  }
  this.onError = (fn: Function) => {
    ee.on(ERROR, fn);
  }
}

function Tasks(out: Object) {
  const e = new Emitter;
  let count = 0, queue = [], results, running;
  this.run = (...tasks: Function[]) => {
    if (running) {
      e.queue(tasks);
    } else {
      running = true;
      e.start(tasks);
    }
  }
  e.onStart(tasks => {
    results = new Array(tasks.length);
    for (let i = 0; i < tasks.length; i++) {
      tasks[i](e, i);
    }
  });
  e.onNext((result, i) => {
    results[i] = result;
    if (++count === results.length) {
      e.end();
    }
  });
  e.onQueue(tasks => {
    queue.push(...tasks);
  });
  e.onEnd(() => {
    out.next(results);
    if (queue.length) {
      const tasks = queue;
      queue = [];
      e.start(tasks);
    } else {
      running = false;
    }
  });
  e.onError(err => {
    throw err;
  });
}

function StateMachine(initial: Object, out: Function) {
   const e = new Emitter();
   let i, queue = [], running, state = initial, tasks;
   this.run = (...tasks: Function[]) => {
     if (running) {
       e.queue(tasks);
     } else {
       running = true;
       e.start(tasks);
     }
   }
   e.onQueue(tasks => {
       queue.push(...tasks);
   });
   e.onStart(_tasks => {
       i = 0
       tasks = _tasks;
       tasks[i++](assign(state), e);
   });
   e.onNext(result => {
      if (i === tasks.length) {
        e.end();
      } else {
        tasks[i++](result, e);
      }
   });
   e.onEnd(result => {
       state = result;
       out.next(state);
       if (queue.length) {
         const tasks = queue;
         queue = [];
         e.start(tasks);
       } else {
         running = false;
       }
   });
   e.onError(err => {
       throw err;
   });
}

exports.Emitter = Emitter;
exports.Task = Task;
exports.Tasks = Tasks;
exports.StateMachine = StateMachine;
