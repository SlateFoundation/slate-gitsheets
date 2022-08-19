#!/usr/bin/env node

exports.command = 'load-slate'
exports.desc = 'Load data into a Slate API from Slate gitsheets'

exports.builder = {
  ref: {
    type: 'string',
    description: 'Git ref to commit containing Slate gitsheets to load changes from',
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
    default: false
  },
  'max-age': {
    description: 'Max age in seconds for the load base',
    default: '1h',
    coerce: maxAge => {
      const match = maxAge.toString().match(/^(?<number>[0-9]+)(?<unit>[smhd])?$/i)
      if (!match) {
        throw new Error(`max-age ${maxAge} must be in format /^[0-9+[smhd]?$/`)
      }

      let { number, unit = 's' } = match.groups
      number = parseInt(number, 10)

      switch (unit.toLowerCase()) {
        case 'd': number *= 24 // eslint-disable-line no-fallthrough
        case 'h': number *= 60 // eslint-disable-line no-fallthrough
        case 'm': number *= 60
      }

      return number
    }
  }
}

exports.handler = async function (argv) {
  const loadSlate = require('../loadSlate.js')

  if (!argv.hostName) {
    argv.hostName = argv.host.replace(/^https?:\/\/([^/]+).*$/, '$1')
  }

  if (!argv.token) {
    const login = require('../login')
    argv.token = await login(argv)
  }

  const commit = await loadSlate(argv)
  if (commit) {
    console.log(`commit=${commit || ''}`)
  } else {
    process.exit(1)
  }
}
