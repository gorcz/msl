/**
 * Copyright (c) 2012-2014 Netflix, Inc.  All rights reserved.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * A generic cryptographic context suitable for encryption/decryption,
 * wrap/unwrap, and sign/verify operations.
 *
 * @author Wesley Miaw <wmiaw@netflix.com>
 * @interface
 */
var ICryptoContext = util.Class.create({
    /**
     * Encrypts some data.
     *
     * @param {Uint8Array} data the plaintext.
     * @param {{result: function(Uint8Array), error: function(Error)}}
     *        callback the callback functions that will receive the ciphertext
     *        or any thrown exceptions.
     * @throws MslCryptoException if there is an error encrypting the data.
     */
    encrypt: function(data, callback) {},

    /**
     * Decrypts some data.
     *
     * @param {Uint8Array} data the ciphertext.
     * @param {{result: function(Uint8Array), error: function(Error)}}
     *        callback the callback functions that will receive the plaintext
     *        or any thrown exceptions.
     * @throws MslCryptoException if there is an error decrypting the data.
     */
    decrypt: function(data, callback) {},

    /**
     * Wraps a key.
     *
     * @param {CipherKey|PublicKey|PrivateKey} key the key to wrap.
     * @return {result: function(Uint8Array), error: function(Error)}
     *         callback the callback functions that will receive the wrapped
     *         data or any thrown exceptions.
     * @throws MslCryptoException if there is an error wrapping the key.
     */
    wrap: function(key, callback) {},

    /**
     * Unwraps a key.
     *
     * @param {Uint8Array} data the wrapped data.
     * @param {WebCryptoAlgorithm} algo for the wrapped key.
     * @param {WebCryptoUsage} usages the key usages for the wrapped key.
     * @return {result: function({CipherKey|PublicKey|PrivateKey}), error: function(Error)}
     *         callback the callback functions that will receive the unwrapped
     *         key or any thrown exceptions.
     * @throws MslCryptoException if there is an error unwrapping the key.
     */
    unwrap: function(data, algo, usages, callback) {},

    /**
     * Computes the signature for some data. The signature may not be a
     * signature proper, but the name suits the concept.
     *
     * @param {Uint8Array} data the data.
     * @param {{result: function(Uint8Array), error: function(Error)}}
     *        callback the callback functions that will receive the signature
     *        or any thrown exceptions.
     * @throws MslCryptoException if there is an error computing the signature.
     */
    sign: function(data, callback) {},

    /**
     * Verifies the signature for some data. The signature may not be a
     * signature proper, but the name suits the concept.
     *
     * @param {Uint8Array} data the data.
     * @param {Uint8Array} signature the signature.
     * @param {{result: function(boolean), error: function(Error)}}
     *        callback the callback functions that will receive true if the
     *        data is verified, false if validation fails, or any thrown
     *        exceptions.
     * @throws MslCryptoException if there is an error verifying the signature.
     */
    verify: function(data, signature, callback) {},
});
