'use strict'
/**
 * Created by pedro barreto on 24/Oct/2018.
 */

const Metrics = require('../../lib/metrics')

exports.metrics = function (request, h) {
  return h.response(Metrics.getMetricsForPrometheus()).code(200)
}
