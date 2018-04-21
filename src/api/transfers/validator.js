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
const Decimal = require('decimal.js')
const Moment = require('moment')
const Config = require('../../lib/config')
const UrlParser = require('../../lib/urlparser')
const ValidationError = require('../../errors').ValidationError

const allowedScale = Config.AMOUNT.SCALE
const allowedPrecision = Config.AMOUNT.PRECISION

const validateEntry = (entry) => {
  const accountName = UrlParser.nameFromAccountUri(entry.account)
  if (!accountName) {
    throw new ValidationError(`Invalid account URI: ${entry.account}`)
  }

  const decimalAmount = new Decimal(entry.amount)

  if (decimalAmount.decimalPlaces() > allowedScale) {
    throw new ValidationError(`Amount ${entry.amount} exceeds allowed scale of ${allowedScale}`)
  }

  if (decimalAmount.precision(true) > allowedPrecision) {
    throw new ValidationError(`Amount ${entry.amount} exceeds allowed precision of ${allowedPrecision}`)
  }

  return { accountName, decimalAmount }
}

const validateConditionalTransfer = (transfer) => {
  const executionCondition = transfer.execution_condition
  if (!executionCondition) return
  CryptoConditions.validateCondition(executionCondition)
  if (transfer.expires_at) {
    const expiresAt = Moment(transfer.expires_at)
    if (expiresAt.isBefore(Moment.utc())) {
      throw new ValidationError(`expires_at date: ${expiresAt.toISOString()} has already expired.`)
    }
  } else {
    throw new ValidationError('expires_at: required for conditional transfer')
  }
}

exports.validate = (transfer, transferId) => {
  return P.resolve().then(() => {
    if (!transfer) {
      throw new ValidationError('Transfer must be provided')
    }
    const id = UrlParser.idFromTransferUri(transfer.id)
    if (!id || id !== transferId) {
      throw new ValidationError('transfer.id: Invalid URI')
    }
    // ** TODO: DISABLED - NEED TO REWORK TO SUPPORT MULTIPLE LEDGERS
    // if (transfer.ledger !== Config.HOSTNAME) {
    //   throw new ValidationError('transfer.ledger is not valid for this ledger')
    // }

    validateConditionalTransfer(transfer)

    const credit = validateEntry(transfer.credits[0])
    const debit = validateEntry(transfer.debits[0])

    if (debit.accountName === Config.LEDGER_ACCOUNT_NAME || credit.accountName === Config.LEDGER_ACCOUNT_NAME) {
      throw new ValidationError(`Account ${Config.LEDGER_ACCOUNT_NAME} not found`)
    }

    return Array.from(new Set([credit.accountName, debit.accountName]))
  })
    .then(accountNames => {
      return P.all(accountNames.map(n => {
        return Account.getByName(n).then(a => {
          if (a) {
            return a
          } else {
            throw new ValidationError(`Account ${n} not found`)
          }
        })
      }))
    })
    .then(() => transfer)
}
