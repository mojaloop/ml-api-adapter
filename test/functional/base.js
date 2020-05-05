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

const apiHost = process.env.APP_HOST || 'localhost'
//  const apiHost = 'ml-api-adapter-functional'
const RequestApi = require('supertest')('http://' + apiHost + ':3000')
// const account1Name = 'dfsp1'
// const account1AccountNumber = '1234'
// const account1RoutingNumber = '2345'
// const account2Name = 'dfsp2'
// const account2AccountNumber = '3456'
// const account2RoutingNumber = '4567'

// const basicAuth = (name, password) => {
//   const credentials = Encoding.toBase64(name + ':' + password)
//   return {'Authorization': `Basic ${credentials}`}
// }

// let account1promise
// let account2promise
// const account1 = () => {
//   if (!account1promise) {
//     account1promise = createAccount(account1Name, account1Name).then(res => {
//       return createAccountSettlement(account1Name, account1AccountNumber, account1RoutingNumber).then(() => res.body)
//     })
//   }
//   return DA(account1promise)
// }

// const account2 = () => {
//   if (!account2promise) {
//     account2promise = createAccount(account2Name, account2Name).then(res => {
//       return createAccountSettlement(account2Name, account2AccountNumber, account2RoutingNumber).then(() => res.body)
//     })
//   }
//   return DA(account2promise)
// }

const getApi = (path, headers = {}) => RequestApi.get(path).auth('admin', 'admin').set(headers)

// const postApi = (path, data, contentType = 'application/json') => RequestApi.post(path).set('Content-Type', contentType).send(data)
const postApi = (path, headers, data) => RequestApi.post(path).set(headers).send(data)

const putApi = (path, data, auth = {
  name: 'admin',
  password: 'admin',
  emailAddress: 'admin@test.com'
}, contentType = 'application/vnd.interoperability.transfers+json;version=1.0') => RequestApi.put(path).auth(auth.name, auth.password, auth.emailAddress).set('Content-Type', contentType).send(data)

// const getAdmin = (path, headers = {}) => RequestAdmin.get(path).set(headers)

// const postAdmin = (path, data, contentType = 'application/json') => RequestAdmin.post(path).set('Content-Type', contentType).send(data)

// const putAdmin = (path, data, contentType = 'application/json') => RequestAdmin.put(path).set('Content-Type', contentType).send(data)

// const createAccount = (accountName, password = '1234', emailAddress = accountName + '@test.com') => postApi('/accounts', {
//   name: accountName,
//   password: password,
//   emailAddress: emailAddress
// })

// const createAccountSettlement = (accountName, accountNumber, routingNumber) => putApi(`/accounts/${accountName}/settlement`, {
//   account_number: accountNumber,
//   routing_number: routingNumber
// })

// const getAccount = (accountName) => getApi(`/accounts/${accountName}`)

// const updateAccount = (accountName, isDisabled) => putAdmin(`/accounts/${accountName}`, {is_disabled: isDisabled})

// const getTransfer = (transferId) => getApi(`/transfers/${transferId}`)

// const getFulfillment = (transferId) => getApi(`/transfers/${transferId}/fulfillment`)

// const prepareTransfer = (transferId, transfer) => Promise.resolve(putApi(`/transfers/${transferId}`, transfer))
const create = (transfer) => Promise.resolve(postApi('/transfers', transfer))

// const fulfillTransfer = (transferId, fulfillment, auth) => putApi(`/transfers/${transferId}/fulfillment`, fulfillment, auth, 'text/plain')

// const rejectTransfer = (transferId, reason, auth) => putApi(`/transfers/${transferId}/rejection`, reason, auth)

// const createCharge = (payload) => postAdmin('/charges', payload)

// const updateCharge = (name, payload) => putAdmin(`/charges/${name}`, payload)

module.exports = {
  getApi,
  postApi,
  create,
  putApi
}
