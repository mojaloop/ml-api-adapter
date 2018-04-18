'use strict'

const P = require('bluebird')
const Commands = require('./commands')
const Translator = require('./translator')
const State = require('./state')
const Events = require('../../lib/events')
const Errors = require('../../errors')
const Logger = require('@mojaloop/central-services-shared').Logger

const getById = (id) => {
  return TransferQueries.getById(id)
}

const getAll = () => {
  return TransferQueries.getAll()
}

const getFulfillment = (id) => {
  return getById(id)
    .then(transfer => {
      if (!transfer) {
        throw new Errors.TransferNotFoundError()
      }
      if (!transfer.executionCondition) {
        throw new Errors.TransferNotConditionalError()
      }
      if (transfer.state === State.REJECTED) {
        throw new Errors.AlreadyRolledBackError()
      }
      if (!transfer.fulfillment) {
        throw new Errors.MissingFulfillmentError()
      }
      return transfer.fulfillment
    })
}

const prepare = (payload) => {
  Logger.info('prepare::start(%s)', payload)
  // const transfer = Translator.fromPayload(payload)
  // const transfer = Translator.fromUriIDtoUUIDFromPayload(payload)
  // const transfer = payload
  return Commands.prepare(payload)
}

const reject = (rejection) => {
  return Commands.reject(rejection)
    .then(({ alreadyRejected, transfer }) => {
      const t = Translator.toTransfer(transfer)
      if (!alreadyRejected) {
        Events.emitTransferRejected(t)
      }
      return { alreadyRejected, transfer: t }
    })
}


const fulfill = (fulfillment) => {
  return Commands.fulfill(fulfillment)
    .then(transfer => {
      const t = Translator.toTransfer(transfer)
      Events.emitTransferExecuted(t, { execution_condition_fulfillment: fulfillment.fulfillment })
      return t
    })
    .catch(Errors.ExpiredTransferError, () => {
      return expire(fulfillment.id)
        .then(() => { throw new Errors.UnpreparedTransferError() })
    })
}



module.exports = {
  fulfill,
  prepare,
  reject
}

