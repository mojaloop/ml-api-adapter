'use strict'

const src = '../../../src'
const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Config = require(`${src}/lib/config`)
const Proxyquire = require('proxyquire')
const Endpoints = require('@mojaloop/central-services-shared').Util.Endpoints
const Boom = require('@hapi/boom')
const Kafka = require('@mojaloop/central-services-stream').Util

Test('setup', setupTest => {
  let sandbox
  let oldHostName
  const hostName = 'http://test.com'
  let Setup
  let RegisterHandlersStub
  let PluginsStub
  let HapiStub
  let serverStub

  setupTest.beforeEach(test => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Endpoints, 'initializeCache').returns(Promise.resolve(true))
    sandbox.stub(Kafka.Producer, 'connectAll').returns(Promise.resolve(true))

    PluginsStub = {
      registerPlugins: sandbox.stub().returns(Promise.resolve())
    }

    serverStub = {
      connection: sandbox.stub(),
      register: sandbox.stub(),
      ext: sandbox.stub(),
      start: sandbox.stub(),
      method: sandbox.stub(),
      info: {
        uri: sandbox.stub()
      }
    }

    HapiStub = {
      Server: sandbox.stub().returns(serverStub)
    }

    RegisterHandlersStub = {
      registerAllHandlers: sandbox.stub().returns(Promise.resolve()),
      registerNotificationHandler: sandbox.stub().returns(Promise.resolve())
    }

    Setup = Proxyquire('../../../src/shared/setup', {
      '../handlers/register': RegisterHandlersStub,
      './plugins': PluginsStub,
      '@hapi/hapi': HapiStub,
      '../lib/config': Config
    })

    oldHostName = Config.HOSTNAME
    Config.HOSTNAME = hostName

    test.end()
  })

  setupTest.afterEach(test => {
    sandbox.restore()

    Config.HOSTNAME = oldHostName

    test.end()
  })

  setupTest.test('createServer should', async (createServerTest) => {
    createServerTest.test('throw error on fail', async (test) => {
      const errorToThrow = new Boom.Boom('Throw error')

      PluginsStub = {
        registerPlugins: sandbox.stub().returns(Promise.resolve())
      }

      serverStub = {
        register: sandbox.stub(),
        start: sandbox.stub().throws(errorToThrow),
        info: { uri: 'http://server-info-uri' }
      }

      HapiStub = {
        Server: sandbox.stub().returns(serverStub)
      }

      Setup = Proxyquire('../../../src/shared/setup', {
        '@hapi/hapi': HapiStub,
        './plugins': PluginsStub,
        '../lib/config': Config
      })

      Setup.createServer(200, []).then(() => {
        test.fail('Should not have successfully created server')
        test.end()
      }).catch(err => {
        test.ok(err instanceof Error)
        test.end()
      })
    })
    createServerTest.end()
  })

  setupTest.test('initialize should', async (initializeTest) => {
    initializeTest.test('return hapi server for "api"', async (test) => {
      const service = 'api'

      Setup.initialize({ service }).then(s => {
        test.equal(s, serverStub)
        test.end()
      }).catch(err => {
        test.fail(`Should have not received an error: ${err}`)
        test.end()
      })
    })

    initializeTest.test('return hapi server for "api" and register producers', async (test) => {
      const service = 'api'
      Config.HANDLERS_DISABLED = true
      Setup.initialize({ service }).then(s => {
        test.equal(s, serverStub)
        Config.HANDLERS_DISABLED = false
        test.end()
      }).catch(err => {
        test.fail(`Should have not received an error: ${err}`)
        test.end()
      })
    })

    initializeTest.test('return hapi server for "handler"', async (test) => {
      const service = 'handler'

      Setup.initialize({ service }).then(s => {
        test.equal(s, serverStub)
        test.end()
      }).catch(err => {
        test.fail(`Should have not received an error: ${err}`)
        test.end()
      })
    })

    initializeTest.test('return throw an exception for server "undefined"', async (test) => {
      const service = 'undefined'

      Setup.initialize({ service }).then(s => {
        test.equal(s, serverStub)
        test.end()
      }).catch(err => {
        test.ok(err.message === `No valid service type ${service} found!`)
        test.end()
      })
    })

    initializeTest.test('run Handlers if runHandlers flag enabled and start API', async (test) => {
      const service = 'handler'

      Setup.initialize({ service, runHandlers: true }).then((s) => {
        test.ok(RegisterHandlersStub.registerAllHandlers.called)
        test.equal(s, serverStub)
        test.end()
      }).catch(err => {
        test.fail(`Should have not received an error: ${err}`)
        test.end()
      })
    })

    initializeTest.test('run Handlers if runHandlers flag enabled and DONT start API', async (test) => {
      const ConfigStub = Config
      ConfigStub.HANDLERS_API_DISABLED = true

      Setup = Proxyquire('../../../src/shared/setup', {
        '../handlers/register': RegisterHandlersStub,
        './plugins': PluginsStub,
        '@hapi/hapi': HapiStub,
        '../lib/config': ConfigStub
      })

      const service = 'handler'

      sandbox.stub(Config, 'HANDLERS_API_DISABLED').returns(true)
      Setup.initialize({ service, runHandlers: true }).then((s) => {
        test.ok(RegisterHandlersStub.registerAllHandlers.called)
        test.equal(s, undefined)
        test.end()
      }).catch(err => {
        test.fail(`Should have not received an error: ${err}`)
        test.end()
      })
    })

    initializeTest.test('dont initialize the instrumentation if the INSTRUMENTATION_METRICS_DISABLED is disabled', async (test) => {
      const ConfigStub = Config
      ConfigStub.HANDLERS_API_DISABLED = true
      ConfigStub.INSTRUMENTATION_METRICS_DISABLED = true

      Setup = Proxyquire('../../../src/shared/setup', {
        '../handlers/register': RegisterHandlersStub,
        './plugins': PluginsStub,
        '@hapi/hapi': HapiStub,
        '../lib/config': ConfigStub
      })

      const service = 'handler'

      sandbox.stub(Config, 'HANDLERS_API_DISABLED').returns(true)
      Setup.initialize({ service, runHandlers: true }).then((s) => {
        test.ok(RegisterHandlersStub.registerAllHandlers.called)
        test.equal(s, undefined)
        test.end()
      }).catch(err => {
        test.fail(`Should have not received an error: ${err}`)
        test.end()
      })
    })

    initializeTest.test('run invalid Handler if runHandlers flag enabled with handlers[] populated', async (test) => {
      const service = 'api'

      const notificationHandler = {
        type: 'notification',
        enabled: true
      }

      const unknownHandler = {
        type: 'undefined',
        enabled: true
      }

      const modulesList = [
        notificationHandler,
        unknownHandler
      ]

      Setup.initialize({ service, runHandlers: true, handlers: modulesList }).then(() => {
        test.fail('Expected exception to be thrown')
        test.end()
      }).catch(err => {
        console.log(err)
        test.ok(RegisterHandlersStub.registerNotificationHandler.called)
        test.notOk(RegisterHandlersStub.registerAllHandlers.called)
        test.ok(err.message === `Handler Setup - ${JSON.stringify(unknownHandler)} is not a valid handler to register!`)
        test.end()
      })
    })

    initializeTest.test('run Handler if runHandlers flag enabled with handlers[] populated', async (test) => {
      const service = 'api'

      const notificationHandler = {
        type: 'notification',
        enabled: true
      }

      const modulesList = [
        notificationHandler
      ]

      Setup.initialize({ service, runHandlers: true, handlers: modulesList }).then(() => {
        test.ok(RegisterHandlersStub.registerNotificationHandler.called)
        test.notOk(RegisterHandlersStub.registerAllHandlers.called)
        test.end()
      }).catch(err => {
        test.fail(`Should have not received an error: ${err}`)
        test.end()
      })
    })

    initializeTest.test('run no Handlers if runHandlers flag enabled with handlers[] populated and the notificationHandler is disabled', async (test) => {
      const service = 'api'

      const notificationHandler = {
        type: 'notification',
        enabled: false
      }

      const modulesList = [
        notificationHandler
      ]

      Setup.initialize({ service, runHandlers: true, handlers: modulesList }).then(() => {
        test.notOk(RegisterHandlersStub.registerNotificationHandler.called)
        test.notOk(RegisterHandlersStub.registerAllHandlers.called)
        test.end()
      }).catch(err => {
        test.fail(`Should have not received an error: ${err}`)
        test.end()
      })
    })

    initializeTest.test('run all Handlers if runHandlers flag enabled with handlers[] is empty', async (test) => {
      const service = 'api'

      const modulesList = []

      Setup.initialize({ service, runHandlers: true, handlers: modulesList }).then(() => {
        test.notOk(RegisterHandlersStub.registerNotificationHandler.called)
        test.ok(RegisterHandlersStub.registerAllHandlers.called)
        test.end()
      }).catch(err => {
        test.fail(`Should have not received an error: ${err}`)
        test.end()
      })
    })

    initializeTest.end()
  })

  setupTest.end()
})
