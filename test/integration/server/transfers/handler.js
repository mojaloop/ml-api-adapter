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
let notifications = {}
const endpoints = {
  dfsp1: [
    {
      type: 'FSIOP_CALLBACK_URL_TRANSFER_POST',
      value: 'http://ml-api-adapter-endpoint:4545/dfsp1/transfers'
    },
    {
      type: 'FSIOP_CALLBACK_URL_TRANSFER_PUT',
      value: 'http://ml-api-adapter-endpoint:4545/dfsp1/transfers/{{transferId}}'
    },
    {
      type: 'FSIOP_CALLBACK_URL_TRANSFER_ERROR',
      value: 'http://ml-api-adapter-endpoint:4545/dfsp1/transfers/{{transferId}}/error'
    }
  ],
  dfsp2: [
    {
      type: 'FSIOP_CALLBACK_URL_TRANSFER_POST',
      value: 'http://ml-api-adapter-endpoint:4545/dfsp2/transfers'
    },
    {
      type: 'FSIOP_CALLBACK_URL_TRANSFER_PUT',
      value: 'http://ml-api-adapter-endpoint:4545/dfsp2/transfers/{{transferId}}'
    },
    {
      type: 'FSIOP_CALLBACK_URL_TRANSFER_ERROR',
      value: 'http://ml-api-adapter-endpoint:4545/dfsp2/transfers/{{transferId}}/error'
    }
  ]
}
exports.receiveNotificationPost = async function (request, h) {
  console.log('Received message')
  console.log('receiveNotification::headers(%s)', JSON.stringify(request.headers))
  console.log('receiveNotification::payload(%s)', JSON.stringify(request.payload))
  const transferId = request.payload.transferId
  const path = request.path
  const result = path.split('/')
  const operation = 'post'
  const fsp = result[1]
  notifications[fsp] = {}
  notifications[fsp][operation] = {}
  notifications[fsp][operation][transferId] = request.payload
  return h.response(true).code(200)
}

exports.receiveNotificationPut = async function (request, h) {
  console.log('Received message')
  console.log('receiveNotification::headers(%s)', JSON.stringify(request.headers))
  console.log('receiveNotification::payload(%s)', JSON.stringify(request.payload))
  const transferId = request.params.transferId
  const path = request.path
  const result = path.split('/')
  const operation = (path.includes('error') ? 'error' : 'put')
  const fsp = result[1]
  console.log('OPERATION:: ', operation)
  notifications[fsp] = {}
  notifications[fsp][operation] = {}
  notifications[fsp][operation][transferId] = request.payload
  return h.response(true).code(200)
}

exports.getNotification = async function (request, h) {
  console.log('getNotification::transferId(%s),fsp(%s),operation(%s)', request.params.transferId, request.params.fsp, request.params.operation)
  const transferId = request.params.transferId
  const fsp = request.params.fsp
  const operation = request.params.operation
  let response = null
  if (notifications[fsp] && notifications[fsp][operation] && notifications[fsp][operation][transferId]) {
    response = notifications[fsp][operation][transferId]
  }
  console.log('Respose: %s', JSON.stringify(response))
  return h.response(response).code(200)
}

exports.getEndpoints = async function (request, h) {
  console.log('getEndpoints::fsp(%s)', request.params.fsp)
  const fsp = request.params.fsp
  console.log('Respose: %s', JSON.stringify(endpoints[fsp]))
  return h.response(JSON.stringify(endpoints[fsp])).code(200)
}
