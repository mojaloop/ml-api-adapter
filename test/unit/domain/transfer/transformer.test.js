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
 * Miguel de Barros <miguel.debarros@modusbox.com>

 --------------
 ******/
'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
// const P = require('bluebird')
const Transformer = require('../../../../src/domain/transfer/transformer')
const ENUM = require('../../../../src/lib/enum')
// const Utility = require('../../../../src/lib/utility')
const Util = require('../../../../src/lib/util')

const headerConfigExample = {
  httpMethod: 'PUT',
  sourceFsp: 'switch',
  destinationFsp: 'FSPDest'
}

const headerDataInputExample = {
  'Content-Type': 'application/vnd.interoperability.transfers+json;version=1.0',
  'Content-Length': '1234',
  'FSPIOP-Source': headerConfigExample.sourceFsp,
  'FSPIOP-Destination': headerConfigExample.destinationFsp,
  'FSPIOP-Http-Method': 'PUT',
  'FSPIOP-Signature': '{"signature":"iU4GBXSfY8twZMj1zXX1CTe3LDO8Zvgui53icrriBxCUF_wltQmnjgWLWI4ZUEueVeOeTbDPBZazpBWYvBYpl5WJSUoXi14nVlangcsmu2vYkQUPmHtjOW-yb2ng6_aPfwd7oHLWrWzcsjTF-S4dW7GZRPHEbY_qCOhEwmmMOnE1FWF1OLvP0dM0r4y7FlnrZNhmuVIFhk_pMbEC44rtQmMFv4pm4EVGqmIm3eyXz0GkX8q_O1kGBoyIeV_P6RRcZ0nL6YUVMhPFSLJo6CIhL2zPm54Qdl2nVzDFWn_shVyV0Cl5vpcMJxJ--O_Zcbmpv6lxqDdygTC782Ob3CNMvg\\",\\"protectedHeader\\":\\"eyJhbGciOiJSUzI1NiIsIkZTUElPUC1VUkkiOiIvdHJhbnNmZXJzIiwiRlNQSU9QLUhUVFAtTWV0aG9kIjoiUE9TVCIsIkZTUElPUC1Tb3VyY2UiOiJPTUwiLCJGU1BJT1AtRGVzdGluYXRpb24iOiJNVE5Nb2JpbGVNb25leSIsIkRhdGUiOiIifQ"}',
  'FSPIOP-Uri': '/transfers'
}

const headerDataTransformedExample = {
  'Content-Type': headerDataInputExample['Content-Type'],
  'FSPIOP-Source': headerDataInputExample['FSPIOP-Source'],
  'FSPIOP-Destination': headerDataInputExample['FSPIOP-Destination'],
  'FSPIOP-Http-Method': headerDataInputExample['FSPIOP-Http-Method']
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
    transformHeadersTest.test('Remove all unnecessary fields from Header', async test => {
      let headerData = Util.clone(headerDataInputExample)

      const transformedHeaderData = Transformer.transformHeaders(headerData, headerConfigExample)

      for (let headerKey in headerDataTransformedExample) {
        test.equals(transformedHeaderData[headerKey], headerDataTransformedExample[headerKey])
      }
      test.equals(transformedHeaderData[ENUM.headers.GENERAL.CONTENTLENGTH], undefined)
      test.end()
    })

    transformHeadersTest.test('Translate Date field into correct format for String value', async test => {
      const key = 'Date'
      const val = '2018-09-13T13:52:15.221Z'
      const date = new Date(val)
      let headerData = Util.clone(headerDataInputExample)
      headerData[key] = val

      const transformedHeaderData = Transformer.transformHeaders(headerData, headerConfigExample)

      for (let headerKey in headerDataTransformedExample) {
        test.equals(transformedHeaderData[headerKey], headerDataTransformedExample[headerKey])
      }
      test.equals(transformedHeaderData[key], date.toUTCString())
      test.end()
    })

    transformHeadersTest.test('Translate Date field into correct format for String value', async test => {
      const key = 'Date'
      const date = '2018-09-13T13:52:15.221Z'
      const val = new Date(date)
      let headerData = Util.clone(headerDataInputExample)
      headerData[key] = val

      const transformedHeaderData = Transformer.transformHeaders(headerData, headerConfigExample)

      for (let headerKey in headerDataTransformedExample) {
        test.equals(transformedHeaderData[headerKey], headerDataTransformedExample[headerKey])
      }
      test.equals(transformedHeaderData[key], val.toUTCString())
      test.end()
    })

    transformHeadersTest.test('Translate Date field for badly formatted string', async test => {
      const key = 'Date'
      const val = '2018-0'
      let headerData = Util.clone(headerDataInputExample)
      headerData[key] = val

      const transformedHeaderData = Transformer.transformHeaders(headerData, headerConfigExample)

      for (let headerKey in headerDataTransformedExample) {
        test.equals(transformedHeaderData[headerKey], headerDataTransformedExample[headerKey])
      }
      test.equals(transformedHeaderData[key], val)
      test.end()
    })

    transformHeadersTest.test('Transform the FSPIOP-HTTP-METHOD to match the HTTP operation if header is provided and does not match incoming value', async test => {
      let headerData = Util.clone(headerDataInputExample)
      let headerConfig = Util.clone(headerConfigExample)
      headerConfig[ENUM.headers.FSPIOP.HTTP_METHOD] = 'GET'

      const transformedHeaderData = Transformer.transformHeaders(headerData, headerConfig)

      for (let headerKey in headerDataTransformedExample) {
        test.equals(transformedHeaderData[headerKey], headerDataTransformedExample[headerKey])
      }
      test.end()
    })

    transformHeadersTest.test('Transform to include the incoming signature when FSPIOP-Source does not match the switch regex', async test => {
      let headerData = Util.clone(headerDataInputExample)
      let headerConfig = Util.clone(headerConfigExample)

      headerData[ENUM.headers.FSPIOP.SOURCE] = 'randomFSP'

      const transformedHeaderData = Transformer.transformHeaders(headerData, headerConfig)

      for (let headerKey in headerDataTransformedExample) {
        test.equals(transformedHeaderData[headerKey], headerDataTransformedExample[headerKey])
      }
      test.equals(transformedHeaderData[ENUM.headers.FSPIOP.SIGNATURE], headerDataInputExample[ENUM.headers.FSPIOP.SIGNATURE])
      test.end()
    })

    transformHeadersTest.test('Transform to include map the destinationFsp even if the FSPIOP-Destination header was not included in the original request', async test => {
      let headerData = Util.clone(headerDataInputExample)

      // remove FSPIOP-Destination from the request
      Util.deleteFieldByCaseInsensitiveKey(headerData, ENUM.headers.FSPIOP.DESTINATION)

      let headerConfig = Util.clone(headerConfigExample)

      const transformedHeaderData = Transformer.transformHeaders(headerData, headerConfig)

      for (let headerKey in headerDataTransformedExample) {
        test.equals(Util.getValueByCaseInsensitiveKey(transformedHeaderData, headerKey), Util.getValueByCaseInsensitiveKey(headerDataTransformedExample, headerKey))
      }
      test.equals(transformedHeaderData[ENUM.headers.FSPIOP.SIGNATURE], headerDataInputExample[ENUM.headers.FSPIOP.SIGNATURE])
      test.end()
    })

    transformHeadersTest.test('Transform to include map the destinationFsp if the FSPIOP-Destination header was included in the original request but correctly mapped based on headerConfig', async test => {
      let headerData = Util.clone(headerDataInputExample)
      headerData[ENUM.headers.FSPIOP.HTTP_METHOD] = 'INVALID'

      // set FSPIOP-Destination from the request
      Util.setValueByCaseInsensitiveKey(headerData, ENUM.headers.FSPIOP.DESTINATION, 'TESTDEST')

      let headerConfig = Util.clone(headerConfigExample)

      const transformedHeaderData = Transformer.transformHeaders(headerData, headerConfig)

      for (let headerKey in headerDataTransformedExample) {
        test.equals(Util.getValueByCaseInsensitiveKey(transformedHeaderData, headerKey), Util.getValueByCaseInsensitiveKey(headerDataTransformedExample, headerKey))
      }
      test.equals(transformedHeaderData[ENUM.headers.FSPIOP.SIGNATURE], headerDataInputExample[ENUM.headers.FSPIOP.SIGNATURE])
      test.end()
    })

    transformHeadersTest.end()
  })
  TransformerTest.end()
})
