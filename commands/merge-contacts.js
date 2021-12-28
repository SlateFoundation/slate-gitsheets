#!/usr/bin/env node

exports.command = 'merge-contacts'
exports.desc = 'Merge data from the student-contacts gitsheet into Slate users gitsheet'

exports.builder = {
  'contacts-ref': {
    type: 'string',
    description: 'Git ref to pull student-contacts sheet from',
    default: process.env.CONTACTS_REF || 'gitsheets/imports/contacts',
    defaultDescription: 'CONTACTS_REF || "gitsheets/imports/contacts"'
  },
  'contacts-gitsheet': {
    type: 'string',
    description: 'Gitsheet to pull student contact data from',
    default: 'student-contacts'
  },
  'slate-ref': {
    type: 'string',
    description: 'Git ref to update Slate gitsheets within',
    default: process.env.SLATE_REF || 'gitsheets/slate',
    defaultDescription: 'SLATE_REF || "gitsheets/slate"'
  },
  'annotate-contacts': {
    type: 'boolean',
    description: 'Whether to commit annotations back to the student-contacts sheet',
    default: true
  }
}

exports.handler = async function (argv) {
  const mergeContacts = require('../mergeContacts')

  const commit = await mergeContacts(argv)
  console.log(`commit=${commit || ''}`)
}
