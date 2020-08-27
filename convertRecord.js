function convertRecord (input, mappings) {
  const output = {}

  const unusedKeys = new Set(Object.keys(input))

  for (const field in mappings) {
    const config = mappings[field]

    if (typeof config === 'string') {
      const value = input[config]

      if (typeof value !== 'undefined') {
        output[field] = value === '' ? null : value
      }

      unusedKeys.delete(config)
    } else {
      if (!config.discard) {
        const value = config.convert(input)

        if (typeof value !== 'undefined') {
          output[field] = value
        }
      }

      if (config.field) {
        unusedKeys.delete(config.field)
      }

      if (config.fields) {
        config.fields.forEach(inputField => unusedKeys.delete(inputField))
      }
    }
  }

  if (unusedKeys.size > 0) {
    throw new Error(`input has unused keys remaining: ${[...unusedKeys].join(', ')}`)
  }

  return output
}

module.exports = convertRecord
