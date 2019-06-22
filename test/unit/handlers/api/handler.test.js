'use strict'

const Test = require('tapes')(require('tape'))

Test('route handler', (handlerTest) => {
  handlerTest.beforeEach(t => {
    t.end()
  })

  handlerTest.afterEach(t => {
    t.end()
  })

  // TODO: copy tests across from metadata.handler.test

  handlerTest.end()
})
