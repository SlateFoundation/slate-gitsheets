/* eslint-disable camelcase */

const common = {
  Class: 'kind',
  ID: 'id',
  RevisionID: 'revision_id',

  Created: {
    field: 'created_at',
    convert: ({ created_at }) => created_at ? Math.round(created_at.getTime() / 1000) : undefined
  },
  CreatorID: 'creator', // TODO: store as attachment?
  Modified: {
    field: 'modified_at',
    convert: ({ modified_at }) => modified_at ? Math.round(modified_at.getTime() / 1000) : undefined
  },
  ModifierID: 'modifier' // TODO: store as attachment?
}

const person = {
  ...common,

  FirstName: 'first_name',
  MiddleName: 'middle_name',
  LastName: 'last_name',
  PreferredName: 'preferred_name',
  NameSuffix: 'name_suffix',

  Username: 'username',
  AccountLevel: 'account_level',
  TemporaryPassword: 'temporary_password',
  LegacyUsername: 'legacy_username',

  StudentNumber: 'student_number',
  AdvisorID: 'advisor_id', // TODO: store as attachment?
  GraduationYear: 'graduation_year',

  Gender: 'gender',
  BirthDate: {
    field: 'birth_date',
    convert: ({ birth_date }) => birth_date
      ? `${birth_date.getUTCFullYear()}-${birth_date.getUTCMonth() + 1}-${birth_date.getUTCDate()}`
      : undefined
  },
  Location: 'location',
  About: 'about',
  Notes: 'notes',

  // TODO: store as attachments?
  PrimaryPhotoID: 'primary_photo_id',
  PrimaryEmailID: 'primary_email_id',
  PrimaryPostalID: 'primary_postal_id',
  PrimaryPhoneID: 'primary_phone_id',

  // discard unsupported and relational fields
  NamePrefix: {
    field: 'name_prefix',
    discard: true
  },
  FullName: {
    field: 'full_name',
    discard: true
  },
  ContactPoints: {
    field: 'contact_points',
    discard: true
  },
  Relationships: {
    field: 'relationships',
    discard: true
  },
  Mappings: {
    field: 'mappings',
    discard: true
  }
}

const contactPoint = {
  ...common,

  PersonID: 'person_id',
  Label: 'label',
  Data: {
    field: 'data',
    convert: ({ kind, data }) => {
      if (!data) {
        return null
      }

      switch (kind) {
        case 'Emergence\\People\\ContactPoint\\Postal':
          return JSON.parse(data)
        default:
          return data
      }
    }
  }
}

const relationship = {
  ...common,

  PersonID: 'person_id',
  RelatedPersonID: 'related_person_id',
  Label: 'label',
  Notes: 'notes',
  Slot: 'slot'
}

module.exports = {
  common,
  person,
  contactPoint,
  relationship
}
