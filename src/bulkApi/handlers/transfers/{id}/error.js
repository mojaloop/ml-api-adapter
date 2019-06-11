'use strict'

const Boom = require('boom')

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
     */
  put: function putTransfersIdError (request, h) {
    return Boom.notImplemented()
  }
}
