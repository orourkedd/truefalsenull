const { check, use, clear } = require('./singleton')
const eq = require('assert').deepEqual

describe('Singleton', () => {
  it('should add middleware to the modules closure', () => {
    use((user, key, resource) => null)
    use((user, key, resource) => {
      return key === 'test' || null
    })
    return check({}, 'test').then((result) => {
      eq(result, true)
    })
  })

  it('should clear middleware', () => {
    use((user, key, resource) => true)
    clear()
    return check({}, 'test').then((result) => {
      eq(result, null)
    })
  })
})
