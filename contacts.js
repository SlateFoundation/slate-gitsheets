function normalizePhone (phone) {
  phone = phone.replace(/\D/g, '')

  if (phone.length === 11 && phone[0] === '1') {
    phone = phone.substr(1)
  }

  return phone
}

module.exports = {
  normalizePhone
}
