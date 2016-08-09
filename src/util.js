const reduce = require('async/reduce')
const Promise = require('bluebird')

const asyncReduce = Promise.promisify(reduce)

const normalizeToPromise = (value) => {
  let promise
  if (value && value.then) {
    promise = value
  } else {
    promise = Promise.resolve(value)
  }

  return promise
}

module.exports = {
  asyncReduce,
  normalizeToPromise
}
