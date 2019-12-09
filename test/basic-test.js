/* globals it */

const Vector = require('../')
const assert = require('assert')

async function toArray (asyncIterator) {
  const result = []
  for await (const item of asyncIterator) {
    result.push(item)
  }
  return result
}

it('Basic usage', async () => {
  const expectedValues = 'foo bar baz'.split(' ')

  const store = {
    map: new Map(),
    get (k) { return store.map.get(k.toString()) },
    put (k, v) { store.map.set(k.toString(), v) }
  }

  const vector = await Vector.create(store)
  await vector.push('foo')
  await vector.push('bar')
  await vector.push('baz')

  await verify(vector) // validate the vector we just put things into

  const vector2 = await Vector.load(store, vector.cid)

  assert.strictEqual(vector2.cid, vector.cid, 'CIDs match')

  await verify(vector2) // validate a map we've loaded from the backing store

  await vector2.push('boom')
  await vector2.push('bang')
  expectedValues.push('boom')
  expectedValues.push('bang')

  await verify(vector2)

  const vector3 = await Vector.load(store, vector2.cid)

  await verify(vector3)

  async function verify (vector) {
    const values = await toArray(vector.values())
    assert.deepStrictEqual(values, expectedValues, 'values() returns expected list')

    for (const idx in expectedValues) {
      assert.strictEqual(await vector.get(idx), expectedValues[idx], `get(${idx})`)
    }
  }
})
