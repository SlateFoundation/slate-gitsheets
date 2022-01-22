#!/usr/bin/env node

exports.command = 'extract-cbl-googlesheet'
exports.desc = 'Extract CBL competencies from a Google Sheet'

exports.builder = {
  ref: {
    type: 'string',
    description: 'Git ref to commit containing Slate gitsheets to update',
    default: process.env.SLATE_REF || 'gitsheets/slate',
    defaultDescription: 'SLATE_REF | "gitsheets/slate"'
  },
  url: {
    type: 'string',
    description: 'CSV download URL for index sheet',
    default: 'https://docs.google.com/spreadsheets/d/1BBFPgtmgF4_fFwFYySbKdWh4X4MYlemChS9CmnTgL5w/export?format=csv&id=1BBFPgtmgF4_fFwFYySbKdWh4X4MYlemChS9CmnTgL5w&gid=1424741602',
    defaultDescription: 'Building 21 master template'
  },
  'empty-commit': {
    type: 'boolean',
    description: 'Whether to make a commit even when no changes are found',
    default: true
  }
}

exports.handler = async function (argv) {
  const extractCBLGoogleSheet = require('../extractCBLGoogleSheet')

  const commit = await extractCBLGoogleSheet(argv)
  console.log(`commit=${commit || ''}`)
}
