// dependencies
const deepEqual = require('fast-deep-equal')

// constants

// library
async function patchUser (original, patch) {
  for (const field in patch) {
    if (field === 'contact_points') {
      for (const patchContactPoint of patch.contact_points) {
        let existingContactPoint

        if (original.contact_points) {
          // prefer a match based on primary key
          if (patchContactPoint.id) {
            ([existingContactPoint] = original.contact_points.filter(
              existingContactPoint => existingContactPoint.id === patchContactPoint.id
            ))
          }

          // try to match based on content
          if (!existingContactPoint) {
            // trim out any empty keys—existing won't include them
            if (typeof patchContactPoint.data === 'object') {
              for (const key in patchContactPoint.data) {
                if (patchContactPoint.data[key] === null) {
                  delete patchContactPoint.data[key]
                }
              }
            }

            ([existingContactPoint] = original.contact_points.filter(
              existingContactPoint => existingContactPoint.kind === patchContactPoint.kind &&
                                      deepEqual(existingContactPoint.data, patchContactPoint.data)
            ))
          }
        } else {
          original.contact_points = []
        }

        if (existingContactPoint) {
          existingContactPoint.kind = patchContactPoint.kind
          existingContactPoint.label = patchContactPoint.label
          existingContactPoint.data = patchContactPoint.data
        } else {
          original.contact_points.push(patchContactPoint)
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
      for (const relationship of patch.relationships) {
        let existingRelationship

        if (original.relationships) {
          ([existingRelationship] = original.relationships.filter(
            p => p.id === relationship.id ||
                 p.related_person_id === relationship.related_person_id
          ))
        } else {
          original.relationships = []
        }

        if (existingRelationship) {
          for (const relationshipField of ['kind', 'label', 'slot', 'notes']) {
            if (relationshipField in relationship) {
              existingRelationship[relationshipField] = relationship[relationshipField]
            }
          }
        } else {
          original.relationships.push(relationship)
        }
      }
    } else {
      original[field] = patch[field]
    }
  }

  return original
}

// exports
module.exports = patchUser
