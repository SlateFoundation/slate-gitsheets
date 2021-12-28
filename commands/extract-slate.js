#!/usr/bin/env node

exports.command = 'extract-slate'
exports.desc = 'Extract data from a Slate API into Slate gitsheets'

exports.builder = {
  ref: {
    type: 'string',
    description: 'Git ref to commit containing slate gitsheets to update',
    default: process.env.SLATE_REF || 'gitsheets/slate',
    defaultDescription: 'SLATE_REF | "gitsheets/slate"'
  },
  host: {
    type: 'string',
    description: 'Slate host',
    default: process.env.SLATE_HOST,
    defaultDescription: 'SLATE_HOST',
    demandOption: 'Provide host in the form https://example.org',
    coerce: host => {
      if (!host) {
        return undefined
      }

      // add https://
      if (!/^https?:\/\//i.test(host)) {
        host = `https://${host}`
      }

      // strip trailing /
      host = host.replace(/\/$/, '')

      return host
    }
  },
  'host-name': {
    type: 'string',
    description: 'Canonical host identifier to tag commits with',
    default: process.env.SLATE_HOST_NAME,
    defaultDescription: 'SLATE_HOST_NAME | hostName(host)'
  },
  token: {
    type: 'string',
    description: 'Slate admin token',
    default: process.env.SLATE_TOKEN,
    defaultDescription: 'SLATE_TOKEN'
  },
  'empty-commit': {
    type: 'boolean',
    description: 'Whether to make a commit even when no changes are found',
    default: true
  }
}

exports.handler = async function (argv) {
  const extractSlate = require('../extractSlate')

  if (!argv.hostName) {
    argv.hostName = argv.host.replace(/^https?:\/\/([^/]+).*$/, '$1')
  }

  const commit = await extractSlate(argv)
  console.log(`commit=${commit || ''}`)
}
