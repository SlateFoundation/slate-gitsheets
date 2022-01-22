module.exports = {
  path: '${{ competency_area_code }}/${{ code }}',
  root: 'competencies',
  fields: {
    competency_area_code: {
      type: 'string'
    },
    code: {
      type: 'string'
    },
    descriptor: {
      type: 'string'
    },
    statement: {
      type: 'string'
    }
  }
}
