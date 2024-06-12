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
  commitRequestId: commonSchemas.guidSchema.description('An end-to-end identifier for the confirmation request'),
  initiatingFsp: commonSchemas.dfspIdSchema.description('Identifier for the FSP who is requesting a currency conversion').label('initiatingFsp'),
  counterPartyFsp: commonSchemas.dfspIdSchema.description('Identifier for the FXP who is performing the currency conversion').label('counterPartyFsp'),
  sourceAmount: commonSchemas.moneySchema.description('The amount being offered for conversion by the requesting FSP'),
  targetAmount: commonSchemas.moneySchema.description('The amount which the FXP is to credit to the requesting FSP in the target currency'),
  condition: commonSchemas.conditionSchema.description('ILP condition received by the requesting FSP when the quote was approved'),
  expiration: Joi.date().iso(),
  determiningTransferId: commonSchemas.guidSchema.description('The transaction ID of the transfer to which this currency conversion relates')
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
