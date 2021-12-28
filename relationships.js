const templates = {
  mother: {
    relationship: {
      kind: 'Emergence\\People\\GuardianRelationship'
    },
    person: {
      gender: 'female'
    },
    inverse: {
      male: 'son',
      female: 'daughter',
      neutral: 'child'
    }
  },
  father: {
    relationship: {
      kind: 'Emergence\\People\\GuardianRelationship'
    },
    person: {
      gender: 'male'
    },
    inverse: {
      male: 'son',
      female: 'daughter',
      neutral: 'child'
    }
  },
  parent: {
    relationship: {
      kind: 'Emergence\\People\\GuardianRelationship'
    },
    inverse: {
      male: 'son',
      female: 'daughter',
      neutral: 'child'
    }
  },
  guardian: {
    relationship: {
      kind: 'Emergence\\People\\GuardianRelationship'
    },
    inverse: 'dependent'
  },
  grandmother: {
    person: {
      gender: 'female'
    },
    inverse: {
      male: 'grandson',
      female: 'granddaughter',
      neutral: 'grandchild'
    }
  },
  grandfather: {
    person: {
      gender: 'male'
    },
    inverse: {
      male: 'grandson',
      female: 'granddaughter',
      neutral: 'grandchild'
    }
  },
  grandparent: {
    inverse: {
      male: 'grandson',
      female: 'granddaughter',
      neutral: 'grandchild'
    }
  },
  'great grandmother': {
    person: {
      gender: 'female'
    },
    inverse: {
      male: 'great grandson',
      female: 'great granddaughter',
      neutral: 'great grandchild'
    }
  },
  'great grandfather': {
    person: {
      gender: 'male'
    },
    inverse: {
      male: 'great grandson',
      female: 'great granddaughter',
      neutral: 'great grandchild'
    }
  },
  'great grandparent': {
    inverse: {
      male: 'great grandson',
      female: 'great granddaughter',
      neutral: 'great grandchild'
    }
  },
  stepmother: {
    person: {
      gender: 'female'
    },
    inverse: {
      male: 'stepson',
      female: 'stepdaughter',
      neutral: 'stepchild'
    }
  },
  stepfather: {
    person: {
      gender: 'male'
    },
    inverse: {
      male: 'stepson',
      female: 'stepdaughter',
      neutral: 'stepchild'
    }
  },
  stepparent: {
    inverse: {
      male: 'stepson',
      female: 'stepdaughter',
      neutral: 'stepchild'
    }
  },
  'foster mother': {
    relationship: {
      kind: 'Emergence\\People\\GuardianRelationship'
    },
    person: {
      gender: 'female'
    },
    inverse: {
      male: 'foster son',
      female: 'foster daughter',
      neutral: 'foster child'
    }
  },
  'foster father': {
    relationship: {
      kind: 'Emergence\\People\\GuardianRelationship'
    },
    person: {
      gender: 'male'
    },
    inverse: {
      male: 'foster son',
      female: 'foster daughter',
      neutral: 'foster child'
    }
  },
  'foster parent': {
    relationship: {
      kind: 'Emergence\\People\\GuardianRelationship'
    },
    inverse: {
      male: 'foster son',
      female: 'foster daughter',
      neutral: 'foster child'
    }
  },
  godmother: {
    person: {
      gender: 'female'
    },
    inverse: {
      male: 'godson',
      female: 'goddaughter',
      neutral: 'godchild'
    }
  },
  godfather: {
    person: {
      gender: 'male'
    },
    inverse: {
      male: 'godson',
      female: 'goddaughter',
      neutral: 'godchild'
    }
  },
  godparent: {
    inverse: {
      male: 'godson',
      female: 'goddaughter',
      neutral: 'godchild'
    }
  },
  'host mother': {
    person: {
      gender: 'female'
    },
    inverse: {
      male: 'host son',
      female: 'host daughter',
      neutral: 'host child'
    }
  },
  'host father': {
    person: {
      gender: 'male'
    },
    inverse: {
      male: 'host son',
      female: 'host daughter',
      neutral: 'host child'
    }
  },
  'host parent': {
    inverse: {
      male: 'host son',
      female: 'host daughter',
      neutral: 'host child'
    }
  },
  'host grandmother': {
    person: {
      gender: 'female'
    },
    inverse: {
      male: 'host grandson',
      female: 'host granddaughter',
      neutral: 'host grandchild'
    }
  },
  'host grandfather': {
    person: {
      gender: 'male'
    },
    inverse: {
      male: 'host grandson',
      female: 'host granddaughter',
      neutral: 'host grandchild'
    }
  },
  'host grandparent': {
    inverse: {
      male: 'host grandson',
      female: 'host granddaughter',
      neutral: 'host grandchild'
    }
  },
  aunt: {
    person: {
      gender: 'female'
    },
    inverse: {
      male: 'nephew',
      female: 'niece',
      neutral: 'nibling'
    }
  },
  uncle: {
    person: {
      gender: 'male'
    },
    inverse: {
      male: 'nephew',
      female: 'niece',
      neutral: 'nibling'
    }
  },
  pibling: {
    inverse: {
      male: 'nephew',
      female: 'niece',
      neutral: 'nibling'
    }
  },
  sister: {
    person: {
      gender: 'male'
    },
    inverse: {
      male: 'brother',
      female: 'sister',
      neutral: 'sibling'
    }
  },
  brother: {
    person: {
      gender: 'male'
    },
    inverse: {
      male: 'brother',
      female: 'sister',
      neutral: 'sibling'
    }
  },
  sibling: {
    inverse: {
      male: 'brother',
      female: 'sister',
      neutral: 'sibling'
    }
  },
  cousin: {
    inverse: {
      male: 'cousin',
      female: 'cousin',
      neutral: 'cousin'
    }
  },
  coach: {
    inverse: 'trainee'
  }
}

// generate inverse templates
for (const label in templates) {
  const template = templates[label]
  const gender = template.person && template.person.gender
  const relationshipTemplate = template.relationship || (template.relationship = {})

  if (!relationshipTemplate.label) {
    relationshipTemplate.label = label
  }

  let inverses = template.inverse
  if (!inverses) {
    continue
  }

  if (typeof inverses === 'string') {
    template.inverses = inverses = {
      male: inverses,
      female: inverses,
      neutral: inverses
    }
  }

  for (const inverseGender in inverses) {
    const inverseLabel = inverses[inverseGender]
    const inverseTemplate = templates[inverseLabel] || (templates[inverseLabel] = {})
    const inversePersonTemplate = inverseTemplate.person || (inverseTemplate.person = {})

    if (!inversePersonTemplate.gender && (inverseGender === 'male' || inverseGender === 'female')) {
      inversePersonTemplate.gender = inverseGender
    }

    const inverseInverses = inverseTemplate.inverse || (inverseTemplate.inverse = {})

    if (gender) {
      inverseInverses[gender] = label
    } else {
      inverseInverses.male = inverseInverses.male || label
      inverseInverses.female = inverseInverses.female || label
      inverseInverses.neutral = inverseInverses.neutral || label
    }
  }
}

function normalizeLabel (label) {
  label = label.replace(/-/g, '') // remove hyphens
  label = label.trim().replace(/\s{2,}/g, ' ') // collapse
  label = label.toLowerCase()
  return label
}

function normalizeGender (gender) {
  gender = gender.toLowerCase()

  if (gender !== 'male' && gender !== 'female') {
    gender = 'neutral'
  }

  return gender
}

function getTemplate (label) {
  return templates[normalizeLabel(label)]
}

function isStandardLabel (label) {
  return label in templates
}

function getInverseLabel (label, gender = 'neutral') {
  return isStandardLabel(label)
    ? templates[label].inverse[normalizeGender(gender)]
    : null
}

module.exports = {
  templates,
  normalizeLabel,
  getTemplate,
  isStandardLabel,
  getInverseLabel
}
