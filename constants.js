const { TreeObject } = require('gitsheets/lib/hologit')

module.exports = {
  EMPTY_TREE_HASH: TreeObject.getEmptyTreeHash(),

  KIND_RELATIONSHIP: 'Emergence\\People\\Relationship',
  KIND_GUARDIAN: 'Emergence\\People\\GuardianRelationship',
  KIND_PHONE: 'Emergence\\People\\ContactPoint\\Phone',
  KIND_EMAIL: 'Emergence\\People\\ContactPoint\\Email'
}
