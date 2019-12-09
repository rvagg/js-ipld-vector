/* globals it */

const assert = require('assert')
const crypto = require('crypto')
const Vector = require('../')
const CID = require('cids')
const multihashing = require('multihashing-async')

if (!assert.rejects) {
  assert.rejects = async (promise, msg) => {
    try {
      await promise
    } catch (err) {
      return
    }
    assert.fail(`Promise did not reject: ${msg}`)
  }
}

it('create() errors', async () => {
  const dummyLoader = { get () {}, put () {} }
  assert.rejects(Vector.create(), 'empty create(), no loader')
  assert.rejects(Vector.create({}), 'create() with useless loader')
  assert.rejects(Vector.create({ get: () => {} }), 'create() with only get()')
  assert.rejects(Vector.create(dummyLoader, 100), 'create() with bad options object')
  assert.rejects(Vector.create(dummyLoader, { blockCodec: false }), 'create() bad blockCodec type')
  assert.rejects(Vector.create(dummyLoader, { blockAlg: false }), 'create() bad blockAlg type')
  assert.rejects(Vector.create(dummyLoader, { width: 'nope' }), 'create() bad width type')
  assert.rejects(Vector.create(dummyLoader, { expectedWidth: 'nope' }), 'create() bad expectedWidth type')
  assert.rejects(Vector.create(dummyLoader, { expectedHeight: 'nope' }), 'create() bad expectedHeight type')
})

it('CID load mismatch', async () => {
  const store = {
    get () {
      return crypto.randomBytes(256)
    },
    put () { }
  }

  const hash = await multihashing(Buffer.from('blorp'), 'sha2-256')
  const cid = new CID(1, 'dag-cbor', hash) // just a random CID
  assert.rejects(Vector.create(store, cid), 'bad loader rejects')
})

it('non-storing store', async () => {
  const store = {
    get () { },
    put () { }
  }

  const hash = await multihashing(Buffer.from('blorp'), 'sha2-256')
  const cid = new CID(1, 'dag-cbor', hash) // just a random CID
  assert.rejects(Vector.create(store, cid), 'bad loader rejects')
})
