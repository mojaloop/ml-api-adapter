'use strict'
var Mockgen = require('./mockgen.js')
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
     * operationId: getMetrics
     */
  get: {
    default: function (req, res, callback) {
      /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
      Mockgen().responses({
        path: '/metrics',
        operation: 'get',
        response: 'default'
      }, callback)
    }
  }
}
