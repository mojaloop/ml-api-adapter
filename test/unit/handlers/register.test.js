'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const P = require('bluebird')
const Handlers = require('../../../src/handlers/register')
const NotificationHandler = require('../../../src/handlers/notification')

Test('handlers', handlersTest => {
  let sandbox

  handlersTest.beforeEach(test => {
    sandbox = Sinon.createSandbox()
    test.end()
  })

  handlersTest.afterEach(test => {
    sandbox.restore()
    test.end()
  })

  handlersTest.test('handlers test should', registerAllTest => {
    registerAllTest.test('register all handlers', async (test) => {
      sandbox.stub(NotificationHandler, 'startConsumer').returns(P.resolve(true))
      const result = await Handlers.registerAllHandlers()
      test.ok(NotificationHandler.startConsumer.called)
      test.equal(result, true)
      test.end()
    })

    registerAllTest.test('throw error when transfer handler throws error', async (test) => {
      try {
        var error = new Error('Here be dragons!')
        Sinon.stub(NotificationHandler, 'startConsumer').throws(error)
        await Handlers.registerAllHandlers()
        test.fail('Error not thrown')
        test.end()
      } catch (e) {
        test.ok(NotificationHandler.startConsumer.called)
        test.ok(e === error)
        test.pass('Error thrown')
        test.end()
      }
    })

    registerAllTest.end()
  })

  handlersTest.end()
})
