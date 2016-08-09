const Promise = require('bluebird')
const { curry, reject, equals } = require('ramda')
const {
  asyncReduce,
  normalizeToPromise
} = require('./util')

// A recursive function used to run the middleware chain
function check (middlewareStack, user, key, resource = null, options = {}, index = 0) {
  // If we're at the end of the chain, return null
  if (index >= middlewareStack.length) {
    return Promise.resolve(null)
  }

  // helper to keep things dry later in this function
  let next = () => {
    return check(middlewareStack, user, key, resource, options, index + 1)
  }

  // Get the current middlewareStack
  let middleware = getMiddleware(middlewareStack[index])

  // 1) check if this middleware requires a resource
  if (middleware.requireResource && !resource) {
    return next()
  }

  // 2) make sure this middleware accepts this key.
  //   if it doesn't, move on to the next middleware
  if (Array.isArray(middleware.keys) && middleware.keys.indexOf(key) === -1) {
    return next()
  }

  // Get ready to run the middleware
  // when the middleware has finished, return its result (true or false)
  // or move on to the next if the result is null
  let { fn } = middleware

  let checkInline = (user, key, resource, options) => {
    let filter = equals(middlewareStack[index])
    let shortStack = reject(filter, middlewareStack)
    return check(shortStack, user, key, resource, options)
  }

  let middlewareResultRaw = fn(user, key, resource, options, checkInline)
  let middlewareResult = normalizeToPromise(middlewareResultRaw)

  return middlewareResult
    .then((result) => {
      if ([true, false, null].indexOf(result) === -1) {
        throw new Error('TFN middleware must return true, false or null.')
      }

      // resolve and stop middleware chain if result is definitive, i.e. true or false
      if (result === true || result === false) {
        return result
      }

      return next()
    }
  )
}

// Check a list of permissions at the same time and map results to an object
// checks = [{
// 	key: String,
// 	resource: {},
// 	options: {}
// }]
function checkMap (middlewareStack, user, checks) {
  return asyncReduce(checks, {}, (memo, entry, done) => {
    check(middlewareStack, user, entry.key, entry.resource, entry.options).then((result) => {
      memo[entry.key] = result
      done(null, memo)
    })
  })
}

function getMiddleware (m) {
  if (typeof m === 'function') {
    return {
      fn: m
    }
  } else {
    return m
  }
}

module.exports = {
  check: curry(check),
  checkMap: curry(checkMap)
}
