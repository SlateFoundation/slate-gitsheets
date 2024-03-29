module.exports = {
  path: "${{ id > 0 ? Math.floor(id/1000)*1000 || '0000' : 'pending' }}/${{ id }}",
  root: 'users',
  fields: {
    contact_points: {
      sort: ['id == null', 'id', 'slot', 'kind', 'label', 'data']
    },
    id: {
      default: -1
    },
    relationships: {
      sort: ['id == null', 'id', 'slot', 'kind', 'label', 'related_person_id']
    },
    mapping: {
      sort: ['id == null', 'id', 'kind', 'field']
    }
  }
}
