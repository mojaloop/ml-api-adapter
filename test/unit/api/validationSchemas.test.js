const test = require('tapes')(require('tape'))
const Joi = require('@hapi/joi')
const { transferHeadersSchema } = require('../../../src/api/validationSchemas')

// todo: move to a  separate file
const getRequiredSchemaFields = (schema) => {
  if (!Joi.isSchema(transferHeadersSchema)) throw new TypeError('Invalid Joi schema')

  const { keys } = schema.describe()
  return Object.entries(keys).reduce((r, [key, value]) => {
    if (value.flags?.presence === 'required') {
      r.push(key)
    }
    return r
  }, [])
}

test('Validation Schemas Tests', (vshTests) => {
  vshTests.test('transferSchema should fail if no required fields', (t) => {
    const headers = {}
    const { error } = transferHeadersSchema.validate(headers)

    t.ok(error instanceof Joi.ValidationError)
    const required = getRequiredSchemaFields(transferHeadersSchema)
    required.forEach(field => t.ok(error.message.includes(field)))
    t.end()
  })

  vshTests.end()
})
