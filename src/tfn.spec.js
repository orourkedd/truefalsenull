const eq = require('assert').deepEqual
const { TFN } = require('./tfn')

describe('TFN', () => {
  describe('use', () => {
    it('should add middleware', () => {
      var tfn = new TFN()

      tfn.use((user, key, resource) => true)

      eq(tfn.middleware.length, 1)
    })
  })

  describe('check', () => {
    it('should return true when middleware returns true', () => {
      var tfn = new TFN()

      tfn.use((user, key, resource) => true)

      return tfn.check({}, 'userEdit').then((result) => {
        eq(result, true)
      })
    })

    it('should return false when middleware returns false', () => {
      var tfn = new TFN()

      tfn.use((user, key, resource) => false)

      return tfn.check({}, 'userEdit').then((result) => {
        eq(result, false)
      })
    })

    it('should return null when no middleware returns true or false', () => {
      var tfn = new TFN()

      tfn.use((user, key, resource) => null)

      return tfn.check({}, 'userEdit').then((result) => {
        eq(result, null)
      })
    })

    it('should not check middleware if resource is required and no resource is given', () => {
      var tfn = new TFN()

      var called = false
      tfn.use({
        fn: (user, key, resource) => {
          called = true
          return true
        },
        requireResource: true
      })

      tfn.use((user, key, resource) => null)

      return tfn.check({}, 'userEdit').then((result) => {
        eq(called, false)
      })
    })

    it('should not check middleware if the middleware does not accept the key', () => {
      var tfn = new TFN()
      tfn.use({
        fn: (user, key, resource) => true,
        keys: ['userEdit']
      })

      tfn.use((user, key, resource) => null)

      return tfn.check({}, 'userEdit').then((result) => {
        eq(result, true)
      })
    })

    it('should return a promise when there is no middleware execute', () => {
      var tfn = new TFN()

      return tfn.check({}, 'test').then(r => r)
    })

    it('should skip middleware when using skip index', () => {
      var tfn = new TFN()

      tfn.use({
        fn: (user, key, resource, options, check) => {
          // this should call deadly recursion.  skip will cause it to be skipped over when
          // rerunning the middleware stack.
          return check(user, 'test', resource).then(r => true)
        }
      })

      return tfn.check({}, 'test').then(r => r)
    })

    it('should work with nested calls', () => {
      var tfn = new TFN()
      var one, two, three

      tfn.use({
        keys: ['usePreferencesTestFeature'],
        fn: (user, key, resource, options, check) => {
          one = true
          return check(user, 'tentantHasTestFeature', resource).then(r => r)
        }
      })

      tfn.use({
        keys: ['tentantHasTestFeature'],
        fn: (user, key, resource, options, check) => {
          two = true
          return check(user, 'isAllowedToUseTestFeature', resource)
        }
      })

      tfn.use({
        keys: ['isAllowedToUseTestFeature'],
        fn: (user, key, resource) => {
          three = true
          return true
        }
      })

      return tfn.check({}, 'usePreferencesTestFeature').then((result) => {
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
      var tfn = new TFN()

      tfn.use((user, key, resource) => {
        if (key === 'userEdit') {
          return true
        }

        if (key === 'userCreate') {
          return false
        }

        return null
      })

      return tfn.checkMap({}, [{key: 'userEdit'}, {key: 'userShow'}, {key: 'userCreate'}])
      .then((results) => {
        eq(results['userEdit'], true)
        eq(results['userShow'], null)
        eq(results['userCreate'], false)
      })
    })
  })
})
