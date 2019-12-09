const IAVector = require('iavector')
const CID = require('cids')
const Block = require('@ipld/block')

const DEFAULT_BLOCK_CODEC = 'dag-cbor'
const DEFAULT_BLOCK_ALGORITHM = 'sha2-256'
const DEFAULT_WIDTH = 256


function checkLoader (loader) {
  if (!loader || typeof loader.get !== 'function' || typeof loader.put !== 'function') {
    throw new TypeError('\'loader\' object with get() and put() methods')
  }
}

function decodeOptions (loader, options) {
  if (options && typeof options !== 'object') {
    throw new TypeError('\'options\' argument must be an object')
  }

  function fromOptions (name, type, def) {
    if (!options || options[name] === undefined) {
      return def
    }
    if (typeof options[name] !== type) { // eslint-disable-line
      throw new TypeError(`'${name}' must be a ${type}`)
    }
    return options[name]
  }

  const codec = fromOptions('blockCodec', 'string', DEFAULT_BLOCK_CODEC)
  const algorithm = fromOptions('blockAlg', 'string', DEFAULT_BLOCK_ALGORITHM)
  const width = fromOptions('width', 'number', DEFAULT_WIDTH)
  const expectedWidth = fromOptions('expectedWidth', 'number')
  const expectedHeight = fromOptions('expectedHeight', 'number')

  const store = {
    async load (cid) {
      const bytes = await loader.get(cid)
      if (!bytes) {
        return undefined
      }
      const block = Block.create(bytes, cid)
      if (!(await block.validate())) {
        throw new Error(`Loaded block for ${cid.toString()} did not validate bytes against CID`)
      }
      return block.decode()
    },

    async save (obj) {
      const block = Block.encoder(obj, codec, algorithm)
      const cid = await block.cid()
      await loader.put(cid, await block.encode())
      return cid
    }
  }

  return { store, width, expectedWidth, expectedHeight }
}

/**
 * Create a new {@link Vector} instance, beginning empty.
 *
 * A backing store must be provided to make use of a Vector, an interface to the store is given
 * through the mandatory `loader` parameter. The backing store stores IPLD blocks, referenced by
 * CIDs. `loader` must have two functions: `get(cid)` which should return the raw bytes (`Buffer`
 * or `Uint8Array`) of a block matching the given CID, and `put(cid, block)` that will store the
 * provided raw bytes of a block (`block`) and store it with the associated CID.
 *
 * @async
 * @param {Object} loader - A loader with `get(cid):block` and `put(cid, block)` functions for
 * loading an storing block data by CID.
 * @param {Object} [options] - Options for the Vector. Defaults are provided but you can tweak
 * behavior according to your needs with these options.
 * @param {string} [options.blockCodec='dag-json'] - The IPLD codec used to encode the blocks.
 * @param {string} [options.blockAlg='sha2-256'] - The hash algorithm to use when creating CIDs for
 * the blocks.
 * @param {string} [options.width=256] - The width, or "artiy" of Vector nodes. Each constituent
 * block of this Vector will contain, at most, `width` elements or `width` elements to child nodes.
 * When a Vector exceeds `width` elements, a new level ("height") is added, where each element of
 * the upper level is used to refer to nodes of the lower level. When the Vector reaches `2^width`
 * elements, another level is added, and so on. See
 * [IPLD Vector specification](https://github.com/ipld/specs/blob/master/schema-layer/data-structures/vector.md)
 * for more details on how this works.
 * @return {Vector} - A new, emptyVector instance.
 */
Vector.create = async function create (loader, options) {
  checkLoader(loader)
  const { store, width } = decodeOptions(loader, options)
  const iavector = await IAVector.create(store, width)
  return new Vector(iavector)
}

/**
 * Create a new {@link Vector} instance from an Array as its initial contents.
 *
 * See {@link Vector.create} for more information on the required backing store.
 *
 * @async
 * @param {Object} loader - A loader with `get(cid):block` and `put(cid, block)` functions for
 * loading an storing block data by CID.
 * @param {Array} initialContents - An `Array` of elements to create a new Vector from.
 * A new Vector will be created with those elements as the initial contents.
 * @param {Object} [options] - Options for the Vector. Defaults are provided but you can tweak
 * behavior according to your needs with these options.
 * @param {string} [options.blockCodec='dag-json'] - The IPLD codec used to encode the blocks.
 * @param {string} [options.blockAlg='sha2-256'] - The hash algorithm to use when creating CIDs for
 * the blocks.
 * @param {string} [options.width=256] - The width, or "artiy" of Vector nodes.
 * See {@link Vector.create} for more information on this option/
 * @return {Vector} - A Vector instance containing `initialContents`.
 */
Vector.createFrom = async function createFrom (loader, initialContents, options) {
  checkLoader(loader)
  if (!Array.isArray(initialContents)) {
    throw new TypeError('\'initialContents\' must be an Array')
  }
  const { store, width } = decodeOptions(loader, options)
  const iavector = await IAVector.create(store, width, initialContents)
  return new Vector(iavector)
}

/**
 * Create a new {@link Vector} instance, beginning empty, or loading from existing data in a
 * backing store.
 *
 * See {@link Vector.create} for more information on the required backing store.
 *
 * @async
 * @param {Object} loader - A loader with `get(cid):block` and `put(cid, block)` functions for
 * loading an storing block data by CID.
 * @param {CID} root - A root CID of an existing Vector. An existing Vector will be loaded from
 * the backing store, assuming that CID identifies the root block of a Vector.
 * @param {Object} [options] - Options for the Vector. Defaults are provided but you can tweak
 * behavior according to your needs with these options.
 * @param {string} [options.blockCodec='dag-json'] - The IPLD codec used to encode the blocks.
 * @param {string} [options.blockAlg='sha2-256'] - The hash algorithm to use when creating CIDs for
 * the blocks.
 * @param {number} [options.expectedWidth] - When a `root` CID is provided, this option is used to
 * assert the expected `width` parameter that the existing Vector was created with.
 * @param {number} [options.expectedHeight] - When a `root` CID is provided, this option is used to
 * assert the expected `height` of the existing Vector.
 * @return {Vector} - A Vector instance loaded from an existing root block CID.
 */
Vector.load = async function load (loader, root, options) {
  checkLoader(loader)
  if (!CID.isCID(root)) {
    throw new TypeError('\'root\' must be a CID')
  }
  const { store, expectedWidth, expectedHeight } = decodeOptions(loader, options)
  const iavector = await IAVector.load(store, root, expectedWidth, expectedHeight)
  return new Vector(iavector)
}

/**
 * @classdesc
 * An IPLD Vector object. Create a new Vector or load an existing one with the asynchronous
 * {@link Vector.create} factory method.
 *
 * This class serves mostly as a IPLD usability wrapper for
 * [IAVector](https://github.com/rvagg/iavector) which implements the majority of the logic behind the
 * IPLD Vector specification, without being IPLD-specific. IAVector is immutable, in that each
 * mutation (delete or set) returns a new IAVector instance. `Vector`, however, is immutable, and
 * mutation operations may be performed on the same object but its `cid` property will change
 * with mutations.
 *
 * @name Vector
 * @class
 * @hideconstructor
 * @property {CID} cid - The _current_ CID of this Vector. It is important to note that this CID
 * will change when successfully performing mutation a operation {@link Vector#push}.
 */

function Vector (iavector) {
  /* These are defined by IAVector:

    async get (index)
    async push (value)
    async size ()
    async * values ()
    async * nodes ()

    And IAVector is immutable, so mutation operations return a new instance so
    we use `iavector` as the _current_ instance and wrap around that,
    switching it out as we mutate
  */

  /**
   * @name Vector#get
   * @description
   * Fetches the value of the provided `key` stored in this Vector, if it exists.
   * @function
   * @async
   * @memberof Vector
   * @param {int} index - The index of the entry to look up in this Vector.
   * @return {*|CID|undefined}
   * The value stored for the given `index` which may be any type serializable by IPLD, or a CID to
   * an existing IPLD object. This should match what was provided by {@link Vector#set} as the
   * `value` for this `index`. If the `index` is beyond the size of this Vector, `undefined` will be
   * returned.
   */

  /**
   * @name Vector#size
   * @description
   * Count the number of entries stored in this Vector.
   * @function
   * @async
   * @memberof Vector
   * @return {number}
   * An integer greater than or equal to zero indicating the number of entries stored
   * in this Vector.
   */

  // accessors
  for (const fn of ['get', 'size']) {
    this[fn] = async (...args) => {
      return iavector[fn].apply(iavector, args)
    }
  }

  /**
   * @name Vector#push
   * @description
   * Append an entry to this Vector. The value may be any object that can be serialized by
   * IPLD, or a CID to a more complex (or larger) object. {@link Vector#get} operations on the
   * `index` where this value is stored will retreve the `value` as it was set as long as
   * serialization and deserialization results in the same object.
   *
   * As a mutation operation, performing a successful `push()` where a new entry, a new root node
   * will be generated so `vector.cid` will be a different CID. This CID should be used to refer
   * to this collection in the backing store where persistence is required.
   * @function
   * @async
   * @memberof Vector
   * @param {*|CID} value - The value to store, either an object that can be serialized inline
   * via IPLD or a CID pointing to another object.
   */

  // mutators
  this.push = async (...args) => {
    // iavector mutation operations return a new iavector, so update with that
    iavector = await iavector.push.apply(iavector, args)
  }

  /**
   * @name Vector#values
   * @description
   * Asynchronously emit all values that exist within this Vector collection. This will cause a
   * full traversal of all nodes that make up this collection so may result in many block loads
   * from the backing store if the collection is large.
   * @function
   * @async
   * @returns {AsyncIterator.<*|CID>}
   * An async iterator that yields values of the type stored in this collection, either inlined
   * objects or CIDs.
   */

  // iterators
  this.values = async function * values () {
    yield * iavector.values()
  }

  /**
   * @name Vector#cids
   * @description
   * Asynchronously emit all CIDs for blocks that make up this Vector. This will cause a
   * full traversal of all nodes that make up this collection so may result in many block loads
   * from the backing store if the collection is large.
   * @function
   * @async
   * @returns {AsyncIterator.<CID>}
   * An async iterator that yields CIDs for the blocks that comprise this Vector.
   */

  this.cids = async function * () {
    yield * iavector.ids()
  }

  Object.defineProperty(this, 'cid', {
    get () {
      return iavector.id
    }
  })
}

module.exports.create = Vector.create
module.exports.createFrom = Vector.createFrom
module.exports.load = Vector.load
