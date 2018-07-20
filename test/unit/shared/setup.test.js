'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Hapi = require('hapi')
const Config = require('../../../src/lib/config')
const Plugins = require('../../../src/shared/plugins')
const Proxyquire = require('proxyquire')
const Notification = require('../../../src/handlers/notification')

Test('setup', setupTest => {
  let sandbox
  let uuidStub
  let oldHostName
  let hostName = 'http://test.com'
  let Setup

  setupTest.beforeEach(test => {
    sandbox = Sinon.sandbox.create()
    sandbox.stub(Hapi, 'Server')
    sandbox.stub(Plugins, 'registerPlugins')
    sandbox.stub(Notification, 'startConsumer')

    uuidStub = sandbox.stub()

    Setup = Proxyquire('../../../src/shared/setup', { 'uuid4': uuidStub })

    oldHostName = Config.HOSTNAME
    Config.HOSTNAME = hostName

    test.end()
  })

  setupTest.afterEach(test => {
    sandbox.restore()
    Config.HOSTNAME = oldHostName
    test.end()
  })

  const createServer = () => {
    const server = {
      connection: sandbox.stub(),
      register: sandbox.stub(),
      ext: sandbox.stub(),
      start: sandbox.stub(),
      info: {
        uri: sandbox.stub()
      }
    }
    Hapi.Server.returns(server)
    return server
  }

  setupTest.test('initialize should', initializeTest => {
    const setupPromises = ({service}) => {
      const server = createServer()
      return server
    }

    initializeTest.test('start the kafka consumer and return hapi server', test => {
      const server = setupPromises({})

      Setup.initialize({}).then(s => {
        test.equal(s, server)
        test.end()
      })
    })

    initializeTest.end()
  })

  setupTest.end()
})
