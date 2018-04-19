'use strict'

const Validator = require('./validator')
const TransferService = require('../../domain/transfer')
const TransferTranslator = require('../../domain/transfer/translator')
const NotFoundError = require('../../errors').NotFoundError
const Sidecar = require('../../lib/sidecar')
const Logger = require('@mojaloop/central-services-shared').Logger
const Boom = require('boom')

const buildGetTransferResponse = (record) => {
  if (!record) {
    throw new NotFoundError('The requested resource could not be found.')
  }
  return TransferTranslator.toTransfer(record)
}

exports.create = async function (request, reply) {
    Logger.info('prepareTransfer::start(%s)', JSON.stringify(request.payload))
    return TransferService.prepare(request.payload)
            .then(result => reply(result.transfer).code(202))
            .catch(reply)
  }

