/**
 * unwrapResponse
 *
 * Use this function to unwrap the innner response body and code from an async Handler
 */
const unwrapResponse = async (asyncFunction) => {
  let responseBody
  let responseCode
  const nestedReply = {
    response: (response) => {
      responseBody = response
      return {
        code: statusCode => {
          responseCode = statusCode
        }
      }
    }
  }
  await asyncFunction(nestedReply)

  return {
    responseBody,
    responseCode
  }
}

function createRequest (routes) {
  let value = routes || []
  return {
    server: {
      table: () => {
        return [{ table: value }]
      }
    }
  }
}

module.exports = {
  createRequest,
  unwrapResponse
}
