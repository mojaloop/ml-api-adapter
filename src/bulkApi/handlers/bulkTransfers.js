'use strict'

const TransferService = require('../../domain/transfer')
const Logger = require('@mojaloop/central-services-shared').Logger
const Boom = require('boom')
const { BulkTransferModel } = require('../models/bulkTransfers/bulkModels')
const Util = require('../../lib/util')

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
   */
  post: async function postBulkTransfers (request, h) {
    try {
      Logger.debug('create::payload(%s)', JSON.stringify(request.payload))
      let { bulkTransferId, bulkQuoteId, payerFsp, payeeFsp, expiration, extensionList } = request.payload
      let hash = Util.createHash(JSON.stringify(request.payload))
      let newBulk = new BulkTransferModel(Object.assign({}, { headers: request.headers }, request.payload))
      let { status } = await newBulk.save()
      let message = { bulkTransferId, bulkQuoteId, payerFsp, payeeFsp, expiration, extensionList, hash, status }
      await TransferService.bulkPrepare(request.headers, message, request.dataUri)
      return h.response().code(202)
    } catch (err) {
      Logger.error(err)
      throw Boom.boomify(err, { message: 'An error has occurred' })
    }
  }
}
