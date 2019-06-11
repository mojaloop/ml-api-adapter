'use strict'

const Boom = require('boom')
const { IndividualTransferModel } = require('../../models/bulkTransfers/bulkModels')

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
   */
  get: async function getBulkTransfersId (request, h) {
    let { id } = request.params
    try {
      let indvidualTransfers = await IndividualTransferModel
        .find({ bulkTransferId: id }, '-dataUri -_id')
        .populate('bulkDocument', 'headers -_id') // TODO in bulk-handler first get only headers, then compose each individual transfer without population
      return h.response(indvidualTransfers)
    } catch (e) {
      throw e
    }
  },
  /**
   * summary: Fulfil bulkTransfer
   * description:
   * parameters: content-type, date, x-forwarded-for, fspiop-source, fspiop-destination, fspiop-encryption, fspiop-signature, fspiop-uri, fspiop-http-method, id, body
   * produces:
   * responses: default
   */
  put: function putBulkTransfersId (request, h) {
    return Boom.notImplemented()
  }
}
