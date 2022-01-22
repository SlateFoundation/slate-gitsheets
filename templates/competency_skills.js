module.exports = {
    path: '${{ competency_code }}/${{ code }}',
    root: 'competency_skills',
    fields: {
      competency_code: {
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
      },
      evidence_required: {
        type: 'object'
      }
    }
  }
