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

const EventSdk = require('@mojaloop/event-sdk')
const Uuid = require('uuid4')
// const Moment = require('moment')

// const hostname = 'ml-api-adapter'
// const executionCondition = 'ni:///sha-256;47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU?fpt=preimage-sha-256&cost=0'
// const executionCondition = 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA'
// const ilpPacket = 'AYIBgQAAAAAAAASwNGxldmVsb25lLmRmc3AxLm1lci45T2RTOF81MDdqUUZERmZlakgyOVc4bXFmNEpLMHlGTFGCAUBQU0svMS4wCk5vbmNlOiB1SXlweUYzY3pYSXBFdzVVc05TYWh3CkVuY3J5cHRpb246IG5vbmUKUGF5bWVudC1JZDogMTMyMzZhM2ItOGZhOC00MTYzLTg0NDctNGMzZWQzZGE5OGE3CgpDb250ZW50LUxlbmd0aDogMTM1CkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbgpTZW5kZXItSWRlbnRpZmllcjogOTI4MDYzOTEKCiJ7XCJmZWVcIjowLFwidHJhbnNmZXJDb2RlXCI6XCJpbnZvaWNlXCIsXCJkZWJpdE5hbWVcIjpcImFsaWNlIGNvb3BlclwiLFwiY3JlZGl0TmFtZVwiOlwibWVyIGNoYW50XCIsXCJkZWJpdElkZW50aWZpZXJcIjpcIjkyODA2MzkxXCJ9IgA'

const generateTransferId = () => {
  return Uuid()
}

const generateParentTestSpan = () => {
  return EventSdk.Tracer.createSpan('test_span')
}

// const generateAccountName = () => {
//   return generateRandomName()
// }

// const generateRandomName = () => {
//   return `dfsp${Uuid().replace(/-/g, '')}`.substr(0, 25)
// }

// const buildDebitOrCredit = (accountName, amount, memo) => {
//   return {
//     account: `http://${hostname}/accounts/${accountName}`,
//     amount: amount,
//     memo: memo,
//     authorized: true
//   }
// }

// const futureDate = () => {
//   let d = new Date()
//   d.setTime(d.getTime() + 86400000)
//   return d
// }

const buildTransfer = (transferId) => {
  return {
    transferId,
    payeeFsp: 'dfsp1',
    payerFsp: 'dfsp2',
    amount: {
      currency: 'USD',
      amount: '123.45'
    },
    ilpPacket: 'AYIBgQAAAAAAAASwNGxldmVsb25lLmRmc3AxLm1lci45T2RTOF81MDdqUUZERmZlakgyOVc4bXFmNEpLMHlGTFGCAUBQU0svMS4wCk5vbmNlOiB1SXlweUYzY3pYSXBFdzVVc05TYWh3CkVuY3J5cHRpb246IG5vbmUKUGF5bWVudC1JZDogMTMyMzZhM2ItOGZhOC00MTYzLTg0NDctNGMzZWQzZGE5OGE3CgpDb250ZW50LUxlbmd0aDogMTM1CkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbgpTZW5kZXItSWRlbnRpZmllcjogOTI4MDYzOTEKCiJ7XCJmZWVcIjowLFwidHJhbnNmZXJDb2RlXCI6XCJpbnZvaWNlXCIsXCJkZWJpdE5hbWVcIjpcImFsaWNlIGNvb3BlclwiLFwiY3JlZGl0TmFtZVwiOlwibWVyIGNoYW50XCIsXCJkZWJpdElkZW50aWZpZXJcIjpcIjkyODA2MzkxXCJ9IgA',
    condition: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
    expiration: '2016-05-24T08:38:08.699-04:00',
    extensionList:
    {
      extension:
      [
        {
          key: 'errorDescription',
          value: 'This is a more detailed error description'
        },
        {
          key: 'errorDescription',
          value: 'This is a more detailed error description'
        }
      ]
    }
  }
}

const buildHeaders = {
  accept: 'application/vnd.interoperability.participants+json;version=1',
  'fspiop-destination': 'dsfp1',
  'content-type': 'application/vnd.interoperability.participants+json;version=1.0',
  date: '2019-05-24 08:52:19',
  'fspiop-source': 'dfsp2'
}

// const buildUnconditionalTransfer = (transferId, debit, credit) => {
//   return {
//     id: `http://${hostname}/transfers/${transferId}`,
//     ledger: `http://${hostname}`,
//     debits: [debit],
//     credits: [credit]
//   }
// }

// const buildTransferPreparedEvent = (transferId, debit, credit, expiresAt) => {
//   expiresAt = (expiresAt || futureDate()).toISOString()
//   return {
//     id: 1,
//     name: 'TransferPrepared',
//     payload: {
//       ledger: `${hostname}`,
//       debits: [debit],
//       credits: [credit],
//       execution_condition: executionCondition,
//       expires_at: expiresAt
//     },
//     aggregate: {
//       id: transferId,
//       name: 'Transfer'
//     },
//     context: 'Ledger',
//     timestamp: 1474471273588
//   }
// }

// const buildTransferExecutedEvent = (transferId, debit, credit, expiresAt) => {
//   expiresAt = (expiresAt || futureDate()).toISOString()
//   return {
//     id: 2,
//     name: 'TransferExecuted',
//     payload: {
//       ledger: `${hostname}`,
//       debits: [debit],
//       credits: [credit],
//       execution_condition: executionCondition,
//       expires_at: expiresAt,
//       fulfillment: 'oAKAAA'
//     },
//     aggregate: {
//       id: transferId,
//       name: 'Transfer'
//     },
//     context: 'Ledger',
//     timestamp: 1474471284081
//   }
// }

// const buildTransferRejectedEvent = (transferId, rejectionReason) => {
//   return {
//     id: 2,
//     name: 'TransferRejected',
//     payload: {
//       rejection_reason: rejectionReason
//     },
//     aggregate: {
//       id: transferId,
//       name: 'Transfer'
//     },
//     context: 'Ledger',
//     timestamp: 1474471286000
//   }
// }

// const buildReadModelTransfer = (transferId, debit, credit, state, expiresAt, preparedDate, rejectionReason) => {
//   state = state || 'prepared'
//   expiresAt = (expiresAt || futureDate()).toISOString()
//   preparedDate = (preparedDate || new Date()).toISOString()
//   return {
//     transferUuid: transferId,
//     state: state,
//     ledger: `${hostname}`,
//     debitAccountId: debit.accountId,
//     debitAmount: debit.amount,
//     debitMemo: debit.memo,
//     creditAccountId: credit.accountId,
//     creditAmount: credit.amount,
//     creditMemo: credit.memo,
//     executionCondition: executionCondition,
//     rejectionReason: rejectionReason,
//     expiresAt: expiresAt,
//     preparedDate: preparedDate
//   }
// }

// const buildCharge = (name, rateType, code) => {
//   return {
//     'name': name,
//     'charge_type': 'fee',
//     'rate_type': rateType,
//     'rate': '0.50',
//     'code': code,
//     'minimum': '16.00',
//     'maximum': '100.00',
//     'is_active': true,
//     'payer': 'sender',
//     'payee': 'receiver'
//   }
// }

// const findAccountPositions = (positions, accountName) => {
//   return positions.find(function (p) {
//     return p.account === buildAccountUrl(accountName)
//   })
// }

// const buildAccountUrl = (accountName) => {
//   return `http://${hostname}/accounts/${accountName}`
// }

// function buildAccountPosition (accountName, tPayments, tReceipts, fPayments, fReceipts) {
//   return {
//     account: buildAccountUrl(accountName),
//     fees: {
//       payments: fPayments.toString(),
//       receipts: fReceipts.toString(),
//       net: (fReceipts - fPayments).toString()
//     },
//     transfers: {
//       payments: tPayments.toString(),
//       receipts: tReceipts.toString(),
//       net: (tReceipts - tPayments).toString()
//     },
//     net: (tReceipts - tPayments + fReceipts - fPayments).toString()
//   }
// }

// const getMomentToExpire = (timeToPrepareTransfer = 0.5) => {
//   return Moment.utc().add(timeToPrepareTransfer, 'seconds')
// }

// const getCurrentUTCTimeInMilliseconds = () => {
//   return new Date().getTime()
// }

// const rejectionMessage = () => {
//   return {
//     code: 'S00',
//     name: 'Bad Request',
//     message: 'destination transfer failed',
//     triggered_by: 'example.red.bob',
//     additional_info: {}
//   }
// }

module.exports = {
  // hostname,
  // buildAccountPosition,
  // buildCharge,
  // buildDebitOrCredit,
  buildTransfer,
  buildHeaders,
  // buildUnconditionalTransfer,
  // buildTransferPreparedEvent,
  // buildTransferExecutedEvent,
  // buildTransferRejectedEvent,
  // buildReadModelTransfer,
  // findAccountPositions,
  // generateRandomName,
  // generateAccountName,
  generateTransferId,
  generateParentTestSpan
  // getMomentToExpire,
  // getCurrentUTCTimeInMilliseconds,
  // rejectionMessage
}
