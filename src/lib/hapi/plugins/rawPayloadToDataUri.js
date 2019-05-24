const getRawBody = require('raw-body')
const encodePayload = require('@mojaloop/central-services-stream/src/kafka/protocol').encodePayload

const requestRawPayloadTransform = (request, payloadBuffer) => {
  try {
    return Object.assign(request, {
      payload: payloadBuffer.toString(),
      dataUri: encodePayload(payloadBuffer, request.headers['content-type']),
      rawPayload: payloadBuffer
    })
  } catch (e) {
    throw e
  }
}

/**
 * HAPI plugin to encode raw payload as base64 dataURI
 * the server settings should have the following settings:
 * routes: {
 *  payload: {
 *    output: 'stream',
 *    parse: true
 *  }
 * }
 *
 * provides the option to validate the request and keeps the raw bytes in the same time
 *
 * decorates the request with additionally:
 *
 * @param {string} payload payload to string for validation purposes. Prior the handler is executed the payload is changed to dataURI value
 * @param {string} dataURI base64 encoded string
 * @param {buffer} rawPayload the raw payload
 */

module.exports.plugin = {
  name: 'rawPayloadToDataUri',
  register: (server) => {
    if (server.settings.routes.payload.output === 'stream' && server.settings.routes.payload.parse) {
      server.ext([{
        type: 'onPostAuth',
        method: async (request, h) => {
          return getRawBody(request.payload)
            .then(rawBuffer => {
              request = requestRawPayloadTransform(request, rawBuffer)
              return h.continue
            }).catch(e => {
              return h.continue
            })
        }
      }])
    }
  }
}
