const mockFxPreparePayload = ({
  commitRequestId = '77c9d78d-c26a-4474-8b3c-99b96a814bfc',
  initiatingFsp = 'pinkbankfsp',
  counterPartyFsp = 'FDH_FX',
  condition = 'n2cwS3w4ekGlvNYoXg2uBAqssu3FCoXjADE2mziU5jU'
} = {}) => ({
  commitRequestId,
  initiatingFsp,
  counterPartyFsp,
  determiningTransferId: 'd9ce59d4-3598-4396-8630-581bb0551451',
  amountType: 'SEND',
  sourceAmount: {
    currency: 'BWP',
    amount: '300'
  },
  targetAmount: {
    currency: 'TZS',
    amount: '48000'
  },
  condition
})

const mockFxFulfilPayload = ({
  conversionState = 'RESERVED',
  fulfilment = 'WLctttbu2HvTsa1XWvUoGRcQozHsqeu9Ahl2JW9Bsu8',
  completedTimestamp = (new Date()).toISOString()
} = {}) => ({
  conversionState,
  fulfilment,
  completedTimestamp
})

module.exports = {
  mockFxPreparePayload,
  mockFxFulfilPayload
}
