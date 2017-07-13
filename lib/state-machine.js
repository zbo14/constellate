'use strict';

const EventEmitter = require('events');

const {
    assign
} = require('../lib/util.js');

//

/**
 * @module constellate/src/state-machine.js
 */

module.exports = function(initial) {
    const ee = new EventEmitter();
    let i, queue = [],
        result, running, state = initial,
        tasks;
    this.runTasks = (...tasks) => {
        if (running) {
            ee.emit('queue-tasks', tasks);
        } else {
            ee.emit('start', tasks);
        }
    }
    ee.on('queue-tasks', tasks => {
        queue.push(...tasks);
    });
    ee.on('start', _tasks => {
        i = 0;
        result = assign(state);
        running = true;
        tasks = _tasks;
        ee.emit('run-task');
    });
    ee.on('run-task', () => {
        tasks[i++](result, ee);
    });
    ee.on('task-complete', () => {
        if (i === tasks.length) {
            ee.emit('done');
        } else {
            ee.emit('run-task', i);
        }
    });
    ee.on('done', () => {
        state = result;
        if (queue.length) {
            const tasks = queue;
            queue = [];
            ee.emit('start', tasks);
        } else {
            running = false;
        }
    });
    ee.on('error', err => {
        throw err;
    });
}
