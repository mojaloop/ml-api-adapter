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
const Validator = require('./validator')
const Errors = require('../../errors')

module.exports = {
  PrepareTransfer (proposed) {
    const {id, ledger, debits, credits, execution_condition, expires_at} = proposed
    return P.resolve(this.$aggregate.load('Transfer', id))
      .then(existing => Validator.validateExistingOnPrepare(proposed, existing))
      .then(existing => { return { existing: true, transfer: existing } })
      .catch(Errors.AggregateNotFoundError, () => {
        return this.$aggregate.create('Transfer', {
          ledger,
          debits,
          credits,
          execution_condition,
          expires_at
        }, id)
          .then(transfer => {
            return transfer.$save().then(() => ({ existing: false, transfer }))
          })
      })
  },

  FulfillTransfer ({ id, fulfillment }) {
    return P.resolve(this.$aggregate.load('Transfer', id))
      .then(transfer => {
        return Validator.validateFulfillment(transfer, fulfillment)
          .then(({ previouslyFulfilled }) => {
            if (previouslyFulfilled) {
              return transfer
            }
            transfer.fulfill({fulfillment})
            return transfer.$save().then(() => transfer)
          })
      })
      .catch(Errors.AggregateNotFoundError, () => {
        throw new Errors.NotFoundError('The requested resource could not be found.')
      })
  },

  RejectTransfer ({ id, rejection_reason, message, requestingAccount }) {
    return P.resolve(this.$aggregate.load('Transfer', id))
      .then(transfer => {
        return Validator.validateReject(transfer, rejection_reason, requestingAccount)
          .then(result => {
            if (result.alreadyRejected) {
              return {
                alreadyRejected: true,
                transfer
              }
            }
          transfer.reject({ rejection_reason: rejection_reason, message: message }) // eslint-disable-line
            return transfer.$save().then(() => ({ alreadyRejected: false, transfer }))
          })
      })
      .catch(Errors.AggregateNotFoundError, () => {
        throw new Errors.NotFoundError('The requested resource could not be found.')
      })
  },

  SettleTransfer ({id, settlement_id}) {
    return P.resolve(this.$aggregate.load('Transfer', id))
      .then(transfer => {
        return Validator.validateSettle(transfer)
          .then(() => {
            transfer.settle({settlement_id})
            return transfer.$save().then(() => transfer)
          })
      })
      .catch(Errors.AggregateNotFoundError, () => {
        throw new Errors.NotFoundError()
      })
  }
}
