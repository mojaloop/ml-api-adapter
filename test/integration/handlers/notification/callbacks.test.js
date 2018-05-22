'use strict'

const src = '../../../../src'
const Test = require('tape')
const CallbackService = require(`${src}/handlers/notification/callbacks.js`)
// const Fixtures = require('../../../fixtures')
let url = process.env.ENDPOINT_URL
console.log(process.env)
console.log('URL===========', url)
console.log('URL111===========', url)

Test('callback service', function (modelTest) {
  modelTest.test('prepare should', function (sendCallbackTest) {
    sendCallbackTest.test('send a callback and return 200 status', function (assert) {
      // let transfer = Fixtures.buildTransfer(Fixtures.generateTransferId())

      const message = {
        value: {
          metadata: {
            event: {
              type: 'prepare',
              action: 'prepare',
              status: 'success'
            }
          },
          content: {
            headers: {},
            payload: {}
          },
          to: 'dfsp2',
          from: 'dfsp1'
        }
      }
      const method = 'post'
      const headers = {}

      CallbackService.sendCallback(url, method, headers, message).then(result => {
        assert.equal(result, 200)
        assert.pass()
        assert.end()
      })
    })

    sendCallbackTest.end()
  })
  modelTest.end()
})
