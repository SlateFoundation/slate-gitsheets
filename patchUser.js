// dependencies

// constants

// library
async function patchUser (original, patch) {
  for (const field in patch) {
    if (field === 'contact_points') {
      for (const contactPoint of patch.contact_points) {
        let existingContactPoint

        if (original.contact_points) {
          ([existingContactPoint] = original.contact_points.filter(
            p => p.kind === contactPoint.kind &&
                 p.data === contactPoint.data
          ))
        } else {
          original.contact_points = []
        }

        if (existingContactPoint) {
          existingContactPoint.label = contactPoint.label
        } else {
          original.contact_points.push(contactPoint)
        }
      }
    } else if (field === 'mappings') {
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
    } else if (field === 'relationships') {
      throw new Error('merging relationships is not yet implemented')
    } else {
      original[field] = patch[field]
    }
  }

  return original
}

// exports
module.exports = patchUser
