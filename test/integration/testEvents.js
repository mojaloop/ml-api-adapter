// place this CommonTests object into Collection Pre-Request scripts area. Then it can be accessed from the

// var URL = require('url').URL maybe this will be fixed in next postman version
const CommonTests = {
  EFKtest: function (pm, url, transferId, response, expectations) {
    // const url = (new URL('/_all/_search?pretty', host)).toString()
    const results = {
      mojaloop: new Map(),
      apm: new Map(),
      fail: false
    }
    pm.sendRequest({
      url,
      method: 'POST',
      header: 'content-type:application/json',
      body: {
        mode: 'raw',
        raw: JSON.stringify({
          query: {
            query_string: {
              query: `(metadata.trace.tags.transactionId:"${transferId}" OR labels.transactionId:"${transferId}")`
            }
          },
          size: 20
        })
      }
    }, function (err, res) {
      if (err) console.log('Error ', err)
      const body = res.json()

      pm.test('response to have status code 202', function () {
        pm.expect(response).to.have.status(202)
      })

      pm.test('result to have entries matching the response hits entries', function () {
        pm.expect(body.hits.hits.length).to.eql(body.hits.total.value)
      })
      body.hits.hits.forEach(entry => {
        if (entry._index.match(/mojaloop*/)) {
          const { type, action } = entry._source.metadata.event
          if (results.mojaloop.has(`${entry._source.metadata.trace.service}`)) {
            const record = results.mojaloop.get(`${entry._source.metadata.trace.service}`)
            record.push({ type, action })
            results.mojaloop.set(`${entry._source.metadata.trace.service}`, record)
          } else {
            results.mojaloop.set(`${entry._source.metadata.trace.service}`, [{ type, action }])
          }
        } else if (entry._index.match(/apm*/)) {
          results.apm.set(entry._source.transaction.name, { labels: entry._source.labels })
        } else {
          results.reason = 'more indexes found'
          results.fail = true
        }
      })

      pm.test('indexes to match only mojaloop and apm', function () {
        pm.expect(results.fail).to.eql(false)
        pm.test('mojaloop index values match the expected count and values', () => {
          pm.expect(results.mojaloop.size).to.eql(expectations.mojaloop.size)
          for (const [key, value] of results.mojaloop) {
            pm.expect(value).to.include.all.deep.members(expectations.mojaloop.get(key))
          }
        })
        pm.test('apm index values match the expected count and values', function () {
          pm.expect(results.apm.size).to.eql(expectations.apm.size)
          for (const [key, value] of results.apm) {
            pm.expect(value).to.deep.eql(expectations.apm.get(key))
          }
        })
      })
    })
  }
}

// how to use it
// request is available into the test area.
// if you need to make a test, that is relaying on the response, you should pass pm.response to the common function
// expectations should be prepared as a Maps towards indexes that are expected (mojalooop and apm currently)

const request = {} // ADDED ONLY FOR STANDARDJS to stop complaining

const { payeeFsp, payerFsp, transferId } = JSON.parse(request.data)
const destination = request.headers['fspiop-destination']
const source = request.headers['fspiop-source']

const expectations = {
  mojaloop: new Map([
    ['cl_transfer_prepare',
      [{ action: 'egress', type: 'audit' },
        { action: 'start', type: 'audit' },
        { action: 'span', type: 'trace' }]
    ],
    ['ml_transfer_prepare',
      [{ action: 'start', type: 'audit' },
        { action: 'span', type: 'trace' }]
    ],
    ['cl_transfer_position',
      [{ action: 'egress', type: 'audit' },
        { action: 'start', type: 'audit' },
        { action: 'span', type: 'trace' }]
    ],
    ['ml_notification_event',
      [{ action: 'egress', type: 'audit' },
        { action: 'start', type: 'audit' },
        { action: 'span', type: 'trace' }]]
  ]),
  apm: new Map([
    ['ml_transfer_prepare', {
      labels: {
        transactionType: 'transfer',
        transactionAction: 'prepare',
        transactionId: transferId,
        source,
        destination,
        payerFsp,
        payeeFsp
      }
    }],
    ['cl_transfer_prepare', {
      labels: {
        transactionType: 'transfer',
        transactionAction: 'prepare',
        transactionId: transferId,
        source,
        destination,
        payerFsp,
        payeeFsp
      }
    }],
    ['cl_transfer_position', {
      labels: {
        transactionType: 'transfer',
        transactionAction: 'prepare', // WRONG
        transactionId: transferId,
        source,
        destination,
        payerFsp,
        payeeFsp
      }
    }],
    ['ml_notification_event', {
      labels: {
        transactionType: 'transfer',
        transactionAction: 'prepare', // WRONG
        transactionId: transferId,
        source,
        destination,
        payerFsp,
        payeeFsp
      }
    }]
  ])
}

const pm = {} // ADDED ONLY FOR STANDARDJS to stop complaining

setTimeout(() => CommonTests.EFKtest(pm, 'http://dev1-elasticsearch.mojaloop.live/_all/_search?pretty', transferId, pm.response, expectations), 20000)
