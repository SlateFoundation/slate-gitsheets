// dependencies
const Repository = require('gitsheets/lib/Repository')
const convertRecord = require('./convertRecord')
const slateLoadMappings = require('./mappings/load')
const slateExtractMappings = require('./mappings/extract-slate')

// constants
const RELATED_INSERT_RE = /^\/(?<field>relationships|contact_points)\/(?<position>[0-9]+|-)$/
const RELATED_PATCH_RE = /^\/(?<field>relationships|contact_points)\/(?<position>[0-9]+|-)\/(?<subfield>[^/]+)$/
const PATCH_USER_KEY = Symbol('patch-user')
const PATCH_PATH_KEY = Symbol('patch-path')
const PATCH_SOURCE_KEY = Symbol('patch-source')
const COMMIT_ERRORS = []

// library
function logError (error) {
  console.error(error)
  COMMIT_ERRORS.push(error)
}

async function loadSlate ({ ref, host, hostName, token, emptyCommit, maxAge }) {
  const slateApi = require('./api')({ host, token })

  // load repository
  const repo = await Repository.getFromEnvironment({ ref })
  const git = await repo.getGit()
  const usersSheet = await repo.openSheet('users')

  // find most recent extract ancestor for this host
  const [ancestorHash, ancestorTimestamp] = (await git.log(ref, {
    pretty: 'format:%H %ct %(trailers:key=Extracted-from,valueonly)',
    grep: `^Extracted-from: ${hostName}$`,
    'max-count': 1
  })).split(' ')

  if (!ancestorHash) {
    throw new Error(`could not find an ancestor on ${ref} with /^Extracted-from: ${hostName}$/, run extract against same host first`)
  }

  // check age of ancestor
  const ancestorDate = new Date(ancestorTimestamp * 1000)
  const ancestorAge = Math.round((new Date() - ancestorDate) / 1000)

  if (ancestorAge > maxAge) {
    throw new Error(`ancestor commit ${ancestorHash.substr(0, 8)} is ${ancestorAge}s old, max age is ${maxAge}s`)
  }

  console.log(`using ${ancestorAge}s old ancestor ${ancestorHash.substr(0, 8)}`)

  // build operation batches
  const dirtyPeople = []
  const dirtyContactPoints = []
  const dirtyRelationships = []
  const peoplePatchMap = new Map()
  const contactPointPatchMap = new Map()
  const relationshipPatchMap = new Map()
  const dirtyUsers = new Set()
  const slatePeopleTemporaryIdMap = new Map()

  console.log('analyzing delta...')
  for await (const change of usersSheet.diffFrom(ancestorHash, { patches: true })) {
    console.log(`${change.status} ${change.path}\t${change.srcHash} -> ${change.dstHash}`)

    for (const { op, path, value } of change.patch) {
      const relatedInsertMatch = RELATED_INSERT_RE.exec(path)
      const { field: relatedInsertField, position: relatedInsertPosition } = relatedInsertMatch ? relatedInsertMatch.groups : {}

      if (op === 'add' && path === '/relationships') {
        console.log(`\tinsert ${value.length} relationship(s)`)
        for (const valueItem of value) {
          valueItem[PATCH_USER_KEY] = change.dst
          valueItem[PATCH_PATH_KEY] = path
          dirtyRelationships.push(valueItem)
        }
      } else if (op === 'add' && relatedInsertField === 'relationships') {
        console.log(`\tinsert relationship at position ${relatedInsertPosition === '-' ? change.src[relatedInsertField].length : relatedInsertPosition}`)
        value[PATCH_USER_KEY] = change.dst
        value[PATCH_PATH_KEY] = path
        dirtyRelationships.push(value)
      } else if (op === 'add' && path === '/contact_points') {
        console.log(`\tinsert ${value.length} contact point(s)`)
        for (const valueItem of value) {
          valueItem[PATCH_USER_KEY] = change.dst
          valueItem[PATCH_PATH_KEY] = path
          dirtyContactPoints.push(valueItem)
        }
      } else if (op === 'add' && relatedInsertField === 'contact_points') {
        console.log(`\tinsert contact point at position ${relatedInsertPosition === '-' ? change.src[relatedInsertField].length : relatedInsertPosition}`)
        value[PATCH_USER_KEY] = change.dst
        value[PATCH_PATH_KEY] = path
        dirtyContactPoints.push(value)
      } else if ((op === 'add' || op === 'replace') && path.lastIndexOf('/') === 0) {
        console.log(`\t${op} user field ${path.substr(1)} = ${value}`)

        let personPatch = peoplePatchMap.get(change.dst.id)
        if (!personPatch) {
          personPatch = {
            [PATCH_USER_KEY]: change.dst,
            [PATCH_PATH_KEY]: path
          }
          peoplePatchMap.set(change.dst.id, personPatch)
          dirtyPeople.push(personPatch)
        }

        personPatch[path.substr(1)] = value
      } else if (op === 'replace' && path === '') {
        console.log('\tadd new user')
        value[PATCH_USER_KEY] = change.dst
        value[PATCH_PATH_KEY] = path
        dirtyPeople.push(value)
      } else {
        const relatedPatchMatch = RELATED_PATCH_RE.exec(path)
        const {
          field: relatedPatchField,
          position: relatedPatchPosition,
          subfield: relatedPatchSubfield
        } = relatedPatchMatch ? relatedPatchMatch.groups : {}

        if (op === 'add' && relatedPatchField === 'relationships') {
          console.log(`\t${op} relationship field ${relatedPatchSubfield} = ${value}`)

          const relationshipId = change.dst[relatedPatchField][relatedPatchPosition].id
          let relationshipPatch = relationshipPatchMap.get(relationshipId)
          if (!relationshipPatch) {
            relationshipPatch = {
              id: relationshipId,
              [PATCH_USER_KEY]: change.dst,
              [PATCH_PATH_KEY]: path
            }
            relationshipPatchMap.set(relationshipId, relationshipPatch)
            dirtyRelationships.push(relationshipPatch)
          }

          relationshipPatch[relatedPatchSubfield] = value
        } else if (op === 'replace' && relatedPatchField === 'contact_points') {
          console.log(`\t${op} contact point field ${relatedPatchSubfield} = ${value}`)

          const contactPointId = change.dst[relatedPatchField][relatedPatchPosition].id
          let contactPointPatch = contactPointPatchMap.get(contactPointId)
          if (!contactPointPatch) {
            contactPointPatch = {
              id: contactPointId,
              [PATCH_USER_KEY]: change.dst,
              [PATCH_PATH_KEY]: path
            }
            contactPointPatchMap.set(contactPointId, contactPointPatch)
            dirtyContactPoints.push(contactPointPatch)
          }

          contactPointPatch[relatedPatchSubfield] = value
        } else if (op === 'replace' && relatedPatchField === 'relationships') {
          console.log(`\t${op} relationship field ${relatedPatchSubfield} = ${value}`)

          const relationshipId = change.dst[relatedPatchField][relatedPatchPosition].id
          let relationshipPatch = relationshipPatchMap.get(relationshipId)
          if (!relationshipPatch) {
            relationshipPatch = {
              id: relationshipId,
              [PATCH_USER_KEY]: change.dst,
              [PATCH_PATH_KEY]: path
            }
            relationshipPatchMap.set(relationshipId, relationshipPatch)
            dirtyRelationships.push(relationshipPatch)
          }

          relationshipPatch[relatedPatchSubfield] = value
        } else {
          throw new Error(`\tunhandled patch ${op} ${path}`)
        }
      }
    }
  }

  // prepare users batch upload
  console.log(`preparing batch upload for ${dirtyPeople.length} users...`)
  const slatePeoplePatches = []
  for (const patch of dirtyPeople) {
    const user = patch[PATCH_USER_KEY]
    const loadPatch = convertRecord(patch, slateLoadMappings.person)

    if (Object.keys(loadPatch).length === 0) {
      continue
    }

    loadPatch[PATCH_SOURCE_KEY] = patch

    if (user.id) {
      loadPatch.ID = user.id
    }

    // copy any related records embedded in the patch to their own queues;
    // convertRecord trimmed them out of loadPatch
    if (patch.contact_points) {
      for (const contactPoint of patch.contact_points) {
        dirtyContactPoints.push(contactPoint)
        contactPoint[PATCH_USER_KEY] = user
      }
    }

    if (patch.relationships) {
      for (const relationship of patch.relationships) {
        dirtyRelationships.push(relationship)
        relationship[PATCH_USER_KEY] = user
      }
    }

    slatePeoplePatches.push(loadPatch)
    loadPatch[PATCH_USER_KEY] = user
  }

  // upload batch to Slate
  if (slatePeoplePatches.length > 0) {
    try {
      console.log(`uploading ${slatePeoplePatches.length} changes to people...`)
      const {
        data: slatePeopleResponses,
        failed: slatePeopleFailed,
        success: slatePeopleSuccess,
        message: slatePeopleMessage
      } = await slateApi.post('people/save', {
        json: { data: slatePeoplePatches }
      })

      if (slatePeopleFailed.length > 0) {
        const failedIds = new Set()
        for (const { record, validationErrors } of slatePeopleFailed) {
          logError(`failed to save person ${record.ID}:\n\t${Object.keys(validationErrors).map(field => `${field}: ${validationErrors[field]}`).join('\n\t')}`)
          failedIds.add(record.ID)
        }

        for (let i = 0; i < slatePeoplePatches.length;) {
          if (failedIds.has(slatePeoplePatches[i].ID)) {
            slatePeoplePatches.splice(i, 1)
          } else {
            i++
          }
        }
      }

      if (!slatePeopleSuccess) {
        throw new Error(`people post failed: ${slatePeopleMessage || '[no message returned]'}`)
      }

      if (slatePeopleResponses.length !== slatePeoplePatches.length) {
        throw new Error(`${slatePeopleResponses.length} response objects does not match ${slatePeoplePatches.length} input objects`)
      }

      // process responses
      console.log(`loading ${slatePeopleResponses.length} person change responses...`)
      for (let i = 0; i < slatePeoplePatches.length; i++) {
        const inputData = slatePeoplePatches[i]
        const outputData = slatePeopleResponses[i]

        const inputId = inputData.ID

        // save negative ID mapping to server-provided ID
        if (inputId <= 0) {
          slatePeopleTemporaryIdMap.set(inputId, outputData.ID)
        }

        const existingUser = inputData[PATCH_USER_KEY]
        const extractPatch = convertRecord(outputData, slateExtractMappings.person)
        Object.assign(existingUser, extractPatch)
        dirtyUsers.add(existingUser)
      }
    } catch (err) {
      throw new Error('Failed to upload people: ' + getResponseErrorMessage(err))
    }
  }

  // prepare contact points batch upload
  console.log(`preparing batch upload for ${dirtyContactPoints.length} contact points...`)
  const slateContactPointsPatches = []
  let nextTemporaryContactPointId = -1
  for (const patch of dirtyContactPoints) {
    const user = patch[PATCH_USER_KEY]
    const loadPatch = convertRecord(patch, slateLoadMappings.contactPoint)

    if (Object.keys(loadPatch).length === 0) {
      continue
    }

    loadPatch[PATCH_SOURCE_KEY] = patch

    if (!loadPatch.ID) {
      loadPatch.ID = nextTemporaryContactPointId--
    }

    if (user.id) {
      loadPatch.PersonID = user.id
    }

    slateContactPointsPatches.push(loadPatch)
    loadPatch[PATCH_USER_KEY] = user
  }

  // upload batch to Slate
  if (slateContactPointsPatches.length > 0) {
    try {
      console.log(`uploading ${slateContactPointsPatches.length} changes to contact points...`)
      const {
        data: slateContactPointsResponses,
        failed: slateContactPointsFailed,
        success: slateContactPointsSuccess,
        message: slateContactPointsMessage
      } = await slateApi.post('contact-points/save', {
        json: { data: slateContactPointsPatches }
      })

      if (slateContactPointsFailed.length > 0) {
        const failedIds = new Set()
        for (const { record, validationErrors } of slateContactPointsFailed) {
          logError(`failed to save contact point ${record.Class}#${record.ID} ("${record.Label}" <${record.Data}>) for person ${record.PersonID}:\n\t${Object.keys(validationErrors).map(field => `${field}: ${validationErrors[field]}`).join('\n\t')}`)
          failedIds.add(record.ID)
        }

        for (let i = 0; i < slateContactPointsPatches.length;) {
          if (failedIds.has(slateContactPointsPatches[i].ID)) {
            slateContactPointsPatches.splice(i, 1)
          } else {
            i++
          }
        }
      }

      if (!slateContactPointsSuccess) {
        throw new Error(`contact point post failed: ${slateContactPointsMessage || '[no message returned]'}`)
      }

      if (slateContactPointsResponses.length !== slateContactPointsPatches.length) {
        throw new Error(`${slateContactPointsResponses.length} response objects does not match ${slateContactPointsPatches.length} input objects`)
      }

      // process responses
      console.log(`loading ${slateContactPointsResponses.length} contact point change responses...`)
      for (let i = 0; i < slateContactPointsPatches.length; i++) {
        const inputData = slateContactPointsPatches[i]
        const outputData = slateContactPointsResponses[i]

        const user = inputData[PATCH_USER_KEY]
        const extractPatch = convertRecord(outputData, slateExtractMappings.contactPoint)

        Object.assign(inputData[PATCH_SOURCE_KEY], extractPatch)
        dirtyUsers.add(user)
      }
    } catch (err) {
      throw new Error('Failed to upload contact points: ' + getResponseErrorMessage(err))
    }
  }

  // prepare relationships batch upload
  console.log(`preparing batch upload for ${dirtyRelationships.length} relationships...`)
  const slateRelationshipPatches = []
  let nextTemporaryRelationshipId = -1
  for (const patch of dirtyRelationships) {
    const user = patch[PATCH_USER_KEY]
    const loadPatch = convertRecord(patch, slateLoadMappings.relationship)

    if (Object.keys(loadPatch).length === 0) {
      continue
    }

    loadPatch[PATCH_SOURCE_KEY] = patch

    if (!loadPatch.ID) {
      loadPatch.ID = nextTemporaryRelationshipId--
    }

    if (user.id) {
      loadPatch.PersonID = user.id
    }

    const { RelatedPersonID: originalRelatedPersonID } = loadPatch

    if (originalRelatedPersonID && originalRelatedPersonID < 0) {
      loadPatch.RelatedPersonID = slatePeopleTemporaryIdMap.get(originalRelatedPersonID)

      if (!loadPatch.RelatedPersonID) {
        throw new Error(`unable to map negative RelatedPersonID ${originalRelatedPersonID} to assigned user ID`)
      }
    }

    slateRelationshipPatches.push(loadPatch)
    loadPatch[PATCH_USER_KEY] = user
  }

  // upload batch to Slate
  if (slateRelationshipPatches.length > 0) {
    try {
      console.log(`uploading ${slateRelationshipPatches.length} changes to relationships...`)
      const {
        data: slateRelationshipsResponses,
        failed: slateRelationshipsFailed,
        success: slateRelationshipsSuccess,
        message: slateRelationshipsMessage
      } = await slateApi.post('relationships/save', {
        json: { data: slateRelationshipPatches }
      })

      if (slateRelationshipsFailed.length > 0) {
        const failedIds = new Set()
        for (const { record, validationErrors } of slateRelationshipsFailed) {
          logError(`failed to save relationship ${record.Class}#${record.ID} (${record.Slot}: "${record.Label}" <${record.RelatedPersonID}>) for person ${record.PersonID}:\n\t${Object.keys(validationErrors).map(field => `${field}: ${validationErrors[field]}`).join('\n\t')}`)
          failedIds.add(record.ID)
        }

        for (let i = 0; i < slateRelationshipPatches.length;) {
          if (failedIds.has(slateRelationshipPatches[i].ID)) {
            slateRelationshipPatches.splice(i, 1)
          } else {
            i++
          }
        }
      }

      if (!slateRelationshipsSuccess) {
        throw new Error(`relationships post failed: ${slateRelationshipsMessage || '[no message returned]'}`)
      }

      if (slateRelationshipsResponses.length !== slateRelationshipPatches.length) {
        throw new Error(`${slateRelationshipsResponses.length} response objects does not match ${slateRelationshipPatches.length} input objects`)
      }

      // process responses
      console.log(`loading ${slateRelationshipsResponses.length} relationship change responses...`)
      for (let i = 0; i < slateRelationshipPatches.length; i++) {
        const inputData = slateRelationshipPatches[i]
        const outputData = slateRelationshipsResponses[i]

        const user = inputData[PATCH_USER_KEY]
        const extractPatch = convertRecord(outputData, slateExtractMappings.relationship)

        Object.assign(inputData[PATCH_SOURCE_KEY], extractPatch)
        dirtyUsers.add(user)
      }
    } catch (err) {
      throw new Error('Failed to upload relationships: ' + getResponseErrorMessage(err))
    }
  }

  // TODO: upload sections

  // TODO: upload enrollments, mapping temporary user ids

  // save all updated users
  console.log(`saving ${dirtyUsers.size} dirty user records`)
  for (const dirtyUser of dirtyUsers) {
    const { blob, path } = await usersSheet.upsert(dirtyUser)
    console.log(`${blob.hash}\t${path}`)
  }

  // save result
  const workspace = await repo.getWorkspace()
  const ancestor = await repo.resolveRef(ref)
  const treeHash = await workspace.root.write()

  if (emptyCommit || treeHash !== await git.getTreeHash(ancestor)) {
    let commitMessage = `⥃ ${COMMIT_ERRORS.length > 0 ? 'partially ' : ''}load data to ${slateApi.defaults.options.prefixUrl}`

    if (COMMIT_ERRORS.length) {
      commitMessage += `\n\n## ${COMMIT_ERRORS.length} errors:\n\n- ${COMMIT_ERRORS.join('\n- ')}`
    }

    commitMessage += `\n\nLoaded-to: ${hostName}`

    const commitHash = await git.commitTree(treeHash, {
      p: ancestor,
      m: commitMessage
    })
    await git.updateRef(`refs/heads/${ref}`, commitHash)
    console.log(`committed new Slate tree to "${ref}": ${ancestor}->${commitHash}`)
    return commitHash
  } else {
    console.log('Slate tree unchanged')
  }
}

// exports
module.exports = loadSlate

// library
function getResponseErrorMessage({ response, message }) {
  if (!response || !response.body) {
    return message
  }

  return response.body.message || response.body
}
