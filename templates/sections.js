module.exports = {
  path: "${{ id > 0 ? Math.floor(id/1000)*1000 || '0000' : 'pending' }}/${{ id }}",
  root: 'sections',
  fields: {
    id: {
      default: -1
    }
    // teachers: {
    //   sort: ['id']
    // },
    // students: {
    //   sort: ['id']
    // }
  }
}
