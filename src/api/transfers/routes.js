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
const Enum = require('@mojaloop/central-services-shared').Enum
const validateIncomingErrorCode = require('@mojaloop/central-services-error-handling').Handler.validateIncomingErrorCode

const tags = ['api', 'transfers', Enum.Tags.RouteTags.SAMPLED]

module.exports = [{
  method: 'POST',
  path: '/transfers',
  handler: Handler.create,
  config: {
    id: 'ml_transfer_prepare',
    tags,
    auth: null,
    description: 'Transfer API.',
    payload: {
      failAction: 'error'
    }
  }
},
{
  method: 'PUT',
  path: '/transfers/{id}',
  handler: Handler.fulfilTransfer,
  options: {
    id: 'ml_transfer_fulfil',
    tags,
    // auth: Auth.strategy(),
    description: 'Fulfil a transfer',
    payload: {
      failAction: 'error'
    }
  }
},
{
  method: 'PUT',
  path: '/transfers/{id}/error',
  handler: Handler.fulfilTransferError,
  options: {
    id: 'ml_transfer_abort',
    tags,
    description: 'Abort a transfer',
    payload: {
      failAction: 'error'
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
    tags,
    description: 'Get a transfer by Id'
  }
}
]
