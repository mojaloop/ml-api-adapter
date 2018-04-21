/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 --------------
 ******/

'use strict'

const P = require('bluebird')
const _ = require('lodash')
const Moment = require('moment')
const TransferState = require('../../domain/transfer/state')
const CryptoConditions = require('../../crypto-conditions')
const Errors = require('../../errors')
const UrlParser = require('../../lib/urlparser')

const validateFulfillment = ({state, fulfillment, execution_condition, expires_at}, fulfillmentCondition) => {
  return P.resolve().then(() => {
    if (!execution_condition) { // eslint-disable-line
      throw new Errors.TransferNotConditionalError()
    }
    if ((state === TransferState.EXECUTED || state === TransferState.SETTLED) && fulfillment === fulfillmentCondition) {
      return {
        previouslyFulfilled: true
      }
    }

    if (state !== TransferState.PREPARED) {
      throw new Errors.InvalidModificationError(`Transfers in state ${state} may not be executed`)
    }

    if (Moment.utc().isAfter(Moment(expires_at))) {
      throw new Errors.ExpiredTransferError()
    }

    CryptoConditions.validateFulfillment(fulfillmentCondition, execution_condition)

    return {
      previouslyFulfilled: false
    }
  })
}

const validateExistingOnPrepare = (proposed, existing) => {
  return P.resolve().then(() => {
    const match = _.isMatch(existing, _.omit(proposed, ['id']))
    const conditional = !!existing.execution_condition
    const isFinal = existing.state !== TransferState.PREPARED
    if ((conditional && isFinal) || !match) {
      throw new Errors.InvalidModificationError('Transfer may not be modified in this way')
    }
    return existing
  })
}

const validateReject = ({state, rejection_reason, execution_condition, credits}, rejectionReason, requestingAccount) => {
  return P.resolve().then(() => {
    if (!execution_condition) { // eslint-disable-line
      throw new Errors.TransferNotConditionalError()
    }

    if (requestingAccount && !credits.find(c => c.account === UrlParser.toAccountUri(requestingAccount.name))) {
      throw new Errors.UnauthorizedError('Invalid attempt to reject credit')
    }

    if (state === TransferState.REJECTED && rejection_reason === rejectionReason) { // eslint-disable-line
      return { alreadyRejected: true }
    }

    if (state !== TransferState.PREPARED) {
      throw new Errors.InvalidModificationError(`Transfers in state ${state} may not be rejected`)
    }

    return { alreadyRejected: false }
  })
}

const validateSettle = ({id, state}) => {
  return P.resolve().then(() => {
    if (state !== TransferState.EXECUTED) {
      throw new Errors.UnexecutedTransferError()
    }
  })
}

module.exports = {
  validateExistingOnPrepare,
  validateFulfillment,
  validateReject,
  validateSettle
}
