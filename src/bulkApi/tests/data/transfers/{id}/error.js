'use strict'
var Mockgen = require('../../mockgen.js')
/**
 * Operations on /transfers/{id}/error
 */
module.exports = {
  /**
     * summary: Abort a transfer
     * description:
     * parameters: content-type, date, x-forwarded-for, fspiop-source, fspiop-destination, fspiop-encryption, fspiop-signature, fspiop-uri, fspiop-http-method, id, body
     * produces:
     * responses: default
     * operationId: putTransfersIdError
     */
  put: {
    default: function (req, res, callback) {
      /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
      Mockgen().responses({
        path: '/transfers/{id}/error',
        operation: 'put',
        response: 'default'
      }, callback)
    }
  }
}
