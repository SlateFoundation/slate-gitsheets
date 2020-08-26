module.exports = ({ token, host }) => require('got').extend({
  headers: {
    Authorization: `Token ${token}`
  },
  prefixUrl: host,
  searchParams: {
    limit: 0, // disable limits by default
    sort: 'ID'
  },
  responseType: 'json',
  resolveBodyOnly: true,
  hooks: {
    beforeRequest: [
      ({ method, url }) => console.log(`${method} ${url}`)
    ]
  }
})
