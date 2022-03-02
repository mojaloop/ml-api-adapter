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

 * Shashikant Hirugade <shashikant.hirugade@modusbox.com>
 --------------
 ******/
'use strict'

const src = '../../../src/'
const Test = require('tapes')(require('tape'))
const Util = require('@mojaloop/central-services-shared').Util
const Default = require('../../../config/default.json')
const Proxyquire = require('proxyquire')

Test('Config tests', configTest => {
  let sandbox
  const Sinon = require('sinon')

  configTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    t.end()
  })

  configTest.afterEach(t => {
    sandbox.restore()
    t.end()
  })

  configTest.test('getFileContent should', async getFileContentTest => {
    getFileContentTest.test('should not throw', test => {
      try {
        const DefaultStub = Util.clone(Default)
        DefaultStub.ENDPOINT_SECURITY.JWS.JWS_SIGN = true
        const Config = Proxyquire(`${src}/lib/config`, {
          '../../config/default.json': DefaultStub
        })
        test.ok(Config)
        test.ok('pass')
      } catch (e) {
        test.fail('should throw')
      }
      test.end()
    })

    getFileContentTest.test('should pass ENV var MLAPI_PROTOCOL_VERSIONS__ACCEPT__VALIDATELIST as a string', test => {
      try {
        const DefaultStub = Util.clone(Default)
        DefaultStub.ENDPOINT_SECURITY.JWS.JWS_SIGN = true
        // set env var
        const validateList = ['1']
        process.env.MLAPI_PROTOCOL_VERSIONS__CONTENT__VALIDATELIST = JSON.stringify(validateList)
        process.env.MLAPI_PROTOCOL_VERSIONS__ACCEPT__VALIDATELIST = JSON.stringify(validateList)
        const Config = Proxyquire(`${src}/lib/config`, {
          '../../config/default.json': DefaultStub
        })
        test.ok(Config)
        console.log('config', JSON.stringify(Config.PROTOCOL_VERSIONS))
        test.ok('pass')
        test.deepEqual(Config.PROTOCOL_VERSIONS.ACCEPT.VALIDATELIST, validateList)
        test.deepEqual(Config.PROTOCOL_VERSIONS.CONTENT.VALIDATELIST, validateList)
      } catch (e) {
        test.fail('should throw')
      } finally {
        // remove env vars so they will not impact other tests
        delete process.env.MLAPI_PROTOCOL_VERSIONS__CONTENT__VALIDATELIST
        delete process.env.MLAPI_PROTOCOL_VERSIONS__ACCEPT__VALIDATELIST
      }
      test.end()
    })

    getFileContentTest.test('variables in default.json should be strings, not numbers', test => {
      // Arrange
      const DefaultStub = Util.clone(Default)
      DefaultStub.PROTOCOL_VERSIONS = {
        CONTENT: {
          DEFAULT: '1.1',
          VALIDATELIST: [
            '1.1'
          ]
        },
        ACCEPT: {
          DEFAULT: '1.0',
          VALIDATELIST: [
            '1'
          ]
        }
      }
      const expected = {
        CONTENT: {
          DEFAULT: '1.1',
          VALIDATELIST: [
            '1.1'
          ]
        },
        ACCEPT: {
          DEFAULT: '1.0',
          VALIDATELIST: [
            '1'
          ]
        }
      }

      // Act
      const Config = Proxyquire(`${src}/lib/config`, {
        '../../config/default.json': DefaultStub
      })

      // Assert
      console.log('config', JSON.stringify(Config.PROTOCOL_VERSIONS))
      test.ok('pass')
      test.deepEqual(Config.PROTOCOL_VERSIONS, expected, 'PROTOCOL_VERSIONS should be parsed correctly')

      test.end()
    })

    getFileContentTest.test('throw error when file not found', test => {
      try {
        const DefaultStub = Util.clone(Default)
        DefaultStub.ENDPOINT_SECURITY.JWS.JWS_SIGN = true
        DefaultStub.ENDPOINT_SECURITY.JWS.JWS_SIGNING_KEY_PATH = '/fake/path'
        const Config = Proxyquire(`${src}/lib/config`, {
          '../../config/default.json': DefaultStub
        })
        test.fail(Config)
        test.fail('should throw')
      } catch (e) {
        test.ok(e, 'File /fake/path doesn\'t exist, can\'t enable JWS signing')
      }
      test.end()
    })

    getFileContentTest.end()
  })

  configTest.end()
})
