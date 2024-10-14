'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const axios = require('axios')
const Base = require('../../base')
const Notification = require('../../../../src/handlers/notification')
const Producer = require('@mojaloop/central-services-stream').Util.Producer

Test('metadata routes', (metadataRoutesTest) => {
  let sandbox

  metadataRoutesTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Notification, 'isConnected')
    sandbox.stub(Producer, 'isConnected')
    sandbox.stub(axios, 'get')
    t.end()
  })

  metadataRoutesTest.afterEach(t => {
    sandbox.restore()
    t.end()
  })

  metadataRoutesTest.test('GET /health should return status OK', async function (t) {
    Notification.isConnected.resolves(true)
    Producer.isConnected.resolves(true)
    axios.get.resolves({ data: { status: 'OK' } })

    const req = Base.buildRequest({ url: '/health', method: 'GET' })
    const server = await Base.setup()
    const res = await server.inject(req)
    t.equal(res.statusCode, 200, 'Status code should be 200')
    t.equal(res.result.status, 'OK', 'Response status should be OK')
    await server.stop()
    t.end()
  })

  metadataRoutesTest.test('GET /health should return status DOWN if service is down', async function (t) {
    Notification.isConnected.resolves(false)
    Producer.isConnected.resolves(false)
    axios.get.resolves({ data: { status: 'DOWN' } })

    const req = Base.buildRequest({ url: '/health', method: 'GET' })
    const server = await Base.setup()

    // Simulate service down
    server.app.healthCheck = async () => ({ status: 'DOWN' })

    const res = await server.inject(req)
    t.equal(res.statusCode, 502, 'Status code should be 502')
    t.equal(res.result.status, 'DOWN', 'Response status should be DOWN')
    await server.stop()
    t.end()
  })

  metadataRoutesTest.end()
})
