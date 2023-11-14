const RootJoi = require('@hapi/joi')
const DateExtension = require('@hapi/joi-date')
const { Util } = require('@mojaloop/central-services-shared')

const DateExtendedJoi = RootJoi.extend(DateExtension)
const Joi = DateExtendedJoi.extend(Util.Hapi.customCurrencyCodeValidation)

const guidSchema = Joi.string().guid({ version: 'uuidv4' }).label('Must be in a valid GUID format.')

const dfspIdSchema = Joi.string().min(1).max(32).label('A valid DFSP number must be supplied.')

const baseConditionFulfillmentSchema = Joi.string().regex(/^[A-Za-z0-9-_]{43}$/).max(48).trim()
const conditionSchema = baseConditionFulfillmentSchema.description('ILP condition').label('A valid transfer condition must be supplied.')
const fulfilmentSchema = baseConditionFulfillmentSchema.description('ILP fulfillment').label('Invalid transfer fulfilment description.')

const moneySchema = Joi.object({
  currency: Joi.string().currency().description('Currency of the transfer').label('Currency needs to be a valid ISO 4217 currency code.'),
  amount: Joi.string().regex(/^([0]|([1-9][0-9]{0,17}))([.][0-9]{0,3}[1-9])?$/).description('Amount of the transfer')
}).options({ presence: 'required' })

const pathIdParamSchema = Joi.object({
  id: guidSchema.required().description('path')
})

const extensionItemSchema = Joi.object().keys({
  key: Joi.string().min(1).max(32).description('Key').label('Supplied key fails to match the required format.'),
  value: Joi.string().min(1).max(128).description('Value').label('Supplied key value fails to match the required format.')
}).options({ presence: 'required' })

const extensionListSchema = Joi.object().keys({
  extension: Joi.array()
    .items(extensionItemSchema)
    .required().min(1).max(16).description('extension')
}).description('Extension list')

const errorInfoSchema = Joi.object().keys({
  errorCode: Joi.string().regex(/^[0-9]{4}/),
  errorDescription: Joi.string(),
  extensionList: extensionListSchema.optional()
}).options({ presence: 'required' })

const errorCallbackPayloadSchema = Joi.object({
  errorInformation: errorInfoSchema.required().description('Error information')
})

module.exports = {
  Joi,
  guidSchema,
  dfspIdSchema,
  conditionSchema,
  fulfilmentSchema,
  moneySchema,
  pathIdParamSchema,
  extensionListSchema,
  errorCallbackPayloadSchema
}
