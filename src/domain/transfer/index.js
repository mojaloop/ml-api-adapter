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
  return Commands.publishPrepare(payload)
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


module.exports = {
  prepare,
  reject
}

