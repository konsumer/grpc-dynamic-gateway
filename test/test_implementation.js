'use strict'

function sayHello (call, callback) {
  const message = `Hello ${call.request.name}`
  callback(null, { message })
}

module.exports = {
  helloworld: {
    Greeter: {
      sayHello
    }
  }
}
