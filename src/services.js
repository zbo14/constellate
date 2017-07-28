'use strict'

// @flow

/**
 * @module constellate/src/services
 */

module.exports = function () {

  const services = {}

  this.add = (service: Object, tasks: Object, t: number, i?: number) => {
    if (!service.name) {
      return tasks.error('no service name');
    }
    if (services[service.name]) {
      return tasks.error(service.name + ' already supported')
    }
    services[service.name] = service
    tasks.run(t, i)
  }

  this.remove = (name: string, tasks: Object, t: number, i?: number) => {
    if (!services[name]) {
      return tasks.error(name + ' is not supported')
    }
    delete services[name]
    tasks.run(t, i)
  }

  this.use = (name: string, tasks: Object, t: number, i?: number) => {
    if (!services[name]) {
      return tasks.error(name + ' is not supported')
    }
    tasks.run(t, services[name], i)
  }
}
