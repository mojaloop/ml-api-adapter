/*****
 License
 --------------
 Copyright © 2020-2024 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>

 * Infitx
 - Vijay Kumar Guthi <vijaya.guthi@infitx.com>
 - Kevin Leyow <kevin.leyow@infitx.com>
 - Kalin Krustev <kalin.krustev@infitx.com>
 - Steven Oderayi <steven.oderayi@infitx.com>
 - Eugen Klymniuk <eugen.klymniuk@infitx.com>

 --------------

 ******/

const { Enum } = require('@mojaloop/central-services-shared')
const config = require('../../lib/config')

const { Joi, ...commonSchemas } = require('./commonSchemas')

const { ACCEPT, CONTENT_TYPE } = Enum.Http.Headers.GENERAL

const transferState = [
  Enum.Transfers.TransferState.RECEIVED,
  Enum.Transfers.TransferState.RESERVED,
  Enum.Transfers.TransferState.COMMITTED,
  Enum.Transfers.TransferState.ABORTED
]

const stripUnknown = config.STRIP_UNKNOWN_HEADERS
const allowUnknown = !stripUnknown

const MAX_CONTENT_LENGTH = 5242880

const transferHeadersSchema = Joi.object({
  'content-type': Joi.string().regex(CONTENT_TYPE.regex).required(),
  date: Joi.date().format('ddd, DD MMM YYYY HH:mm:ss [GMT]').required(),
  'fspiop-source': Joi.string().required(),
  // the rest is optional
  accept: Joi.string().regex(ACCEPT.regex),
  'content-length': Joi.number().max(MAX_CONTENT_LENGTH),
  'fspiop-destination': Joi.string(),
  'fspiop-encryption': Joi.string(),
  'fspiop-signature': Joi.string(),
  'fspiop-http-method': Joi.string(),
  'fspiop-uri': Joi.string(),
  traceparent: Joi.string(),
  tracestate: Joi.string(),
  'x-forwarded-for': Joi.string()
}).unknown(allowUnknown)
  .options({
    stripUnknown,
    presence: 'optional',
    abortEarly: false
  })

const fxTransfersPreparePayloadSchema = Joi.object({
  commitRequestId: commonSchemas.idSchema.description('An end-to-end identifier for the confirmation request'),
  initiatingFsp: commonSchemas.dfspIdSchema.description('Identifier for the FSP who is requesting a currency conversion').label('initiatingFsp'),
  counterPartyFsp: commonSchemas.dfspIdSchema.description('Identifier for the FXP who is performing the currency conversion').label('counterPartyFsp'),
  sourceAmount: commonSchemas.moneySchema.description('The amount being offered for conversion by the requesting FSP'),
  targetAmount: commonSchemas.moneySchema.description('The amount which the FXP is to credit to the requesting FSP in the target currency'),
  condition: commonSchemas.conditionSchema.description('ILP condition received by the requesting FSP when the quote was approved'),
  expiration: Joi.date().iso(),
  determiningTransferId: commonSchemas.idSchema.description('The transaction ID of the transfer to which this currency conversion relates')
    .optional()
}).options({
  presence: 'required',
  allowUnknown: true,
  abortEarly: false
})

const fxTransfersSuccessCallbackPayloadSchema = Joi.object({
  conversionState: Joi.string().valid(...transferState).required()
    .description('The current status of the conversion request'),
  fulfilment: commonSchemas.fulfilmentSchema,
  completedTimestamp: Joi.date().iso(),
  extensionList: commonSchemas.extensionListSchema
}).options({ presence: 'optional' })

const fxTransfersPatchPayloadSchema = Joi.object({
  completedTimestamp: Joi.date().iso(),
  conversionState: Joi.string().valid(...transferState).required()
    .description('The current status of the conversion request'),
  extensionList: commonSchemas.extensionListSchema
}).options({ presence: 'required' })

// move all validation schemas here

module.exports = {
  Joi,
  commonSchemas,
  transferHeadersSchema,
  fxTransfersPreparePayloadSchema,
  fxTransfersSuccessCallbackPayloadSchema,
  fxTransfersPatchPayloadSchema
}
