'use strict';

const EventEmitter = require('events');
const {
    assign
} = require('../lib/util.js');

//

/**
 * @module constellate/src/event.js
 */

const START = 'start';
const NEXT = 'next';
const END = 'end';
const QUEUE = 'queue';
const ERROR = 'error';

function Emitter() {
    const ee = new EventEmitter();
    this.start = (...args) => {
        ee.emit(START, ...args);
    }
    this.next = (...args) => {
        ee.emit(NEXT, ...args);
    }
    this.end = (...args) => {
        ee.emit(END, ...args);
    }
    this.queue = (...args) => {
        ee.emit(NEXT, ...args);
    }
    this.error = err => {
        ee.emit(ERROR, err);
    }
    this.onStart = fn => {
        ee.on(START, fn);
    }
    this.onNext = fn => {
        ee.on(NEXT, fn);
    }
    this.onEnd = fn => {
        ee.on(END, fn);
    }
    this.onQueue = fn => {
        ee.on(QUEUE, fn);
    }
    this.onError = fn => {
        ee.on(ERROR, fn);
    }
}

function Chain() {}

function Tasks(out) {
    const e = new Emitter;
    let count = 0,
        queue = [],
        results, running;
    this.run = (...tasks) => {
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

function StateMachine(initial, out) {
    const e = new Emitter();
    let i, queue = [],
        running, state = initial,
        tasks;
    this.run = (...tasks) => {
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
exports.Tasks = Tasks;
exports.StateMachine = StateMachine;
