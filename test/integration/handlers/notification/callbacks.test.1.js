'use strict'

const src = '../../../../src'
const Test = require('tape')
const CallbackService = require(`${src}/handlers/notification/callbacks`)
let url = process.env.ENDPOINT_URL

Test('callback service', function (modelTest) {
  modelTest.test('prepare should', function (sendCallbackTest) {
    sendCallbackTest.test('send a callback and return 200 status', function (assert) {
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
        assert.end()
      })
    })

    sendCallbackTest.end()
  })
  modelTest.end()
})
