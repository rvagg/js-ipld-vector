/* globals it */

const assert = require('assert')
const Vector = require('../')
const { toWords } = require('number-to-words')

it('Many numbers', async function () {
  this.timeout(10000)

  const expected = []

  const store = {
    map: new Map(),
    get (k) { return store.map.get(k.toString()) },
    put (k, v) { store.map.set(k.toString(), v) }
  }
  const vector = await Vector.create(store, { width: 8 })

  for (let i = 1; i <= 1000; i++) {
    const w = toWords(i)
    expected.push(w)
    await vector.push(w)
  }

  const actualVector = await Vector.create(store, vector.cid, { expectedWidth: 8 })

  assert.strictEqual(actualVector.cid, vector.cid, 'CIDs match')

  assert.strictEqual(await actualVector.size(), expected.length)
  for (let i = 0; i < expected.length; i++) {
    assert.strictEqual(expected[i], await actualVector.get(i))
  }

  let cidCount = 0
  let root
  for await (const cid of actualVector.cids()) {
    if (!root) {
      root = cid
    }
    cidCount++
  }
  assert.ok(cidCount >= 20, 'has at least 20 CIDs making up the collection')
  assert.strictEqual(actualVector.cid, root, 'first CID emitted is the root')
})
