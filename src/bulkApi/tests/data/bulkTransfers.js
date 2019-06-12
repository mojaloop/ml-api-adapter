'use strict'
var Mockgen = require('./mockgen.js')
/**
 * Operations on /bulkTransfers
 */
module.exports = {
  /**
     * summary: Transfer API.
     * description:
     * parameters: accept, content-type, content-length, date, x-forwarded-for, fspiop-source, fspiop-destination, fspiop-encryption, fspiop-signature, fspiop-uri, fspiop-http-method, body
     * produces:
     * responses: default
     * operationId: postBulkTransfers
     */
  post: {
    default: function (req, res, callback) {
      /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
      Mockgen().responses({
        path: '/bulkTransfers',
        operation: 'post',
        response: 'default'
      }, callback)
    }
  }
}
