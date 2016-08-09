const eq = require('assert').deepEqual
const { check, checkMap } = require('./tfn')

describe('TFN', () => {
  describe('check', () => {
    it('should return true when middleware returns true', () => {
      let m = [(user, key, resource) => true]

      return check(m, {}, 'userEdit').then((result) => {
        eq(result, true)
      })
    })

    it('should return false when middleware returns false', () => {
      let m = [(user, key, resource) => false]

      return check(m, {}, 'userEdit').then((result) => {
        eq(result, false)
      })
    })

    it('should return null when no middleware returns true or false', () => {
      let m = [(user, key, resource) => null]

      return check(m, {}, 'userEdit').then((result) => {
        eq(result, null)
      })
    })

    it('should not check middleware if resource is required and no resource is given', () => {
      var called = false
      let m = []
      m.push({
        fn: (user, key, resource) => {
          called = true
          return true
        },
        requireResource: true
      })

      m.push((user, key, resource) => null)

      return check(m, {}, 'userEdit').then((result) => {
        eq(called, false)
      })
    })

    it('should not check middleware if the middleware does not accept the key', () => {
      let m = []
      m.push({
        fn: (user, key, resource) => true,
        keys: ['userEdit']
      })

      m.push((user, key, resource) => null)

      return check(m, {}, 'userEdit').then((result) => {
        eq(result, true)
      })
    })

    it('should return a promise when there is no middleware execute', () => {
      return check([], {}, 'test').then(r => r)
    })

    it('should skip middleware when using skip index', () => {
      let m = []
      m.push({
        fn: (user, key, resource, options, check) => {
          // this should call deadly recursion.  skip will cause it to be skipped over when
          // rerunning the middleware stack.
          return check(user, 'test', resource).then(r => true)
        }
      })

      return check(m, {}, 'test').then(r => r)
    })

    it('should work with nested calls', () => {
      var one, two, three

      let m = []
      m.push({
        keys: ['usePreferencesTestFeature'],
        fn: (user, key, resource, options, check) => {
          one = true
          return check(user, 'tentantHasTestFeature', resource).then(r => r)
        }
      })

      m.push({
        keys: ['tentantHasTestFeature'],
        fn: (user, key, resource, options, check) => {
          two = true
          return check(user, 'isAllowedToUseTestFeature', resource)
        }
      })

      m.push({
        keys: ['isAllowedToUseTestFeature'],
        fn: (user, key, resource) => {
          three = true
          return true
        }
      })

      return check(m, {}, 'usePreferencesTestFeature').then((result) => {
        // Make sure all middleware is called
        eq(one, true)
        eq(two, true)
        eq(three, true)
        eq(result, true)
      })
    })
  })

  describe('checkMap', () => {
    it('should run multiple checks', () => {
      let m = []
      m.push((user, key, resource) => {
        if (key === 'userEdit') {
          return true
        }

        if (key === 'userCreate') {
          return false
        }

        return null
      })

      return checkMap(m, {}, [{key: 'userEdit'}, {key: 'userShow'}, {key: 'userCreate'}])
      .then((results) => {
        eq(results['userEdit'], true)
        eq(results['userShow'], null)
        eq(results['userCreate'], false)
      })
    })
  })
})
