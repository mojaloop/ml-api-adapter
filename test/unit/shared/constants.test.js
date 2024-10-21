const Test = require('tapes')(require('tape'))
const { PROM_METRICS } = require('../../../src/shared/constants')

const FX_METRIC_PREFIX = 'fx_'

Test('Constants tests -->', test => {
  test.test('should return valid FX metric names', test => {
    Object.keys(PROM_METRICS).forEach(key => {
      const metric = PROM_METRICS[key](true)
      test.ok(metric.startsWith(FX_METRIC_PREFIX))
    })
    test.end()
  })

  test.test('should not add FX prefix if no params passed to PROM_METRICS key', test => {
    const metric = PROM_METRICS.transferGet()
    test.ok(metric.startsWith(FX_METRIC_PREFIX) === false)
    test.end()
  })

  test.end()
})
