const Test = require('tapes')(require('tape'))
const Logger = require('@mojaloop/central-services-logger')

const { logger } = require('../../../src/shared/logger')

Test('Logger wrapper tests -->', loggerTest => {
  loggerTest.test('should support all log levels', test => {
    Object.keys(Logger.levels).forEach(level => {
      test.doesNotThrow(() => logger[level]())
    })
    test.end()
  })

  loggerTest.test('should be called without any params', test => {
    // todo: think, if such case should throw an error
    test.doesNotThrow(() => logger.perf())
    test.end()
  })

  loggerTest.end()
})
