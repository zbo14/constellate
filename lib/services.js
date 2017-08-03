'use strict'

//

/**
 * @module constellate/src/services
 */

module.exports = function() {

    const services = {}

    this.add = (service, tasks, t, i) => {
        if (!service.name) {
            return tasks.error('no service name');
        }
        if (services[service.name]) {
            return tasks.error(service.name + ' already supported')
        }
        services[service.name] = service
        tasks.run(t, i)
    }

    this.remove = (name, tasks, t, i) => {
        if (!services[name]) {
            return tasks.error(name + ' is not supported')
        }
        delete services[name]
        tasks.run(t, i)
    }

    this.use = (name, tasks, t, i) => {
        if (!services[name]) {
            return tasks.error(name + ' is not supported')
        }
        tasks.run(t, services[name], i)
    }
}
