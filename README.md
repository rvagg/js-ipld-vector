# js-ipld-vector

**An list / array-type data structure for very large, distributed data sets built on [IPLD](http://ipld.io/).**

[![NPM](https://nodei.co/npm/ipld-vector.svg)](https://nodei.co/npm/ipld-vector/)

See also **[ipld-hashmap](https://ghub.io/ipld-hashmap)** for an associative array Map-type data set for IPLD.

This JavaScript implementation conforms to the [IPLD Vector specification](https://github.com/ipld/specs/blob/master/schema-layer/data-structures/vector.md).

The `Vector` in this implementation borrows from JavaScript's native [Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array) object but uses asynchronous accessors rather than synchronous. `Vector` is also **append-only** (for now). When creating a new `Vector` or loading one with existing data, a backing store must be provided. The backing store is provided via a `loader` interface which should have a `get()` method that returns binary IPLD block data when provided a [CID](https://github.com/multiformats/js-cid) (content identifier) and a `put()` method that takes both a CID and binary block data that will store the IPLD block. This interface may connect to a P2P network, a block storage database or even a [ZIP file](https://github.com/rvagg/js-ds-zipcar).

The algorithm for this Vector is implemented in [IAVector](https://github.com/rvagg/iavector), you can read more about it there, or in the [IPLD Vector specification](https://github.com/ipld/specs/blob/master/schema-layer/data-structures/vector.md). IAVector is serialization and storage agnostic and therefore does not contain any IPLD dependencies. IAVector is also immutable, where each mutation operation returns a _new_ instance.

This implementation wraps IAVector with IPLD primitives, including the use of CIDs and the standard [IPLD block encoding](https://github.com/ipld/js-block) formats and presents a mutable interface. Each `Vector` object has its own root CID in the `cid` property. Whenever the `Vector` is mutated (`push()`), the `cid` property will change to the new root block CID.

You can create a new, empty, `Vector` with [`async Vector.create(loader[, options])`](#Vector__create). Loading a `Vector` from existing data can be done with [`async Vector.create(loader[, root][, options])`](#Vector__create).

Be aware that each mutation operation will create at least one new block, stored via `loader.put()`. Large numbers of mutations will create many extraneous intermediate blocks which will need to be garbage collected from the backing store if the intermediate states are not required.

## API

### Contents

 * [`async Vector.create(loader[, options])`](#Vector__create)
 * [`async Vector.createFrom(loader, initialContents[, options])`](#Vector__createFrom)
 * [`async Vector.load(loader, root[, options])`](#Vector__load)
 * [`class Vector`](#Vector)
 * [`async Vector#get(index)`](#Vector_get)
 * [`async Vector#size()`](#Vector_size)
 * [`async Vector#push(value)`](#Vector_push)
 * [`async Vector#values()`](#Vector_values)
 * [`async Vector#cids()`](#Vector_cids)

<a name="Vector__create"></a>
### `async Vector.create(loader[, options])`

Create a new [`Vector`](#Vector) instance, beginning empty.

A backing store must be provided to make use of a Vector, an interface to the store is given
through the mandatory `loader` parameter. The backing store stores IPLD blocks, referenced by
CIDs. `loader` must have two functions: `get(cid)` which should return the raw bytes (`Buffer`
or `Uint8Array`) of a block matching the given CID, and `put(cid, block)` that will store the
provided raw bytes of a block (`block`) and store it with the associated CID.

**Parameters:**

* **`loader`** _(`Object`)_: A loader with `get(cid):block` and `put(cid, block)` functions for
  loading an storing block data by CID.
* **`options`** _(`Object`, optional)_: Options for the Vector. Defaults are provided but you can tweak
  behavior according to your needs with these options.
  * **`options.blockCodec`** _(`string`, optional, default=`'dag-json'`)_: The IPLD codec used to encode the blocks.
  * **`options.blockAlg`** _(`string`, optional, default=`'sha2-256'`)_: The hash algorithm to use when creating CIDs for
    the blocks.
  * **`options.width`** _(`string`, optional, default=`256`)_: The width, or "artiy" of Vector nodes. Each constituent
    block of this Vector will contain, at most, `width` elements or `width` elements to child nodes.
    When a Vector exceeds `width` elements, a new level ("height") is added, where each element of
    the upper level is used to refer to nodes of the lower level. When the Vector reaches `2^width`
    elements, another level is added, and so on. See
    [IPLD Vector specification](https://github.com/ipld/specs/blob/master/schema-layer/data-structures/vector.md)
    for more details on how this works.

**Return value**  _(`Vector`)_: - A new, emptyVector instance.

<a name="Vector__createFrom"></a>
### `async Vector.createFrom(loader, initialContents[, options])`

Create a new [`Vector`](#Vector) instance from an Array as its initial contents.

See [`Vector.create`](#Vector__create) for more information on the required backing store.

**Parameters:**

* **`loader`** _(`Object`)_: A loader with `get(cid):block` and `put(cid, block)` functions for
  loading an storing block data by CID.
* **`initialContents`** _(`Array`)_: An `Array` of elements to create a new Vector from.
  A new Vector will be created with those elements as the initial contents.
* **`options`** _(`Object`, optional)_: Options for the Vector. Defaults are provided but you can tweak
  behavior according to your needs with these options.
  * **`options.blockCodec`** _(`string`, optional, default=`'dag-json'`)_: The IPLD codec used to encode the blocks.
  * **`options.blockAlg`** _(`string`, optional, default=`'sha2-256'`)_: The hash algorithm to use when creating CIDs for
    the blocks.
  * **`options.width`** _(`string`, optional, default=`256`)_: The width, or "artiy" of Vector nodes.
    See [`Vector.create`](#Vector__create) for more information on this option/

**Return value**  _(`Vector`)_: - A Vector instance containing `initialContents`.

<a name="Vector__load"></a>
### `async Vector.load(loader, root[, options])`

Create a new [`Vector`](#Vector) instance, beginning empty, or loading from existing data in a
backing store.

See [`Vector.create`](#Vector__create) for more information on the required backing store.

**Parameters:**

* **`loader`** _(`Object`)_: A loader with `get(cid):block` and `put(cid, block)` functions for
  loading an storing block data by CID.
* **`root`** _(`CID`)_: A root CID of an existing Vector. An existing Vector will be loaded from
  the backing store, assuming that CID identifies the root block of a Vector.
* **`options`** _(`Object`, optional)_: Options for the Vector. Defaults are provided but you can tweak
  behavior according to your needs with these options.
  * **`options.blockCodec`** _(`string`, optional, default=`'dag-json'`)_: The IPLD codec used to encode the blocks.
  * **`options.blockAlg`** _(`string`, optional, default=`'sha2-256'`)_: The hash algorithm to use when creating CIDs for
    the blocks.
  * **`options.expectedWidth`** _(`number`, optional)_: When a `root` CID is provided, this option is used to
    assert the expected `width` parameter that the existing Vector was created with.
  * **`options.expectedHeight`** _(`number`, optional)_: When a `root` CID is provided, this option is used to
    assert the expected `height` of the existing Vector.

**Return value**  _(`Vector`)_: - A Vector instance loaded from an existing root block CID.

<a name="Vector"></a>
### `class Vector`

An IPLD Vector object. Create a new Vector or load an existing one with the asynchronous
[`Vector.create`](#Vector__create) factory method.

This class serves mostly as a IPLD usability wrapper for
[IAVector](https://github.com/rvagg/iavector) which implements the majority of the logic behind the
IPLD Vector specification, without being IPLD-specific. IAVector is immutable, in that each
mutation (delete or set) returns a new IAVector instance. `Vector`, however, is immutable, and
mutation operations may be performed on the same object but its `cid` property will change
with mutations.

**Properties:**

* **`cid`** _(`CID`)_: The _current_ CID of this Vector. It is important to note that this CID
  will change when successfully performing mutation a operation [`Vector#push`](#Vector_push).

<a name="Vector_get"></a>
### `async Vector#get(index)`

Fetches the value of the provided `key` stored in this Vector, if it exists.

**Parameters:**

* **`index`** _(`int`)_: The index of the entry to look up in this Vector.

**Return value**  _(`*|CID|undefined`)_: The value stored for the given `index` which may be any type serializable by IPLD, or a CID to
  an existing IPLD object. This should match what was provided by [`Vector#set`](#Vector_set) as the
  `value` for this `index`. If the `index` is beyond the size of this Vector, `undefined` will be
  returned.

<a name="Vector_size"></a>
### `async Vector#size()`

Count the number of entries stored in this Vector.

**Return value**  _(`number`)_: An integer greater than or equal to zero indicating the number of entries stored
  in this Vector.

<a name="Vector_push"></a>
### `async Vector#push(value)`

Append an entry to this Vector. The value may be any object that can be serialized by
IPLD, or a CID to a more complex (or larger) object. [`Vector#get`](#Vector_get) operations on the
`index` where this value is stored will retreve the `value` as it was set as long as
serialization and deserialization results in the same object.

As a mutation operation, performing a successful `push()` where a new entry, a new root node
will be generated so `vector.cid` will be a different CID. This CID should be used to refer
to this collection in the backing store where persistence is required.

**Parameters:**

* **`value`** _(`*|CID`)_: The value to store, either an object that can be serialized inline
  via IPLD or a CID pointing to another object.

<a name="Vector_values"></a>
### `async Vector#values()`

Asynchronously emit all values that exist within this Vector collection. This will cause a
full traversal of all nodes that make up this collection so may result in many block loads
from the backing store if the collection is large.

**Return value**  _(`AsyncIterator.<(*|CID)>`)_: An async iterator that yields values of the type stored in this collection, either inlined
  objects or CIDs.

<a name="Vector_cids"></a>
### `async Vector#cids()`

Asynchronously emit all CIDs for blocks that make up this Vector. This will cause a
full traversal of all nodes that make up this collection so may result in many block loads
from the backing store if the collection is large.

**Return value**  _(`AsyncIterator.<CID>`)_: An async iterator that yields CIDs for the blocks that comprise this Vector.

## License and Copyright

Copyright 2019 Rod Vagg

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
