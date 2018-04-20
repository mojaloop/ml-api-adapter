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

const Handler = require('./handler')
const Joi = require('joi')
const tags = ['api', 'transfers']

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
      allow: 'application/json',
      failAction: 'error',
      output: 'data'
    },
    validate: {
      payload: {
        transferId: Joi.string().guid().required().description('Id of transfer'),
        payeeFsp: Joi.number().required().description('Financial Service Provider of Payee'),
        payerFsp: Joi.number().required().description('Financial Service Provider of Payer'),
        amount: Joi.object().keys({
          currency: Joi.string().required().description('Currency of the transfer'),
          amount: Joi.number().required().description('Amount of the transfer')
        }).required().description('Amount of the transfer'),
        ilpPacket: Joi.string().required().description('ilp packet'),
        extensionList: Joi.object().keys({
          extension: Joi.array().items(Joi.object().keys({
            key: Joi.string().required().description('Key'),
            value: Joi.string().required().description('Value')
          })).required().description('extension')
        }).description('Extention list'),
        condition: Joi.string().trim().max(65535).optional().description('Condition of transfer'),
        expiration: Joi.string().isoDate().optional().description('When the transfer expires')
      }
    }
  }
}
]
