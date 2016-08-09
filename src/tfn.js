const Promise = require('bluebird')
const {
  asyncReduce,
  normalizeToPromise
} = require('./util')

class TFN {
  constructor () {
    this.middleware = []
  }

  // Register middleware with a TFN instance
  use (fn) {
    if (typeof fn === 'function') {
      this.middleware.push({
        fn
      })
    } else {
      this.middleware.push(fn)
    }
  }

  // Check a list of permissions at the same time and map results to an object
  // checks = [{
  // 	key: String,
  // 	resource: {},
  // 	options: {}
  // }]
  checkMap (user, checks) {
    return asyncReduce(checks, {}, (memo, entry, done) => {
      this.check(user, entry.key, entry.resource, entry.options).then((result) => {
        memo[entry.key] = result
        done(null, memo)
      })
    })
  }

  // A recursive function used to run the middleware chain
  check (user, key, resource, options = {}, skip, index = 0) {
    // If we're at the end of the chain, return null
    if (index >= this.middleware.length) {
      return Promise.resolve(null)
    }

    // helper to keep things dry later in this function
    let next = () => {
      return this.check(user, key, resource, options, skip, index + 1)
    }

    // Get the current middleware
    let middleware = this.middleware[index]

    // 1) check if this middlware should be skipped.  This is used for recursive calls
    //   (i.e. calling tfn.check from inside middleware)
    if (skip === index) {
      return next()
    }

    // 2) check if this middleware requires a resource
    if (middleware.requireResource && !resource) {
      return next()
    }

    // 3) make sure this middleware accepts this key.
    //   if it doesn't, move on to the next middleware
    if (Array.isArray(middleware.keys) && middleware.keys.indexOf(key) === -1) {
      return next()
    }

    // Get ready to run the middleware
    // when the middleware has finished, return its result (true or false)
    // or move on to the next if the result is null
    let { fn } = middleware

    let checkInline = (user, key, resource, options) => {
      return this.check(user, key, resource, options, index)
    }

    let middlewareResult = normalizeToPromise(fn(user, key, resource, options, checkInline))

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
}

module.exports = {
  TFN: TFN,
  tfn: new TFN() // to be used as a singleton
}
