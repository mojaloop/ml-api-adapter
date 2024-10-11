const Test = require('tapes')(require('tape'))
const utils = require('../../../../src/handlers/notification/utils')

Test('Notification utils Tests -->', utilsTests => {
  utilsTests.test('getRecursiveCause should return error itself if no message and cause', t => {
    const error = new Error()
    const result = utils.getRecursiveCause(error)
    t.equal(result, error)
    t.end()
  })

  utilsTests.end()
})
