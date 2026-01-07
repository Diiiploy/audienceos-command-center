/**
 * Crypto Utilities Tests
 * Tests for OAuth state signing and token encryption
 */
import { describe, it, expect } from 'vitest'
import {
  signOAuthState,
  verifyOAuthState,
  serializeEncryptedToken,
  deserializeEncryptedToken,
  validateCryptoConfig,
  type OAuthStatePayload,
} from '@/lib/crypto'

describe('Crypto Utilities', () => {
  describe('OAuth State Signing', () => {
    const validPayload: OAuthStatePayload = {
      integrationId: '123e4567-e89b-12d3-a456-426614174000',
      provider: 'gmail',
      timestamp: Date.now(),
    }

    it('should sign and verify a valid OAuth state', () => {
      const signedState = signOAuthState(validPayload)

      // Should have two parts separated by dot
      expect(signedState).toContain('.')
      const parts = signedState.split('.')
      expect(parts).toHaveLength(2)

      // Should verify successfully
      const verified = verifyOAuthState(signedState)
      expect(verified).not.toBeNull()
      expect(verified?.integrationId).toBe(validPayload.integrationId)
      expect(verified?.provider).toBe(validPayload.provider)
      expect(verified?.timestamp).toBe(validPayload.timestamp)
    })

    it('should return null for tampered signature', () => {
      const signedState = signOAuthState(validPayload)
      const parts = signedState.split('.')

      // Tamper with signature
      const tamperedState = `${parts[0]}.tampered-signature`
      const verified = verifyOAuthState(tamperedState)

      expect(verified).toBeNull()
    })

    it('should return null for tampered payload', () => {
      const signedState = signOAuthState(validPayload)
      const parts = signedState.split('.')

      // Tamper with payload
      const tamperedPayload = Buffer.from(JSON.stringify({
        ...validPayload,
        integrationId: 'different-id',
      })).toString('base64url')

      const tamperedState = `${tamperedPayload}.${parts[1]}`
      const verified = verifyOAuthState(tamperedState)

      expect(verified).toBeNull()
    })

    it('should return null for malformed state (no dot)', () => {
      const verified = verifyOAuthState('nodotinstring')
      expect(verified).toBeNull()
    })

    it('should return null for malformed state (too many parts)', () => {
      const verified = verifyOAuthState('part1.part2.part3')
      expect(verified).toBeNull()
    })

    it('should return null for empty string', () => {
      const verified = verifyOAuthState('')
      expect(verified).toBeNull()
    })

    it('should return null for invalid base64 payload', () => {
      const verified = verifyOAuthState('not-valid-base64!!!.signature')
      expect(verified).toBeNull()
    })

    it('should return null for invalid JSON payload', () => {
      // Create a valid base64 of invalid JSON
      const invalidJson = Buffer.from('not json').toString('base64url')
      const verified = verifyOAuthState(`${invalidJson}.signature`)
      expect(verified).toBeNull()
    })

    it('should return null for payload with missing fields', () => {
      // This tests the structure validation
      const signedState = signOAuthState(validPayload)
      const parts = signedState.split('.')

      // Create payload with missing fields (but valid signature wouldn't match anyway)
      const incompletePayload = Buffer.from(JSON.stringify({
        integrationId: 'test',
        // missing provider and timestamp
      })).toString('base64url')

      const verified = verifyOAuthState(`${incompletePayload}.${parts[1]}`)
      expect(verified).toBeNull()
    })
  })

  describe('Token Serialization', () => {
    const validEncryptedToken = {
      iv: 'base64iv',
      data: 'base64data',
      tag: 'base64tag',
    }

    it('should serialize encrypted token to JSON string', () => {
      const serialized = serializeEncryptedToken(validEncryptedToken)
      expect(typeof serialized).toBe('string')
      expect(JSON.parse(serialized)).toEqual(validEncryptedToken)
    })

    it('should deserialize valid JSON to encrypted token', () => {
      const serialized = JSON.stringify(validEncryptedToken)
      const deserialized = deserializeEncryptedToken(serialized)

      expect(deserialized).not.toBeNull()
      expect(deserialized?.iv).toBe(validEncryptedToken.iv)
      expect(deserialized?.data).toBe(validEncryptedToken.data)
      expect(deserialized?.tag).toBe(validEncryptedToken.tag)
    })

    it('should return null for invalid JSON', () => {
      const deserialized = deserializeEncryptedToken('not json')
      expect(deserialized).toBeNull()
    })

    it('should return null for missing iv field', () => {
      const serialized = JSON.stringify({ data: 'data', tag: 'tag' })
      const deserialized = deserializeEncryptedToken(serialized)
      expect(deserialized).toBeNull()
    })

    it('should return null for missing data field', () => {
      const serialized = JSON.stringify({ iv: 'iv', tag: 'tag' })
      const deserialized = deserializeEncryptedToken(serialized)
      expect(deserialized).toBeNull()
    })

    it('should return null for missing tag field', () => {
      const serialized = JSON.stringify({ iv: 'iv', data: 'data' })
      const deserialized = deserializeEncryptedToken(serialized)
      expect(deserialized).toBeNull()
    })

    it('should return null for non-string field values', () => {
      const serialized = JSON.stringify({ iv: 123, data: 'data', tag: 'tag' })
      const deserialized = deserializeEncryptedToken(serialized)
      expect(deserialized).toBeNull()
    })
  })

  describe('Crypto Config Validation', () => {
    it('should return validation result with warnings array', () => {
      const result = validateCryptoConfig()

      expect(result).toHaveProperty('oauthSigning')
      expect(result).toHaveProperty('tokenEncryption')
      expect(result).toHaveProperty('warnings')
      expect(Array.isArray(result.warnings)).toBe(true)
    })

    it('should have boolean values for signing and encryption status', () => {
      const result = validateCryptoConfig()

      expect(typeof result.oauthSigning).toBe('boolean')
      expect(typeof result.tokenEncryption).toBe('boolean')
    })
  })
})
