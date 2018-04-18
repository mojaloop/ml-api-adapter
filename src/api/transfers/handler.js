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
  try {
    Logger.info('prepareTransfer::start(%s)', JSON.stringify(request.payload))
    //return reply.response(request.payload).code(201)
    return TransferService.prepare(request.payload)
  } catch (err) {
    throw Boom.boomify(err, {statusCode: 400, message: 'An error has occurred'})
  }
}

// exports.prepareTransfer = function (request, reply) {
//   Logger.info('prepareTransfer::start(%s)', JSON.stringify(request.payload))
//   Sidecar.logRequest(request)
//   return Validator.validate(request.payload, request.params.id)
//     .then(TransferService.prepare)
//     // .then(result => reply(result.transfer).code(202))
//     .then(result => reply(result.transfer).code((result.existing === true) ? 200 : 202))
//     .catch(reply)
// }

// exports.fulfillTransfer = function (request, reply) {
//   Sidecar.logRequest(request)
//   const fulfillment = {
//     id: request.params.id,
//     fulfillment: request.payload
//   }

//   return TransferService.fulfill(fulfillment)
//     .then(transfer => reply(transfer).code(200))
//     .catch(reply)
// }

// exports.rejectTransfer = function (request, reply) {
//   Sidecar.logRequest(request)
//   const rejection = {
//     id: request.params.id,
//     rejection_reason: TransferRejectionType.CANCELLED,
//     message: request.payload,
//     requestingAccount: request.auth.credentials
//   }

//   return TransferService.reject(rejection)
//     .then(result => reply(rejection.message).code(result.alreadyRejected ? 200 : 201))
//     .catch(reply)
// }

// exports.getTransferById = function (request, reply) {
//   return TransferService.getById(request.params.id)
//     .then(buildGetTransferResponse)
//     .then(result => reply(result))
//     .catch(reply)
// }

// exports.getTransferFulfillment = function (request, reply) {
//   return TransferService.getFulfillment(request.params.id)
//     .then(result => reply(result).type('text/plain'))
//     .catch(reply)
// }
