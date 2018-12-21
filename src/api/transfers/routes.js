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

const Handler = require('./handler')
const BaseJoi = require('joi-currency-code')(require('joi'))
const Extension = require('joi-date-extensions')
const Joi = BaseJoi.extend(Extension)
const tags = ['api', 'transfers']
const transferState = ['RECEIVED', 'RESERVED', 'COMMITTED', 'ABORTED', 'SETTLED']

module.exports = [{
  method: 'POST',
  path: '/transfers',
  handler: Handler.create,
  config: {
    id: 'transfers',
    tags: tags,
    auth: null,
    description: 'Transfer API.',
    payload: {
      failAction: 'error',
      output: 'data'
    },
    validate: {
      headers: Joi.object({
        'accept': Joi.string().optional().regex(/application\/vnd.interoperability[.]/),
        'content-type': Joi.string().required().regex(/application\/vnd.interoperability[.]/),
        'content-length': Joi.number().max(5242880),
        'date': Joi.date().format('ddd, D MMM YYYY H:mm:ss [GMT]').required(),
        'x-forwarded-for': Joi.string().optional(),
        'fspiop-source': Joi.string().required(),
        'fspiop-destination': Joi.string().optional(),
        'fspiop-final-destination': Joi.string().optional(),
        'fspiop-encryption': Joi.string().optional(),
        'fspiop-signature': Joi.string().optional(),
        'fspiop-uri': Joi.string().optional(),
        'fspiop-http-method': Joi.string().optional()
      }).unknown(false).options({ stripUnknown: true }),
      payload: {
        transferId: Joi.string().guid().required().description('Id of transfer').label('@ Transfer Id must be in a valid GUID format. @'),
        payeeFsp: Joi.string().required().min(1).max(32).description('Financial Service Provider of Payee').label('@ A valid Payee FSP number must be supplied. @'),
        payerFsp: Joi.string().required().min(1).max(32).description('Financial Service Provider of Payer').label('@ A valid Payer FSP number must be supplied. @'),
        amount: Joi.object().keys({
          currency: Joi.string().required().currency().description('Currency of the transfer').label('@ Currency needs to be a valid ISO 4217 currency code. @'),
          amount: Joi.string().required().regex(/^([0]|([1-9][0-9]{0,17}))([.][0-9]{0,3}[1-9])?$/).description('Amount of the transfer')
        }).required().description('Amount of the transfer').label('@ Supplied amount fails to match the required format. @'),
        ilpPacket: Joi.string().required().regex(/^[A-Za-z0-9-_]+[=]{0,2}$/).min(1).max(32768).description('ilp packet').label('@ Supplied ILPPacket fails to match the required format. @'),
        condition: Joi.string().required().trim().max(48).regex(/^[A-Za-z0-9-_]{43}$/).description('Condition of transfer').label('@ A valid transfer condition must be supplied. @'),
        expiration: Joi.string().required().regex(/^(?:[1-9]\d{3}-(?:(?:0[1-9]|1[0-2])-(?:0[1-9]|1\d|2[0-8])|(?:0[13-9]|1[0-2])-(?:29|30)|(?:0[13578]|1[02])-31)|(?:[1-9]\d(?:0[48]|[2468][048]|[13579][26])|(?:[2468][048]|[13579][26])00)-02-29)T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:(\.\d{3}))(?:Z|[+-][01]\d:[0-5]\d)$/).description('When the transfer expires').label('@ A valid transfer expiry date must be supplied. @'),
        extensionList: Joi.object().keys({
          extension: Joi.array().items(Joi.object().keys({
            key: Joi.string().required().min(1).max(32).description('Key').label('@ Supplied key fails to match the required format. @'),
            value: Joi.string().required().min(1).max(128).description('Value').label('@ Supplied key value fails to match the required format. @')
          })).required().min(1).max(16).description('extension')
        }).optional().description('Extension list')
      },
      failAction: (request, h, err) => { throw err }
    }
  }
},
{
  method: 'PUT',
  path: '/transfers/{id}',
  handler: Handler.fulfilTransfer,
  options: {
    id: 'transfer_fulfilment',
    tags: tags,
    // auth: Auth.strategy(),
    description: 'Fulfil a transfer',
    payload: {
      failAction: 'error'
    },
    validate: {
      headers: Joi.object({
        'content-type': Joi.string().required().regex(/application\/vnd.interoperability[.]/),
        'date': Joi.date().format('ddd, D MMM YYYY H:mm:ss [GMT]').required(),
        'x-forwarded-for': Joi.string().optional(),
        'fspiop-source': Joi.string().required(),
        'fspiop-destination': Joi.string().optional(),
        'fspiop-final-destination': Joi.string().optional(),
        'fspiop-encryption': Joi.string().optional(),
        'fspiop-signature': Joi.string().optional(),
        'fspiop-uri': Joi.string().optional(),
        'fspiop-http-method': Joi.string().optional()
      }).unknown(false).options({ stripUnknown: true }),
      params: {
        id: Joi.string().required().description('path')
      },
      payload: {
        fulfilment: Joi.string().regex(/^[A-Za-z0-9-_]{43}$/).max(48).description('fulfilment of the transfer').label('@ Invalid transfer fulfilment description. @'),
        completedTimestamp: Joi.string().regex(/^(?:[1-9]\d{3}-(?:(?:0[1-9]|1[0-2])-(?:0[1-9]|1\d|2[0-8])|(?:0[13-9]|1[0-2])-(?:29|30)|(?:0[13578]|1[02])-31)|(?:[1-9]\d(?:0[48]|[2468][048]|[13579][26])|(?:[2468][048]|[13579][26])00)-02-29)T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:(\.\d{3}))(?:Z|[+-][01]\d:[0-5]\d)$/).description('When the transfer was completed').label('@ A valid transfer completion date must be supplied. @'),
        transferState: Joi.string().required().valid(transferState).description('State of the transfer').label('@ Invalid transfer state given. @'),
        extensionList: Joi.object().keys({
          extension: Joi.array().items(Joi.object().keys({
            key: Joi.string().required().min(1).max(32).description('Key').label('@ Supplied key fails to match the required format. @'),
            value: Joi.string().required().min(1).max(128).description('Value').label('@ Supplied key value fails to match the required format. @')
          })).required().min(1).max(16).description('extension')
        }).optional().description('Extension list')
      }
    }
  }
},

{
  method: 'GET',
  path: '/transfers/{id}',
  handler: Handler.getTransferById,
  options: {
    id: 'transfer_getById',
    tags: tags,
    // auth: Auth.strategy(),
    description: 'Get a transfer by Id',
    /* payload: {
      failAction: 'error'
    }, */
    validate: {
      headers: Joi.object({
        'accept': Joi.string().optional().regex(/application\/vnd.interoperability[.]/),
        'content-type': Joi.string().required().regex(/application\/vnd.interoperability[.]/),
        'date': Joi.date().format('ddd, D MMM YYYY H:mm:ss [GMT]').required(),
        'x-forwarded-for': Joi.string().optional(),
        'fspiop-source': Joi.string().required(),
        'fspiop-destination': Joi.string().optional(),
        'fspiop-final-destination': Joi.string().optional(),
        'fspiop-encryption': Joi.string().optional(),
        'fspiop-signature': Joi.string().optional(),
        'fspiop-uri': Joi.string().optional(),
        'fspiop-http-method': Joi.string().optional()
      }).unknown(false).options({ stripUnknown: true }),
      params: {
        id: Joi.string().guid().required().description('path').label('@ Supply a valid transfer Id to continue. @') // To Do : expand user friendly error msg to params as well
      },
      failAction: (request, h, err) => { throw err }
    }
  }
}
]
