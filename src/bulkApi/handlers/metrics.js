'use strict'

const Boom = require('boom')

/**
 * Operations on /metrics
 */
module.exports = {
  /**
     * summary: Prometheus metrics endpoint
     * description:
     * parameters:
     * produces:
     * responses: default
     */
  get: function getMetrics (request, h) {
    return Boom.notImplemented()
  }
}
