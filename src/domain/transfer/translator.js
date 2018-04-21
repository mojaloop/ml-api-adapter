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

const UrlParser = require('../../lib/urlparser')
const Util = require('../../lib/util')
const Logger = require('@mojaloop/central-services-shared').Logger

const transferProperties = [
  'additional_info',
  'cancellation_condition',
  'credits',
  'debits',
  'execution_condition',
  'expires_at',
  'expiry_duration',
  'id',
  'ledger',
  'rejection_reason',
  'state',
  'timeline'
]

const formatAsset = (asset) => Util.mergeAndOmitNil(asset, {
  account: UrlParser.toAccountUri(asset.account),
  amount: Util.formatAmount(asset.amount),
  memo: Util.parseJson(asset.memo),
  rejection_message: Util.parseJson(asset.rejection_message)
})

const formatAssets = (assets) => (Array.isArray(assets) ? assets.map(formatAsset) : assets)

const fromTransferAggregate = (t) => {
  const cleanProperties = Util.omitNil({
    id: UrlParser.toTransferUri(t.id),
    credits: formatAssets(t.credits),
    debits: formatAssets(t.debits),
    timeline: Util.omitNil(t.timeline)
  })
  return Util.mergeAndOmitNil(Util.pick(t, transferProperties), cleanProperties)
}

const fromTransferReadModel = (t) => fromTransferAggregate({
  id: t.transferUuid,
  ledger: t.ledger,
  debits: [{
    account: t.debitAccountName,
    amount: t.debitAmount,
    memo: t.debitMemo
  }],
  credits: [{
    account: t.creditAccountName,
    amount: t.creditAmount,
    memo: t.creditMemo,
    rejected: t.creditRejected === 1,
    rejection_message: t.creditRejectionMessage
  }],
  cancellation_condition: t.cancellationCondition,
  execution_condition: t.executionCondition,
  expires_at: t.expiresAt,
  state: t.state,
  timeline: Util.omitNil({
    prepared_at: t.preparedDate,
    executed_at: t.executedDate,
    rejected_at: t.rejectedDate
  }),
  rejection_reason: t.rejectionReason
})

const toTransfer = (t) => {
  if (t.id) {
    return fromTransferAggregate(t)
  } else if (t.transferUuid) {
    return fromTransferReadModel(t)
  } else throw new Error(`Unable to translate to transfer: ${t}`)
}

// const fromPayload = (payload) => Util.merge(payload, { id: UrlParser.idFromTransferUri(payload.id) })

const fromPayload = (payload) => Util.merge(payload, { id: UrlParser.uuidFromTransferUri(payload.id) })

module.exports = {
  toTransfer,
  fromPayload
}
