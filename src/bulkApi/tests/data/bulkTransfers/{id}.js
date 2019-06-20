'use strict'
var Mockgen = require('../mockgen.js')
/**
 * Operations on /bulkTransfers/{id}
 */
module.exports = {
  /**
     * summary: Get a transfer by Id
     * description:
     * parameters: accept, content-type, date, x-forwarded-for, fspiop-source, fspiop-destination, fspiop-encryption, fspiop-signature, fspiop-uri, fspiop-http-method, id
     * produces:
     * responses: default
     * operationId: getBulkTransfersId
     */
  get: {
    default: function (req, res, callback) {
      /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
      Mockgen().responses({
        path: '/bulkTransfers/{id}',
        operation: 'get',
        response: 'default'
      }, callback)
    }
  },
  /**
     * summary: Fulfil bulkTransfer
     * description:
     * parameters: content-type, date, x-forwarded-for, fspiop-source, fspiop-destination, fspiop-encryption, fspiop-signature, fspiop-uri, fspiop-http-method, id, body
     * produces:
     * responses: default
     * operationId: BulkTransfersByIDPut
     */
  put: {
    default: function (req, res, callback) {
      /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
      Mockgen().responses({
        path: '/bulkTransfers/{id}',
        operation: 'put',
        response: 'default'
      }, callback)
    }
  }
}
