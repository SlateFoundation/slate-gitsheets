// dependencies
const Repository = require('gitsheets/lib/Repository')
const convertRecord = require('./convertRecord')
const slateExtractMappings = require('./mappings/extract')

// constants
const { EMPTY_TREE_HASH } = require('./constants')

// library
async function extractSlate ({ ref, host, hostName, token, emptyCommit }) {
  const slateApi = require('./api')({ host, token })
  const users = new Map()

  // collect users
  console.log('Downloading people...')
  const { data: slatePeople } = await slateApi('people', {
    searchParams: { status: '*' }
  })

  console.log(`Processing ${slatePeople.length} people...`)
  for (const slatePerson of slatePeople) {
    const user = convertRecord(slatePerson, slateExtractMappings.person)
    user.contact_points = []
    user.relationships = []
    users.set(user.id, user)
  }

  // collect contact points
  console.log('Downloading contact points...')
  const { data: slateContactPoints } = await slateApi('contact-points')

  console.log(`Processing ${slateContactPoints.length} contact points...`)
  for (const slateContactPoint of slateContactPoints) {
    const user = users.get(slateContactPoint.PersonID)
    if (!user) {
      console.warn(`could not find user ${slateContactPoint.PersonID}, skipping contact point ${slateContactPoint.ID}`)
      continue
    }

    const contactPoint = convertRecord(slateContactPoint, slateExtractMappings.contactPoint)
    user.contact_points.push(contactPoint)
  }

  // collect relationships
  console.log('Downloading relationships...')
  const { data: slateRelationships } = await slateApi('relationships')

  console.log(`Processing ${slateRelationships.length} relationships...`)
  for (const slateRelationship of slateRelationships) {
    const user = users.get(slateRelationship.PersonID)
    if (!user) {
      console.warn(`could not find user ${slateRelationship.PersonID}, skipping relationship ${slateRelationship.ID}`)
      continue
    }

    const relationship = convertRecord(slateRelationship, slateExtractMappings.relationship)
    user.relationships.push(relationship)
  }

  // open Slate repo
  let repo = await Repository.getFromEnvironment({ ref })
  let git = await repo.getGit()
  let slateAncestor = await repo.resolveRef()

  if (!slateAncestor) {
    // initialize ref
    slateAncestor = await git.commitTree(EMPTY_TREE_HASH, {
      m: `↥ initialize gitsheets workspace ${ref}`
    })
    repo = await Repository.getFromEnvironment({ ref: slateAncestor })
    git = await repo.getGit()
  }

  const sheets = await repo.openSheets()

  // initialize Slate users if needed
  if (!sheets.users) {
    sheets.users = await repo.openSheet('users', {
      config: require('./templates/users')
    })
    await sheets.users.writeConfig()
  }

  // gather original users
  console.log('Loading existing users...')
  const existingUsersById = new Map()
  for await (const user of sheets.users.query()) {
    if (user.id) {
      existingUsersById.set(user.id, user)
    }
  }

  // write users
  console.log('Merging new user data into old...')
  await sheets.users.clear()

  for (let user of users.values()) {
    // patch new data on top of any existing record to preserve extended fields
    if (user.id) {
      const existingUser = existingUsersById.get(user.id)
      if (existingUser) {
        user = Object.assign(existingUser, user)
      }
    }

    // remove empty arrays
    if (user.contact_points.length === 0) {
      delete user.contact_points
    }

    if (user.relationships.length === 0) {
      delete user.relationships
    }

    // write new blob into sheet
    const { blob, path } = await sheets.users.upsert(user)
    console.log(`${blob.hash}\t${path}`)
  }

  // save result
  const workspace = await repo.getWorkspace()
  const treeHash = await workspace.root.write()

  if (emptyCommit || treeHash !== await git.getTreeHash(slateAncestor)) {
    const commitHash = await git.commitTree(treeHash, {
      p: slateAncestor,
      m: `⭆ extract data from ${slateApi.defaults.options.prefixUrl}\n\nExtracted-from: ${hostName}`
    })
    await git.updateRef(`refs/heads/${ref}`, commitHash)
    console.log(`committed new Slate tree to "${ref}": ${slateAncestor}->${commitHash}`)
    return commitHash
  } else {
    console.log('Slate tree unchanged')
  }
}

// exports
module.exports = extractSlate
