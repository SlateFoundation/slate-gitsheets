const createDate = require('@iarna/toml/lib/create-date')

const common = {
  kind: 'Class',
  id: 'ID',
  revision_id: 'RevisionID',

  created_at: {
    field: 'Created',
    convert: ({ Created }) => Created ? new Date(Created * 1000) : undefined
  },
  creator: 'CreatorID', // TODO: store as attachment?
  modified_at: {
    field: 'Modified',
    convert: ({ Modified }) => Modified ? new Date(Modified * 1000) : undefined
  },
  modifier: 'ModifierID' // TODO: store as attachment?
}

const person = {
  ...common,

  first_name: 'FirstName',
  middle_name: 'MiddleName',
  last_name: 'LastName',
  preferred_name: {
    fields: ['FirstName', 'PreferredName'],
    convert: slatePerson => slatePerson.PreferredName || slatePerson.FirstName
  },
  name_suffix: 'NameSuffix',

  username: 'Username',
  account_level: 'AccountLevel',
  temporary_password: 'TemporaryPassword',
  legacy_username: 'LegacyUsername',

  student_number: 'StudentNumber',
  advisor_id: 'AdvisorID', // TODO: store as attachment?
  graduation_year: 'GraduationYear',

  gender: 'Gender',
  birth_date: {
    field: 'BirthDate',
    convert: ({ BirthDate }) => BirthDate ? createDate(BirthDate) : undefined
  },
  location: 'Location',
  about: 'About',
  notes: 'Notes',

  // TODO: store as attachments?
  primary_photo_id: 'PrimaryPhotoID',
  primary_email_id: 'PrimaryEmailID',
  primary_postal_id: 'PrimaryPostalID',
  primary_phone_id: 'PrimaryPhoneID'
}

const contactPoint = {
  ...common,

  person_id: 'PersonID',
  label: 'Label',
  data: {
    field: 'Data',
    convert: ({ Class, Data }) => {
      if (!Data) {
        return null
      }

      switch (Class) {
        case 'Emergence\\People\\ContactPoint\\Postal':
          return JSON.parse(Data)
        default:
          return Data
      }
    }
  },

  // discard redundant reference to containing document
  person_id: {
    field: 'PersonID',
    discard: true
  }
}

const relationship = {
  ...common,

  related_person_id: 'RelatedPersonID',
  label: 'Label',
  notes: 'Notes',
  slot: 'Slot',

  // discard redundant reference to containing document
  person_id: {
    field: 'PersonID',
    discard: true
  }
}

module.exports = {
  common,
  person,
  contactPoint,
  relationship
}
