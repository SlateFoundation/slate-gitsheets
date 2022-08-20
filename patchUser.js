// dependencies
const deepEqual = require('fast-deep-equal')

// constants

// library
async function patchUser (original, patch) {
  for (const field in patch) {
    if (field === 'contact_points') {
      // build a fresh array to ensure deleted contact points get removed
      const mergedContactPoints = [];
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
        }

        if (existingContactPoint) {
          existingContactPoint.kind = patchContactPoint.kind
          existingContactPoint.label = patchContactPoint.label
          existingContactPoint.data = patchContactPoint.data
        }

        mergedContactPoints.push(existingContactPoint || patchContactPoint)
      }

      original.contact_points = mergedContactPoints
    } else if (field === 'mappings') {
      // build a fresh array to ensure deleted mappings get removed
      const mergedMappings = [];
      for (const mapping of patch.mappings) {
        let existingMapping

        if (original.mappings) {
          ([existingMapping] = original.mappings.filter(
            p => p.connection === mapping.connection &&
                 p.kind === mapping.kind &&
                 (p.field === mapping.field || (!p.field && mapping.field === 'id'))
          ))
        }

        if (existingMapping) {
          existingMapping.field = mapping.field
          existingMapping.key = mapping.key
          existingMapping.matched_via = mapping.matched_via
        }

        mergedMappings.push(existingMapping || mapping)
      }

      original.mappings = mergedMappings
    } else if (field === 'relationships') {
      // build a fresh array to ensure deleted relationships get removed
      const mergedRelationships = [];
      for (const relationship of patch.relationships) {
        let existingRelationship

        if (original.relationships) {
          ([existingRelationship] = original.relationships.filter(
            p => p.id === relationship.id ||
                 p.related_person_id === relationship.related_person_id
          ))
        }

        if (existingRelationship) {
          for (const relationshipField of ['kind', 'label', 'slot', 'notes']) {
            if (relationshipField in relationship) {
              existingRelationship[relationshipField] = relationship[relationshipField]
            }
          }
        }

        mergedRelationships.push(existingRelationship || relationship)
      }

      original.relationships = mergedRelationships
    } else {
      original[field] = patch[field]
    }
  }

  return original
}

// exports
module.exports = patchUser
