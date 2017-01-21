function sayHello (call, callback) {
  const message = `Hello ${call.request.name}`
  callback(null, {message})
}

function sayGoodbye (call, callback) {
  const message = `Goodbye ${call.request.name}`
  callback(null, {message})
}

module.exports = {
  helloworld: {
    Greeter: {
      sayHello,
      sayGoodbye
    }
  }
}
