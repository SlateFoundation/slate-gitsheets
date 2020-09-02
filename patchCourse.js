// dependencies

// constants

// library
async function patchCourse (original, patch) {
  for (const field in patch) {
    if (field === 'mappings') {
      for (const mapping of patch.mappings) {
        let existingMapping

        if (original.mappings) {
          ([existingMapping] = original.mappings.filter(
            p => p.connection === mapping.connection &&
              p.kind === mapping.kind &&
              (p.field === mapping.field || (!p.field && mapping.field === 'id'))
          ))
        } else {
          original.mappings = []
        }

        if (existingMapping) {
          existingMapping.field = mapping.field
          existingMapping.key = mapping.key
          existingMapping.matched_via = mapping.matched_via
        } else {
          original.mappings.push(mapping)
        }
      }
    } else {
      original[field] = patch[field]
    }
  }

  return original
}

// exports
module.exports = patchCourse
