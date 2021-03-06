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
 * Test message context.
 * 
 * The {@link #updateServiceTokens(MessageServiceTokenBuilder)} and
 * {@link #write(MessageOutputStream)} methods do nothing. Unit tests should
 * override those methods for the specific test.
 * 
 * @author Wesley Miaw <wmiaw@netflix.com>
 */
var MockMessageContext;
var MockMessageContext$create;

(function() {
	"use strict";
	
    var DH_PARAMETERS_ID = "1";
    var RSA_KEYPAIR_ID = "rsaKeypairId";
    
    /**
     * Service token name for crypto context.
     * @const
     * @type {string}
     */
    var SERVICE_TOKEN_NAME = "serviceToken";
    /**
     * Default service token crypto context name (empty string).
     * @const
     * @type {string}
     */
    var DEFAULT_SERVICE_TOKEN_NAME = "";
    
    /**
     * @param {MslContext} ctx MSL context.
     * @param {WebCryptoAlgorithm} algo key algorithm.
     * @param {WebCryptoUsage} usages key usages.
     * @param {number} bitlength key length in bits.
     * @param {result: function(CipherKey), error: function(Error)}
     *        callback the callback will receive the new key or
     *        any thrown exceptions.
     * @throws CryptoException if there is an error creating the key.
     */
    function getCipherKey(ctx, algo, usages, bitlength, callback) {
        AsyncExecutor(callback, function() {
            var keydata = new Uint8Array(Math.floor(bitlength / 8));
            ctx.getRandom().nextBytes(keydata);
            CipherKey$import(keydata, algo, usages, callback);
        });
    }
    
    MockMessageContext = MessageContext.extend({
	    /**
	     * Create a new test message context.
	     * 
	     * The message will not be encrypted or non-replayable.
	     * 
	     * @param {MockMslContext} ctx MSL context.
	     * @param {string} userId user ID.
	     * @param {UserAuthenticationScheme} scheme user authentication scheme.
	     * @param {result: function(MockMessageContext), error: function(Error)}
	     *        callback the callback that will receive the new message context
	     *        or any thrown exceptions.
	     * @throws NoSuchAlgorithmException if a key generation algorithm is not
	     *         found.
	     * @throws InvalidAlgorithmParameterException if key generation parameters
	     *         are invalid.
	     * @throws CryptoException if there is an error creating a key.
	     */
	    init: function init(ctx, userId, scheme, callback) {
	        var self = this;
	        AsyncExecutor(callback, function() {
	            getCipherKey(ctx, WebCryptoAlgorithm.AES_CBC, WebCryptoUsage.ENCRYPT_DECRYPT, 128, {
	                result: function(encryptionKeyA) {
	                    getCipherKey(ctx, WebCryptoAlgorithm.HMAC_SHA256, WebCryptoUsage.SIGN_VERIFY, 256, {
	                        result: function(hmacKeyA) {
	                            getCipherKey(ctx, WebCryptoAlgorithm.AES_CBC, WebCryptoUsage.ENCRYPT_DECRYPT, 128, {
	                                result: function(encryptionKeyB) {
	                                    getCipherKey(ctx, WebCryptoAlgorithm.HMAC_SHA256, WebCryptoUsage.SIGN_VERIFY, 256, {
	                                        result: function(hmacKeyB) {
	                                            createContext(encryptionKeyA, hmacKeyA, encryptionKeyB, hmacKeyB);
	                                        },
	                                        error: function(e) { callback.error(e); }
	                                    });
	                                },
	                                error: function(e) { callback.error(e); }
	                            });
	                        },
	                        error: function(e) { callback.error(e); }
	                    });
	                },
	                error: function(e) { callback.error(e); }
	            });
	        }, self);
	        
	        function createContext(tokenEncryptionKeyA, tokenHmacKeyA, tokenEncryptionKeyB, tokenHmacKeyB) {
	            AsyncExecutor(callback, function() {
	                var userAuthData;
	                if (UserAuthenticationScheme.EMAIL_PASSWORD == scheme) {
	                    userAuthData = new EmailPasswordAuthenticationData(MockEmailPasswordAuthenticationFactory.EMAIL, MockEmailPasswordAuthenticationFactory.PASSWORD);
	                } else {
	                    throw new MslInternalException("Unsupported authentication type: " + scheme.name);
	                }

	                var keyRequestData = new Array();
	                {
	                    /* FIXME: Need Web Crypto Diffie-Hellman
	                    var paramSpecs = ctx.getDhParameterSpecs();
	                    var paramId = undefined, paramSpec;
	                    for (var id in paramSpecs) {
	                        paramId = id;
	                        paramSpec = paramSpecs[id];
	                        break;
	                    }
	                    var x = new Uint8Array(128);
	                    ctx.getRandom().nextBytes(x);
	                    var bix = new BigInteger(x);
	                    var privateKey = new PrivateKey(bix);
	                    var publicKey = new PublicKey(paramSpec.g.modPowInt(bix, paramSpec.p));
	                    var requestData = new DiffieHellmanExchange$RequestData(paramId, publicKey, privateKey);
	                    keyRequestData.push(requestData);
	                    */
	                }
	                {
	                    var publicKey = MockRsaAuthenticationFactory.RSA_PUBKEY;
	                    var privateKey = MockRsaAuthenticationFactory.RSA_PRIVKEY;
	                    var requestData = new AsymmetricWrappedExchange$RequestData(RSA_KEYPAIR_ID, AsymmetricWrappedExchange$Mechanism.RSA, publicKey, privateKey);
	                    keyRequestData.push(requestData);
	                }
	                {
	                    keyRequestData.push(new SymmetricWrappedExchange$RequestData(SymmetricWrappedExchange$KeyId.PSK));
	                }

	                var cryptoContexts = {};
	                cryptoContexts[SERVICE_TOKEN_NAME] = new SymmetricCryptoContext(ctx, SERVICE_TOKEN_NAME, tokenEncryptionKeyA, tokenHmacKeyA, null);
	                cryptoContexts[DEFAULT_SERVICE_TOKEN_NAME] = new SymmetricCryptoContext(ctx, DEFAULT_SERVICE_TOKEN_NAME, tokenEncryptionKeyB, tokenHmacKeyB, null);

	                // The properties.
	                var props = {
	                    recipient: { value: null, writable: true, enumerable: false, configurable: false },
	                    encrypted: { value: false, writable: true, enumerable: false, configurable: false },
	                    integrityProtected: { value: false, writable: true, enumerable: false, configurable: false },
	                    nonReplayable: { value: false, writable: true, enumerable: false, configurable: false },
	                    requestingTokens: { value: false, writable: true, enumerable: false, configurable: false },
	                    userId: { value: userId, writable: false, enumerable: false, configurable: false },
	                    userAuthData: { value: userAuthData, writable: true, enumerable: false, configurable: false },
	                    user: { value: null, writable: true, enumerable: false, configurable: false },
	                    keyRequestData: { value: keyRequestData, writable: true, enumerable: false, configurable: false },
	                    cryptoContexts: { value: cryptoContexts, writable: false, enumerable: false, configurable: false },
	                    debugContext: { value: null, writable: true, enumerable: false, configurable: false },
	                };
	                Object.defineProperties(this, props);
	                return this;
	            }, self);
	        }
	    },
	
	    /** @inheritDoc */
	    getCryptoContexts: function getCryptoContexts() {
	        return this.cryptoContexts;
	    },
	    
	    /**
	     * Remove a service token crypto context.
	     * 
	     * @param {string} name service token name.
	     */
	    removeCryptoContext: function removeCryptoContext(name) {
	        delete this.cryptoContexts[name];
	    },
	    
	    /**
	     * @param {string} recipient the message recipient or {@code null} if unknown.
	     */
	    setRecipient: function setRecipient(recipient) {
	        this.recipient = recipient;
	    },
	    
	    /** @inheritDoc */
	    getRecipient: function getRecipient() {
	        return this.recipient;
	    },
	    
	    /**
	     * @param {boolean} encrypted true if the message must be encrypted.
	     */
	    setEncrypted: function setEncrypted(encrypted) {
	        this.encrypted = encrypted;
	    },
	
	    /** @inheritDoc */
	    isEncrypted: function isEncrypted() {
	        return this.encrypted;
	    },
	    
	    /**
	     * @param {boolean} integrityProtected true if the message must be integrity
	     *        protected.
	     */
	    setIntegrityProtected: function setIntegrityProtected(integrityProtected) {
	        this.integrityProtected = integrityProtected;
	    },
	    
	    /** @inheritDoc */
	    isIntegrityProtected: function isIntegrityProtected() {
	        return this.integrityProtected;
	    },

	    /**
	     * @param {boolean} requestingTokens true if the message is requesting tokens.
	     */
	    setRequestingTokens: function setRequestingTokens(requestingTokens) {
	        this.requestingTokens = requestingTokens;
	    },
	    
	    /** @inheritDoc */
	    isRequestingTokens: function isRequestingTokens() {
	        return this.requestingTokens;
	    },
	    
	    /**
	     * @param nonReplayable true if the message must be non-replayable.
	     */
	    setNonReplayable: function setNonReplayable(nonReplayable) {
	        this.nonReplayable = nonReplayable;
	    },
	
	    /** @inheritDoc */
	    isNonReplayable: function isNonReplayable() {
	        return this.nonReplayable;
	    },
	
	    /** @inheritDoc */
	    getUserId: function getUserId() {
	        return this.userId;
	    },
	    
	    /**
	     * @param {UserAuthenticationData} userAuthData the new user authentication data.
	     */
	    setUserAuthData: function setUserAuthData(userAuthData) {
	    	this.userAuthData = userAuthData;
	    },
	
	    /** @inheritDoc */
	    getUserAuthData: function getUserAuthData(reauthCode, renewable, required, callback) {
	    	// Default implementation just returns the existing user authentication
	    	// data. Override to implement specific behavior.
	    	callback.result(this.userAuthData);
	    },
	    
	    /**
	     * @param {MslUser} user the remote user. 
	     */
	    setUser: function setUser(user) {
	        this.user = user;
	    },
	    
	    /** @inheritDoc */
	    getUser: function getUser() {
	        return this.user;
	    },
	    
	    /**
	     * @param {Array.<KeyRequestData>} keyRequestData the new key request data.
	     */
	    setKeyRequestData: function setKeyRequestData(keyRequestData) {
	        this.keyRequestData = keyRequestData;
	    },
	
	    /** @inheritDoc */
	    getKeyRequestData: function getKeyRequestData(callback) {
	    	callback.result(this.keyRequestData);
	    },
	
	    /** @inheritDoc */
	    updateServiceTokens: function updateServiceTokens(builder, handshake, callback) {
	        // Default implementation does nothing. Override to implement specific
	        // behavior.
	    	callback.result(true);
	    },
	
	    /** @inheritDoc */
	    write: function write(output, timeout, callback) {
	        // Default implementation does nothing. Override to implement specific
	        // behavior.
	    	callback.result(true);
	    },
	    
	    /**
	     * @param {MessageDebugContext} debugContext the new message debug context.
	     */
	    setMessageDebugContext: function setMessageDebugContext(debugContext) {
	        this.debugContext = debugContext;
	    },

	    /** @inheritDoc */
	    getDebugContext: function getDebugContext() {
	        return this.debugContext;
	    }
    });
    
    /**
     * Create a new test message context.
     * 
     * The message will not be encrypted or non-replayable.
     * 
     * @param {MockMslContext} ctx MSL context.
     * @param {string} userId user ID.
     * @param {UserAuthenticationScheme} scheme user authentication scheme.
     * @param {result: function(MockMessageContext), error: function(Error)}
     *        callback the callback that will receive the new message context
     *        or any thrown exceptions.
     * @throws NoSuchAlgorithmException if a key generation algorithm is not
     *         found.
     * @throws InvalidAlgorithmParameterException if key generation parameters
     *         are invalid.
     * @throws CryptoException if there is an error creating a key.
     */
    MockMessageContext$create = function MockMessageContext$create(ctx, userId, scheme, callback) {
        new MockMessageContext(ctx, userId, scheme, callback);
    };
    
    // Expose public static properties.
    MockMessageContext.DH_PARAMETERS_ID = DH_PARAMETERS_ID;
    MockMessageContext.RSA_KEYPAIR_ID = RSA_KEYPAIR_ID;
    MockMessageContext.SERVICE_TOKEN_NAME = SERVICE_TOKEN_NAME;
    MockMessageContext.DEFAULT_SERVICE_TOKEN_NAME = DEFAULT_SERVICE_TOKEN_NAME;
})();
