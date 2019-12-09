/* globals it describe */

const assert = require('assert')
const Vector = require('../')
const { toWords } = require('number-to-words')

describe('Many numbers', async function () {
  this.timeout(10000)

  function store () {
    const _store = {
      map: new Map(),
      get (k) { return _store.map.get(k.toString()) },
      put (k, v) { _store.map.set(k.toString(), v) }
    }
    return _store
  }

  const createStore = store()
  const expected = []
  let createCid

  it('create', async () => {
    const vector = await Vector.create(createStore, { width: 8 })

    for (let i = 1; i <= 1000; i++) {
      const w = toWords(i)
      expected.push(w)
      await vector.push(w)
    }

    createCid = vector.cid

    const actualVector = await Vector.load(createStore, createCid, { expectedWidth: 8 })

    assert.strictEqual(actualVector.cid, createCid, 'CIDs match')

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

  it('create from', async () => {
    const createFromStore = store()
    const vector = await Vector.createFrom(createFromStore, expected, { width: 8 })

    // if this passes then we should be able to assume it's identical
    assert.strictEqual(vector.cid.toString(), createCid.toString(), 'create from array resulted in same CID as create by push()')

    // but we'll test anyway
    assert.strictEqual(await vector.size(), expected.length)
    for (let i = 0; i < expected.length; i++) {
      assert.strictEqual(expected[i], await vector.get(i))
    }
  })
})
