'use strict'
var Mockgen = require('./mockgen.js')
/**
 * Operations on /health
 */
module.exports = {
  /**
     * summary: Status of adapter
     * description:
     * parameters:
     * produces:
     * responses: default
     * operationId: getHealth
     */
  get: {
    default: function (req, res, callback) {
      /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
      Mockgen().responses({
        path: '/health',
        operation: 'get',
        response: 'default'
      }, callback)
    }
  }
}
