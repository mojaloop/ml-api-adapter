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
const tags = ['test', 'transfers']

module.exports = [{
  method: 'GET',
  path: '/',
  handler: Handler.receiveNotification,
  options: {
    id: 'test',
    tags: tags,
    description: 'test endpoint'
  }
},
{
  method: 'PUT',
  path: '/dfsp1/transfers/error',
  handler: Handler.receiveNotification,
  options: {
    id: 'dfsp1-error',
    tags: tags,
    description: 'receive error notification for dfsp1',
    payload: {
      allow: 'application/json',
      failAction: 'error',
      output: 'data'
    }
  }
},
{
  method: 'PUT',
  path: '/dfsp2/transfers/error',
  handler: Handler.receiveNotification,
  options: {
    id: 'dfsp2-error',
    tags: tags,
    description: 'receive error notification for dfsp2',
    payload: {
      allow: 'application/json',
      failAction: 'error',
      output: 'data'
    }
  }
},
{
  method: 'PUT',
  path: '/dfsp3/transfers/error',
  handler: Handler.receiveNotification,
  options: {
    id: 'dfsp3-error',
    tags: tags,
    description: 'receive error notification for dfsp3',
    payload: {
      allow: 'application/json',
      failAction: 'error',
      output: 'data'
    }
  }
},
{
  method: 'POST',
  path: '/dfsp1/transfers',
  handler: Handler.receiveNotification,
  options: {
    id: 'dfsp1-transfers',
    tags: tags,
    description: 'receive -transfers for dfsp1',
    payload: {
      allow: 'application/json',
      failAction: 'error',
      output: 'data'
    }
  }
},
{
  method: 'POST',
  path: '/dfsp2/transfers',
  handler: Handler.receiveNotification,
  options: {
    id: 'dfsp2-transfers',
    tags: tags,
    description: 'receive -transfers for dfsp2',
    payload: {
      allow: 'application/json',
      failAction: 'error',
      output: 'data'
    }
  }
},
{
  method: 'POST',
  path: '/dfsp3/transfers',
  handler: Handler.receiveNotification,
  options: {
    id: 'dfsp3-transfers',
    tags: tags,
    description: 'receive transfers for dfsp3',
    payload: {
      allow: 'application/json',
      failAction: 'error',
      output: 'data'
    }
  }
}
]
