// dependencies
const prompt = require('async-prompt')
const FormData = require('form-data')

// library
async function login ({ host }) {
  const slateApi = require('./api')({ host })

  const loginFormData = new FormData()
  loginFormData.append('_LOGIN[returnMethod]', 'POST')
  loginFormData.append('_LOGIN[username]', await prompt('Slate admin username: '))
  loginFormData.append('_LOGIN[password]', await prompt.password('Slate admin password: '))

  try {
    const response = await slateApi.post('login', {
      body: loginFormData
    })

    if (response.data && response.data.Handle) {
      return response.data.Handle
    } else {
      throw new Error('Request did not return a token')
    }
  } catch (err) {
    console.error(`Login failed: ${err.message}`)
    process.exit(1)
  }
}

// exports
module.exports = login
