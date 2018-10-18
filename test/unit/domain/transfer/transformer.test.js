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

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
// const P = require('bluebird')
const Transformer = require('../../../../src/domain/transfer/transformer')
// const Utility = require('../../../../src/lib/utility')

const headerDataExample = {
  'Content-Type': 'application/vnd.interoperability.transfers+json;version=1.0',
  'FSPIOP-Source': 'central-switch',
  'FSPIOP-Destination': 'payerfsp'
}

Test('Transfer Transformer tests', TransformerTest => {
  let sandbox

  TransformerTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    t.end()
  })

  TransformerTest.afterEach(t => {
    sandbox.restore()
    t.end()
  })

  TransformerTest.test('Transformer.transformHeaders() should', transformHeadersTest => {
    transformHeadersTest.test('Remove content-length from Header', async test => {
      const key = 'Content-Length'
      const val = 1234
      const headerData = Object.assign({}, headerDataExample)
      headerData[key] = val

      var transformedHeaderData = Transformer.transformHeaders(headerData)

      for (var headerKey in headerDataExample) {
        test.equals(transformedHeaderData[headerKey], headerDataExample[headerKey])
      }
      test.equals(transformedHeaderData[key], undefined)
      test.end()
    })

    transformHeadersTest.test('Translate Date field into correct format for String value', async test => {
      const key = 'Date'
      const val = '2018-09-13T13:52:15.221Z'
      const date = new Date(val)
      const headerData = Object.assign({}, headerDataExample)
      headerData[key] = val

      var transformedHeaderData = Transformer.transformHeaders(headerData)

      for (var headerKey in headerDataExample) {
        test.equals(transformedHeaderData[headerKey], headerDataExample[headerKey])
      }
      test.equals(transformedHeaderData[key], date.toUTCString())
      test.end()
    })

    transformHeadersTest.test('Translate Date field into correct format for String value', async test => {
      const key = 'Date'
      const date = '2018-09-13T13:52:15.221Z'
      const val = new Date(date)
      const headerData = Object.assign({}, headerDataExample)
      headerData[key] = val

      var transformedHeaderData = Transformer.transformHeaders(headerData)

      for (var headerKey in headerDataExample) {
        test.equals(transformedHeaderData[headerKey], headerDataExample[headerKey])
      }
      test.equals(transformedHeaderData[key], val.toUTCString())
      test.end()
    })

    transformHeadersTest.test('Translate Date field for badly formatted string', async test => {
      const key = 'Date'
      const val = '2018-0'
      const headerData = Object.assign({}, headerDataExample)
      headerData[key] = val

      var transformedHeaderData = Transformer.transformHeaders(headerData)

      for (var headerKey in headerDataExample) {
        test.equals(transformedHeaderData[headerKey], headerDataExample[headerKey])
      }
      test.equals(transformedHeaderData[key], val)
      test.end()
    })

    transformHeadersTest.end()
  })
  TransformerTest.end()
})
