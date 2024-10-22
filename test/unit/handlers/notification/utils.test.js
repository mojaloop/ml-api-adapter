const Test = require('tapes')(require('tape'))
const utils = require('../../../../src/handlers/notification/utils')

Test('Notification utils Tests -->', utilsTests => {
  utilsTests.test('getRecursiveCause should return error itself if no message and cause', t => {
    const error = new Error()
    const result = utils.getRecursiveCause(error)
    t.equal(result, error)
    t.end()
  })

  utilsTests.test('getRecursiveCause should return error message if no cause', t => {
    const error = new Error()
    error.message = 'error message'
    const result = utils.getRecursiveCause(error)
    t.equal(result, 'error message')
    t.end()
  })

  utilsTests.end()
})
