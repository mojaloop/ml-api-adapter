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

const RootJoi = require('@hapi/joi')
const DateExtension = require('@hapi/joi-date')
const { Util } = require('@mojaloop/central-services-shared')

const DateExtendedJoi = RootJoi.extend(DateExtension)
const Joi = DateExtendedJoi.extend(Util.Hapi.customCurrencyCodeValidation)

const idSchema = Joi.string().pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-7][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$|^[0-9A-HJKMNP-TV-Z]{26}$/).label('Must be in a valid GUID/ULID format.')

const dfspIdSchema = Joi.string().min(1).max(32).label('A valid DFSP number must be supplied.')

const baseConditionFulfillmentSchema = Joi.string().regex(/^[A-Za-z0-9-_]{43}$/).max(48).trim()
const conditionSchema = baseConditionFulfillmentSchema.description('ILP condition').label('A valid transfer condition must be supplied.')
const fulfilmentSchema = baseConditionFulfillmentSchema.description('ILP fulfillment').label('Invalid transfer fulfilment description.')

const moneySchema = Joi.object({
  currency: Joi.string().currency().description('Currency of the transfer').label('Currency needs to be a valid ISO 4217 currency code.'),
  amount: Joi.string().regex(/^([0]|([1-9][0-9]{0,17}))([.][0-9]{0,3}[1-9])?$/).description('Amount of the transfer')
}).options({ presence: 'required' })

const pathIdParamSchema = Joi.object({
  id: idSchema.required().description('path')
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
  idSchema,
  dfspIdSchema,
  conditionSchema,
  fulfilmentSchema,
  moneySchema,
  pathIdParamSchema,
  extensionListSchema,
  errorCallbackPayloadSchema
}
