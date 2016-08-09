const { check: checkFn } = require('./tfn')

let middlewareStack = []

function check (user, key, resource = null, options = {}, index = 0) {
  return checkFn(middlewareStack, user, key, resource, options, index)
}

function use (m) {
  middlewareStack.push(m)
}

function clear () {
  middlewareStack = []
}

module.exports = {
  check,
  use,
  clear
}
