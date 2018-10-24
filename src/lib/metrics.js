'use strict'
/**
 * Created by pedro barreto on 24/Oct/2018.
 */

const client = require('prom-client')

let alreadySetup = false
let histograms = []

const setup = () => {
  if (alreadySetup) {
    return
  }

  // console.log('setting up metrics...')

  client.collectDefaultMetrics({timeout: 5000, prefix: 'node'}) // TODO move to config
  client.register.metrics()

  alreadySetup = true
}

const getHistogram = (name, help = null, labelNames = []) => {
  try {
    if (histograms[name]) {
      return histograms[name]
    }

    histograms[name] = new client.Histogram({
      name: name,
      help: help || `${name}_histogram`,
      labelNames: labelNames,
      buckets: [0.010, 0.050, 0.1, 0.5, 1, 2, 5] // this is in seconds - the startTimer().end() collects in seconds with ms precision
    })
    return histograms[name]
  } catch (e) {
    throw new Error(`Couldn't get metrics histogram for ${name}`)
  }
}

const getMetricsForPrometheus = () => {
  return client.register.metrics()
}

exports.getHistogram = getHistogram
exports.getMetricsForPrometheus = getMetricsForPrometheus

setup() // FIXME
