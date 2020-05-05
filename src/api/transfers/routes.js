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

 * Georgi Georgiev <georgi.georgiev@modusbox.com>
 * Shashikant Hirugade <shashikant.hirugade@modusbox.com>
 * Murthy Kakarlamudi <murthy@modusbox.com>

 --------------
 ******/
'use strict'

const Handler = require('./handler')
const RootJoi = require('@hapi/joi')
const DateExtension = require('@hapi/joi-date')
const CurrencyCodeExtension = require('joi-currency-code')
const DateExtendedJoi = RootJoi.extend(DateExtension)
const Joi = DateExtendedJoi.extend(CurrencyCodeExtension)
const Config = require('../../lib/config')
const Enum = require('@mojaloop/central-services-shared').Enum
const validateIncomingErrorCode = require('@mojaloop/central-services-error-handling').Handler.validateIncomingErrorCode

const tags = ['api', 'transfers', Enum.Tags.RouteTags.SAMPLED]
const transferState = [Enum.Transfers.TransferState.RECEIVED, Enum.Transfers.TransferState.RESERVED, Enum.Transfers.TransferState.COMMITTED, Enum.Transfers.TransferState.ABORTED, Enum.Transfers.TransferState.SETTLED]
const regexAccept = Enum.Http.Headers.GENERAL.ACCEPT.regex
const regexContentType = Enum.Http.Headers.GENERAL.ACCEPT.regex

const stripUnknown = Config.STRIP_UNKNOWN_HEADERS
const allowUnknown = !stripUnknown

module.exports = [{
  method: 'POST',
  path: '/transfers',
  handler: Handler.create,
  config: {
    id: 'ml_transfer_prepare',
    tags: tags,
    auth: null,
    description: 'Transfer API.',
    payload: {
      failAction: 'error'
    },
    validate: {
      headers: Joi.object({
        accept: Joi.string().optional().regex(regexAccept),
        'content-type': Joi.string().required().regex(regexContentType),
        'content-length': Joi.number().max(5242880),
        date: Joi.date().format('ddd, D MMM YYYY H:mm:ss [GMT]').required(),
        'x-forwarded-for': Joi.string().optional(),
        'fspiop-source': Joi.string().required(),
        'fspiop-destination': Joi.string().optional(),
        'fspiop-encryption': Joi.string().optional(),
        'fspiop-signature': Joi.string().optional(),
        'fspiop-uri': Joi.string().optional(),
        'fspiop-http-method': Joi.string().optional(),
        traceparent: Joi.string().optional(),
        tracestate: Joi.string().optional()
      }).unknown(allowUnknown).options({ stripUnknown }),
      payload: Joi.object({
        transferId: Joi.string().guid().required().description('Id of transfer').label('Transfer Id must be in a valid GUID format.'),
        payeeFsp: Joi.string().required().min(1).max(32).description('Financial Service Provider of Payee').label('A valid Payee FSP number must be supplied.'),
        payerFsp: Joi.string().required().min(1).max(32).description('Financial Service Provider of Payer').label('A valid Payer FSP number must be supplied.'),
        amount: Joi.object().keys({
          currency: Joi.string().required().currency().description('Currency of the transfer').label('Currency needs to be a valid ISO 4217 currency code.'),
          amount: Joi.string().required().regex(/^([0]|([1-9][0-9]{0,17}))([.][0-9]{0,3}[1-9])?$/).description('Amount of the transfer')
        }).required().description('Amount of the transfer').label('Supplied amount fails to match the required format.'),
        ilpPacket: Joi.string().required().regex(/^[A-Za-z0-9-_]+[=]{0,2}$/).min(1).max(32768).description('ilp packet').label('Supplied ILPPacket fails to match the required format.'),
        condition: Joi.string().required().trim().max(48).regex(/^[A-Za-z0-9-_]{43}$/).description('Condition of transfer').label('A valid transfer condition must be supplied.'),
        expiration: Joi.string().required().regex(/^(?:[1-9]\d{3}-(?:(?:0[1-9]|1[0-2])-(?:0[1-9]|1\d|2[0-8])|(?:0[13-9]|1[0-2])-(?:29|30)|(?:0[13578]|1[02])-31)|(?:[1-9]\d(?:0[48]|[2468][048]|[13579][26])|(?:[2468][048]|[13579][26])00)-02-29)T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:(\.\d{3}))(?:Z|[+-][01]\d:[0-5]\d)$/).description('When the transfer expires').label('A valid transfer expiry date must be supplied.'),
        extensionList: Joi.object().keys({
          extension: Joi.array().items(Joi.object().keys({
            key: Joi.string().required().min(1).max(32).description('Key').label('Supplied key fails to match the required format.'),
            value: Joi.string().required().min(1).max(128).description('Value').label('Supplied key value fails to match the required format.')
          })).required().min(1).max(16).description('extension')
        }).optional().description('Extension list')
      })
    }
  }
},
{
  method: 'PUT',
  path: '/transfers/{id}',
  handler: Handler.fulfilTransfer,
  options: {
    id: 'ml_transfer_fulfil',
    tags: tags,
    // auth: Auth.strategy(),
    description: 'Fulfil a transfer',
    payload: {
      failAction: 'error'
    },
    validate: {
      headers: Joi.object({
        'content-type': Joi.string().required().regex(regexContentType),
        date: Joi.date().format('ddd, D MMM YYYY H:mm:ss [GMT]').required(),
        'x-forwarded-for': Joi.string().optional(),
        'fspiop-source': Joi.string().required(),
        'fspiop-destination': Joi.string().optional(),
        'fspiop-encryption': Joi.string().optional(),
        'fspiop-signature': Joi.string().optional(),
        'fspiop-uri': Joi.string().optional(),
        'fspiop-http-method': Joi.string().optional(),
        traceparent: Joi.string().optional(),
        tracestate: Joi.string().optional()
      }).unknown(allowUnknown).options({ stripUnknown }),
      params: Joi.object({
        id: Joi.string().required().description('path')
      }),
      payload: Joi.object({
        fulfilment: Joi.string().regex(/^[A-Za-z0-9-_]{43}$/).max(48).description('fulfilment of the transfer').label('Invalid transfer fulfilment description.'),
        completedTimestamp: Joi.string().regex(/^(?:[1-9]\d{3}-(?:(?:0[1-9]|1[0-2])-(?:0[1-9]|1\d|2[0-8])|(?:0[13-9]|1[0-2])-(?:29|30)|(?:0[13578]|1[02])-31)|(?:[1-9]\d(?:0[48]|[2468][048]|[13579][26])|(?:[2468][048]|[13579][26])00)-02-29)T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:(\.\d{3}))(?:Z|[+-][01]\d:[0-5]\d)$/).description('When the transfer was completed').label('A valid transfer completion date must be supplied.'),
        transferState: Joi.string().required().valid(...transferState).description('State of the transfer').label('Invalid transfer state given.'),
        extensionList: Joi.object().keys({
          extension: Joi.array().items(Joi.object().keys({
            key: Joi.string().required().min(1).max(32).description('Key').label('Supplied key fails to match the required format.'),
            value: Joi.string().required().min(1).max(128).description('Value').label('Supplied key value fails to match the required format.')
          })).required().min(1).max(16).description('extension')
        }).optional().description('Extension list')
      })
    }
  }
},
{
  method: 'PUT',
  path: '/transfers/{id}/error',
  handler: Handler.fulfilTransferError,
  options: {
    id: 'ml_transfer_abort',
    tags: tags,
    description: 'Abort a transfer',
    payload: {
      failAction: 'error'
    },
    validate: {
      headers: Joi.object({
        'content-type': Joi.string().required().regex(regexContentType),
        date: Joi.date().format('ddd, D MMM YYYY H:mm:ss [GMT]').required(),
        'x-forwarded-for': Joi.string().optional(),
        'fspiop-source': Joi.string().required(),
        'fspiop-destination': Joi.string().optional(),
        'fspiop-encryption': Joi.string().optional(),
        'fspiop-signature': Joi.string().optional(),
        'fspiop-uri': Joi.string().optional(),
        'fspiop-http-method': Joi.string().optional(),
        traceparent: Joi.string().optional(),
        tracestate: Joi.string().optional()
      }).unknown(allowUnknown).options({ stripUnknown }),
      params: Joi.object({
        id: Joi.string().required().description('path')
      }),
      payload: Joi.object({
        errorInformation: Joi.object().keys({
          errorDescription: Joi.string().required(),
          errorCode: Joi.string().required().regex(/^[0-9]{4}/),
          extensionList: Joi.object().keys({
            extension: Joi.array().items(Joi.object().keys({
              key: Joi.string().required().min(1).max(32).description('Key').label('Supplied key fails to match the required format.'),
              value: Joi.string().required().min(1).max(128).description('Value').label('Supplied key value fails to match the required format.')
            })).required().min(1).max(16).description('extension')
          }).optional().description('Extension list')
        }).required().description('Error information')
      })
    },
    pre: [
      { method: validateIncomingErrorCode }
    ]
  }
},

{
  method: 'GET',
  path: '/transfers/{id}',
  handler: Handler.getTransferById,
  options: {
    id: 'ml_transfer_getById',
    tags: tags,
    description: 'Get a transfer by Id',
    validate: {
      headers: Joi.object({
        accept: Joi.string().optional().regex(regexAccept),
        'content-type': Joi.string().required().regex(regexContentType),
        date: Joi.date().format('ddd, D MMM YYYY H:mm:ss [GMT]').required(),
        'x-forwarded-for': Joi.string().optional(),
        'fspiop-source': Joi.string().required(),
        'fspiop-destination': Joi.string().optional(),
        'fspiop-encryption': Joi.string().optional(),
        'fspiop-signature': Joi.string().optional(),
        'fspiop-uri': Joi.string().optional(),
        'fspiop-http-method': Joi.string().optional(),
        traceparent: Joi.string().optional(),
        tracestate: Joi.string().optional()
      }).unknown(allowUnknown).options({ stripUnknown }),
      params: Joi.object({
        id: Joi.string().guid().required().description('path').label('Supply a valid transfer Id to continue.') // To Do : expand user friendly error msg to params as well
      })
    }
  }
}
]
