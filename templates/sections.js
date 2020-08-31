module.exports = {
  path: '${{ course_code }}/${{ code }}',
  root: 'sections',
  fields: {
    course_code: {
      type: 'string'
    },
    code: {
      type: 'string'
    }
  }
}
