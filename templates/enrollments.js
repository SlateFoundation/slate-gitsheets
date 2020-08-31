module.exports = {
  path: '${{ course_code }}/${{ section_code }}/${{ role }}/${{ user_id }}',
  root: 'enrollments',
  fields: {
    course_code: {
      type: 'string'
    },
    section_code: {
      type: 'string'
    },
    role: {
      type: 'string',
      enum: ['teacher', 'student', 'assistant', 'observer']
    },
    user_id: {
      type: 'number'
    }
  }
}
