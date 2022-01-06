// dependencies
const Repository = require('gitsheets/lib/Repository')
const {
  normalizePhone
} = require('./contacts')
const {
  normalizeLabel: normalizeRelationshipLabel,
  isStandardLabel: isStandardRelationshipLabel,
  getInverseLabel: getInverseRelationshipLabel
} = require('./relationships')

// constants
const KIND_RELATIONSHIP = 'Emergence\\People\\Relationship'
const KIND_GUARDIAN = 'Emergence\\People\\GuardianRelationship'
const KIND_PHONE = 'Emergence\\People\\ContactPoint\\Phone'
const KIND_EMAIL = 'Emergence\\People\\ContactPoint\\Email'

// library
const studentNameRe = /^(?<last>[^,]+?)(?:\s+(?<suffix>II|III|IV|Jr|Sr))?\s*,\s*(?<first>[^)]+?)\s*(?:\((?<preferred>[^)]+)\))?$/i
const guardianNameRe = /^(?<first>.+) +(?<last>.+)$/

async function mergeContacts ({ contactsRef, contactsGitsheet = 'student-contacts', slateRef, annotateContacts }) {
  // open both repositories
  const contactsRepo = await Repository.getFromEnvironment({ ref: contactsRef })
  const contactsSheet = await contactsRepo.openSheet(contactsGitsheet)

  const slateRepo = await Repository.getFromEnvironment({ ref: slateRef })
  const slateUsersSheet = await slateRepo.openSheet('users')

  // track negative auto-assigned IDs for new users
  let nextUserId = -1

  // build an index of email->user
  console.log('indexing existing users...')

  const usersById = new Map()
  const usersByUsername = new Map()
  const usersByStudentNumber = new Map()
  const usersByEmail = new Map()

  for await (const user of slateUsersSheet.query()) {
    usersById.set(user.id, user)

    if (user.username) {
      usersByUsername.set(user.username.toLowerCase(), user)
    }

    if (user.student_number) {
      usersByStudentNumber.set(user.student_number, user)
    }

    for (const { kind, data } of user.contact_points || []) {
      if (kind === KIND_EMAIL) {
        usersByEmail.set(data.toLowerCase(), user)
      }
    }

    // negative ids are pending new users from a previous offline operation
    if (user.id < nextUserId) {
      nextUserId = user.id - 1
    }
  }

  console.log(`indexed ${usersById.size} user IDs`)
  console.log(`indexed ${usersByUsername.size} usernames`)
  console.log(`indexed ${usersByStudentNumber.size} student numbers`)
  console.log(`indexed ${usersByEmail.size} email addresses`)

  // find existing guardians by email
  console.log('Looking for guardians with existing accounts')
  for await (const contactsRow of contactsSheet.query()) {
    const { student } = contactsRow
    let contactsRowDirty = false

    // look up student's existing user
    const studentUser = usersByUsername.get(student.username.toLowerCase())
    let studentUserDirty = false

    if (!studentUser) {
      throw new Error(`could not find existing user for student ${student.username}`)
    }

    // parse and apply student's name
    const studentNameMatch = studentNameRe.exec(student.name)
    if (!studentNameMatch) {
      throw new Error(`could not parse name "${student.name}" for student ${student.username}`)
    }

    const {
      first: studentFirst,
      last: studentLast,
      preferred: studentPreferred,
      suffix: studentSuffix
    } = studentNameMatch.groups

    if (studentUser.first_name !== studentFirst) {
      studentUser.first_name = studentFirst
      studentUserDirty = true
    }

    if (studentUser.last_name !== studentLast) {
      studentUser.last_name = studentLast
      studentUserDirty = true
    }

    if (studentPreferred && studentUser.preferred_name !== studentPreferred) {
      studentUser.preferred_name = studentPreferred
      studentUserDirty = true
    }

    if (studentSuffix && studentUser.name_suffix !== studentSuffix) {
      studentUser.name_suffix = studentSuffix
      studentUserDirty = true
    }

    // upsert student contact details
    const {
      phone: studentPhone = {},
      email: studentEmail = {}
    } = student

    for (const slot in studentPhone) {
      const label = `${slot.substr(0, 1).toUpperCase()}${slot.substr(1).toLowerCase()} Phone`
      const data = normalizePhone(studentPhone[slot])

      const [existingContactPoint] = studentUser.contact_points.filter(
        p => p.kind === KIND_PHONE &&
             p.data === data
      )

      if (!existingContactPoint) {
        studentUser.contact_points.push({ kind: KIND_PHONE, label, data })
        studentUserDirty = true
      } else if (existingContactPoint.label !== label) {
        existingContactPoint.label = label
        studentUserDirty = true
      }
    }

    for (const slot in studentEmail) {
      const label = `${slot.substr(0, 1).toUpperCase()}${slot.substr(1).toLowerCase()} Email`
      const data = studentEmail[slot]

      const [existingContactPoint] = studentUser.contact_points.filter(
        p => p.kind === KIND_EMAIL &&
             p.data.localeCompare(data, undefined, { sensitivity: 'accent' }) === 0
      )

      if (!existingContactPoint) {
        studentUser.contact_points.push({ kind: KIND_EMAIL, label, data })
        studentUserDirty = true

        // ensure new email is indexed for future rows
        usersByEmail.set(data.toLowerCase(), studentUser)
      } else if (existingContactPoint.label !== label) {
        existingContactPoint.label = label
        studentUserDirty = true
      }
    }

    // merge guardians
    if (!studentUser.relationships) {
      studentUser.relationships = []
    }

    const matchedGuardianEmails = new Set()

    for (const slotName of ['guardian1', 'guardian2']) {
      let guardianUser
      let guardianUserDirty = false

      const guardian = contactsRow[slotName]
      if (!guardian) {
        continue
      }

      const {
        phone: guardianPhone = {},
        email: guardianEmail = {}
      } = guardian

      let guardianLabel = normalizeRelationshipLabel(guardian.relationship)

      if (!guardianLabel) {
        if (guardian.relationship) {
          console.warn(`Guardian ${guardian.name} for student ${student.name} has label "${guardian.relationship}", defaulting to "guardian"`)
        }
        guardianLabel = 'guardian'
      }

      // try to match on exiting user_id annotation first
      if (guardian.user_id) {
        guardianUser = await slateUsersSheet.queryFirst({ id: guardian.user_id })
      }

      // try to find parent by email
      if (!guardianUser && guardianEmail) {
        for (const slot in guardianEmail) {
          const email = guardianEmail[slot].toLowerCase()
          if (guardianUser = usersByEmail.get(email)) { // eslint-disable-line no-cond-assign
            if (matchedGuardianEmails.has(email)) {
              console.warn(`Guardian ${guardian.name} for student ${student.name} shares email ${email} with previous guardian, deleting...`)
              guardianUser = null
              delete guardianEmail[slot]
            } else {
              matchedGuardianEmails.add(email)
              break
            }
          }
        }
      }

      // parse guardian's name (only for new guardian users)
      const guardianNameMatch = guardianNameRe.exec(guardian.name)
      if (!guardianNameMatch) {
        throw new Error(`could not parse name "${guardian.name}" for guardian to student ${student.username}`)
      }

      const {
        first: guardianFirst,
        last: guardianLast
      } = guardianNameMatch.groups

      // search existing relationships for name+label match
      if (!guardianUser) {
        for (const relationship of studentUser.relationships) {
          if (relationship.label !== guardianLabel) {
            continue
          }

          const relatedUser = usersById.get(relationship.related_person_id)
          if (
            !relatedUser ||
                        relatedUser.first_name !== guardianFirst ||
                        relatedUser.last_name !== guardianLast
          ) {
            continue
          }

          guardianUser = relatedUser
          break
        }
      }

      // create guardian if necessary
      if (!guardianUser) {
        guardianUserDirty = true
        guardianUser = {
          id: nextUserId--, // decrement on use so next user gets next negative
          full_name: guardian.name,
          first_name: guardianFirst,
          last_name: guardianLast,
          contact_points: [],
          relationships: []
        }

        // ensure temporary id is indexed for other operations
        usersById.set(guardianUser.id, guardianUser)

        // console.log(`student '${student.name}' has new guardian ${guardianUser.first_name} ${guardianUser.last_name} <${guardianUser.username || ''}>`);
      } else {
        console.log(`student '${student.name}' has existing guardian ${guardianUser.first_name} ${guardianUser.last_name} <${guardianUser.username || ''}>`)

        if (!guardianUser.contact_points) {
          guardianUser.contact_points = []
        }

        if (!guardianUser.relationships) {
          guardianUser.relationships = []
        }
      }

      // decorate import guardian with ID if it is not a phantom (negative) ID
      if (guardianUser.id > 0 && guardian.user_id !== guardianUser.id) {
        guardian.user_id = guardianUser.id
        contactsRowDirty = true
      }

      // upsert guardian's contact details
      for (const slot in guardianPhone) {
        const label = `${slot.substr(0, 1).toUpperCase()}${slot.substr(1).toLowerCase()} Phone`
        const data = normalizePhone(guardianPhone[slot])

        const [existingContactPoint] = guardianUser.contact_points.filter(
          p => p.kind === KIND_PHONE &&
               p.data === data
        )

        if (!existingContactPoint) {
          guardianUser.contact_points.push({ kind: KIND_PHONE, label, data })
          guardianUserDirty = true
        } else if (existingContactPoint.label !== label) {
          existingContactPoint.label = label
          guardianUserDirty = true
        }
      }

      for (const slot in guardianEmail) {
        const label = `${slot.substr(0, 1).toUpperCase()}${slot.substr(1).toLowerCase()} Email`
        const data = guardianEmail[slot]

        const [existingContactPoint] = guardianUser.contact_points.filter(
          p => p.kind === KIND_EMAIL &&
               p.data.localeCompare(data, undefined, { sensitivity: 'accent' }) === 0
        )

        if (!existingContactPoint) {
          guardianUser.contact_points.push({ kind: KIND_EMAIL, label, data })
          guardianUserDirty = true

          // ensure new email is indexed for future rows
          usersByEmail.set(data.toLowerCase(), guardianUser)
        } else if (existingContactPoint.label !== label) {
          existingContactPoint.label = label
          guardianUserDirty = true
        }
      }

      // upsert guardian->ward relationship
      const wardLabel = getInverseRelationshipLabel(guardianLabel, studentUser.gender) || 'ward'

      const existingWardRelationship = guardianUser.relationships.filter(
        r => r.related_person_id === studentUser.id
      )

      switch (existingWardRelationship.length) {
        case 0:
          guardianUser.relationships.push({
            kind: KIND_RELATIONSHIP,
            label: wardLabel,
            related_person_id: studentUser.id
          })
          guardianUserDirty = true
          break
        case 1:
          if (existingWardRelationship[0].label !== wardLabel) {
            existingWardRelationship[0].label = wardLabel
            guardianUserDirty = true
          }
          break
        default:
          throw new Error('matched more than 1 existing ward relationship')
      }

      // upsert ward->guardian relationship
      const existingGuardianRelationship = studentUser.relationships.filter(
        r => r.related_person_id === guardianUser.id
      )

      switch (existingGuardianRelationship.length) {
        case 0:
          studentUser.relationships.push({
            kind: KIND_GUARDIAN,
            label: guardianLabel,
            related_person_id: guardianUser.id,
            slot: slotName
          })
          studentUserDirty = true
          break
        case 1:
          if (existingGuardianRelationship[0].label !== guardianLabel) {
            existingGuardianRelationship[0].label = guardianLabel
            studentUserDirty = true
          }

          if (existingGuardianRelationship[0].kind !== KIND_GUARDIAN) {
            existingGuardianRelationship[0].kind = KIND_GUARDIAN
            studentUserDirty = true
          }

          if (existingGuardianRelationship[0].slot !== slotName) {
            existingGuardianRelationship[0].slot = slotName
            studentUserDirty = true
          }
          break
        default:
          throw new Error('matched more than 1 existing guardian relationship')
      }

      // upsert dirty guardian
      if (guardianUserDirty) {
        const { path } = await slateUsersSheet.upsert(guardianUser)
        console.log(`updated Slate guardian user: ${path}`)
      }
    }

    // upsert any dirty records
    // TODO: wrap records in a proxy that tracks nested dirty state automatically and lets us read/write record.$dirty?
    if (contactsRowDirty) {
      const { path } = await contactsSheet.upsert(contactsRow)
      console.log(`updated contacts row: ${path}`)
    }

    if (studentUserDirty) {
      const { path } = await slateUsersSheet.upsert(studentUser)
      console.log(`updated Slate student user: ${path}`)
    }
  }

  // prepare cross-merge
  const contactsGit = await contactsRepo.getGit()
  const contactsWorkspace = await contactsRepo.getWorkspace()
  const contactsAncestor = await contactsRepo.resolveRef(contactsRef)
  const contactsTreeHash = await contactsWorkspace.root.write()

  const slateGit = await slateRepo.getGit()
  const slateWorkspace = await slateRepo.getWorkspace()
  const slateAncestor = await slateRepo.resolveRef(slateRef)
  const slateTreeHash = await slateWorkspace.root.write()

  // write slate merge
  let result

  let slateCommitHash = slateAncestor
  if (slateTreeHash !== await slateGit.getTreeHash(slateAncestor)) {
    slateCommitHash = await slateGit.commitTree(slateTreeHash, {
      p: [slateAncestor, contactsAncestor],
      m: `⇑ merge data from ${contactsRef}`
    })
    await slateGit.updateRef(`refs/heads/${slateRef}`, slateCommitHash)
    console.log(`committed new Slate tree to "${slateRef}": ${slateAncestor}->${slateCommitHash}`)
    result = slateCommitHash
  } else {
    console.log('Slate tree unchanged')
  }

  // write back-merge
  if (annotateContacts) {
    if (contactsTreeHash !== await contactsGit.getTreeHash(contactsAncestor)) {
      const contactsCommitHash = await contactsGit.commitTree(contactsTreeHash, {
        p: [contactsAncestor, slateCommitHash],
        m: `⬈ annotate source from merge into ${slateRef}`
      })
      await contactsGit.updateRef(`refs/heads/${contactsRef}`, contactsCommitHash)
      console.log(`committed new contacts tree to "${contactsRef}": ${contactsAncestor}->${contactsCommitHash}`)
    } else {
      console.log('contacts tree unchanged')
    }
  }

  return result
}

// exports
module.exports = mergeContacts
