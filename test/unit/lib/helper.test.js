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

 - Shashikant Hirugade <shashikant.hirugade@gatesfoundation.com>
 --------------
 ******/

'use strict'

const src = '../../../src'
const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Logger = require('@mojaloop/central-services-shared').Logger
const Helper = require(`${src}/lib/helper`)
const P = require('bluebird')

Test('Helper', async helperTest => {
  let sandbox, server

  helperTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()

    server = {
      methods: {
        getEndpoints: sandbox.stub()
      }
    }
    sandbox.stub(Logger)

    t.end()
  })

  helperTest.afterEach(t => {
    sandbox.restore()
    t.end()
  })

  await helperTest.test('getEndpoint should', async getEndpointTest => {
    await getEndpointTest.test('return the endpoint for given fsp and type', async test => {
      const fsp = 'dfsp1'
      const endpoints = {
        FSIOP_CALLBACK_URL_TRANSFER_POST: 'http://somehost:port/transfers',
        FSIOP_CALLBACK_URL_TRANSFER_PUT: 'http://somehost:port/transfers/{{transferId}}',
        FSIOP_CALLBACK_URL_TRANSFER_ERROR: 'http://somehost:port/transfers/{{transferId}}/error'
      }
      server.methods.getEndpoints.withArgs(fsp).returns(P.resolve(endpoints))

      try {
        const result = await Helper.getEndpoint(server, fsp, 'FSIOP_CALLBACK_URL_TRANSFER_POST')
        test.equal(result, endpoints['FSIOP_CALLBACK_URL_TRANSFER_POST'], 'Results Match')
        test.end()
      } catch (e) {
        test.fail('Error thrown', e)
        test.end()
      }
    })

    await getEndpointTest.test('should throw error', async test => {
      const fsp = 'dfsp1'
      server.methods.getEndpoints.withArgs(fsp).throws(new Error())

      try {
        await Helper.getEndpoint(server, fsp, 'FSIOP_CALLBACK_URL_TRANSFER_POST')
        test.fail('Should fail')
        test.end()
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })

    await getEndpointTest.end()
  })
  await helperTest.end()
})
