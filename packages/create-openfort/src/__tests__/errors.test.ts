import { describe, it, expect } from 'vitest'
import { 
  TemplateDownloadError, 
  TemplateTimeoutError, 
  categorizeCloneError,
  createCloneError,
  createSpawnError
} from '../cli/errors'

describe('Error Classes', () => {
  describe('TemplateDownloadError', () => {
    it('should create error with correct properties', () => {
      const error = new TemplateDownloadError('Test message', 'TEST_CODE', 'Test details')
      
      expect(error.message).toBe('Test message')
      expect(error.code).toBe('TEST_CODE')
      expect(error.details).toBe('Test details')
      expect(error.name).toBe('TemplateDownloadError')
      expect(error).toBeInstanceOf(Error)
    })

    it('should work without details', () => {
      const error = new TemplateDownloadError('Test message', 'TEST_CODE')
      
      expect(error.message).toBe('Test message')
      expect(error.code).toBe('TEST_CODE')
      expect(error.details).toBeUndefined()
    })
  })

  describe('TemplateTimeoutError', () => {
    it('should create timeout error with correct message', () => {
      const error = new TemplateTimeoutError(30)
      
      expect(error.message).toContain('timed out after 30s')
      expect(error.message).toContain('network issues')
      expect(error.message).toContain('internet connection')
      expect(error.code).toBe('TIMEOUT')
      expect(error.details).toBe('Timeout: 30s')
      expect(error.name).toBe('TemplateTimeoutError')
      expect(error).toBeInstanceOf(TemplateDownloadError)
      expect(error).toBeInstanceOf(Error)
    })

    it('should handle decimal timeout values', () => {
      const error = new TemplateTimeoutError(1.5)
      
      expect(error.message).toContain('timed out after 1.5s')
      expect(error.details).toBe('Timeout: 1.5s')
    })
  })
})

describe('Error Categorization', () => {
  describe('categorizeCloneError', () => {
    it('should categorize repository not found error', () => {
      const result = categorizeCloneError('could not find commit hash for master')
      
      expect(result.code).toBe('REPO_NOT_FOUND')
      expect(result.message).toContain('repository or path might not exist')
      expect(result.details).toBe('could not find commit hash for master')
    })

    it('should categorize network error (ENOTFOUND)', () => {
      const result = categorizeCloneError('Error: ENOTFOUND github.com')
      
      expect(result.code).toBe('NETWORK_ERROR')
      expect(result.message).toContain('Network error')
      expect(result.message).toContain('internet connection')
    })

    it('should categorize network error (ECONNREFUSED)', () => {
      const result = categorizeCloneError('Error: connect ECONNREFUSED')
      
      expect(result.code).toBe('NETWORK_ERROR')
      expect(result.message).toContain('Network error')
    })

    it('should categorize rate limit error', () => {
      const result = categorizeCloneError('API rate limit exceeded for user')
      
      expect(result.code).toBe('RATE_LIMIT')
      expect(result.message).toContain('rate limit')
      expect(result.message).toContain('try again later')
    })

    it('should categorize npx not found error from Error object', () => {
      const error = new Error('spawn npx ENOENT')
      const result = categorizeCloneError('', error)
      
      expect(result.code).toBe('NPX_NOT_FOUND')
      expect(result.message).toContain('npx command not found')
      expect(result.message).toContain('Node.js and npm')
    })

    it('should handle unknown errors from stderr', () => {
      const result = categorizeCloneError('Some unknown error occurred')
      
      expect(result.code).toBe('UNKNOWN_ERROR')
      expect(result.message).toContain('Some unknown error occurred')
      expect(result.details).toBe('Some unknown error occurred')
    })

    it('should handle unknown errors from Error object', () => {
      const error = new Error('Some random error')
      const result = categorizeCloneError('', error)
      
      expect(result.code).toBe('UNKNOWN_ERROR')
      expect(result.message).toBe('Some random error')
      expect(result.details).toBe('Some random error')
    })

    it('should handle empty stderr and no error', () => {
      const result = categorizeCloneError('')
      
      expect(result.code).toBe('UNKNOWN_ERROR')
      expect(result.message).toBe('Unknown error occurred')
      expect(result.details).toBe('')
    })

    it('should prioritize stderr over error object', () => {
      const error = new Error('Error message')
      const result = categorizeCloneError('rate limit exceeded', error)
      
      expect(result.code).toBe('RATE_LIMIT')
      expect(result.message).toContain('rate limit')
    })

    it('should trim stderr in details', () => {
      const result = categorizeCloneError('  \n  some error  \n  ')
      
      expect(result.details).toBe('some error')
    })

    it('should be case insensitive', () => {
      const result1 = categorizeCloneError('COULD NOT FIND COMMIT HASH')
      const result2 = categorizeCloneError('Could Not Find Commit Hash')
      const result3 = categorizeCloneError('could not find commit hash')
      
      expect(result1.code).toBe('REPO_NOT_FOUND')
      expect(result2.code).toBe('REPO_NOT_FOUND')
      expect(result3.code).toBe('REPO_NOT_FOUND')
    })
  })

  describe('createCloneError', () => {
    it('should create error with exit code and categorized message', () => {
      const error = createCloneError(1, 'could not find commit hash')
      
      expect(error.message).toContain('Failed to download template (exit code 1)')
      expect(error.message).toContain('repository or path might not exist')
      expect(error.code).toBe('REPO_NOT_FOUND')
      expect(error.details).toBe('could not find commit hash')
      expect(error).toBeInstanceOf(TemplateDownloadError)
    })

    it('should handle network errors', () => {
      const error = createCloneError(1, 'ENOTFOUND api.github.com')
      
      expect(error.message).toContain('exit code 1')
      expect(error.message).toContain('Network error')
      expect(error.code).toBe('NETWORK_ERROR')
    })

    it('should handle unknown errors', () => {
      const error = createCloneError(128, 'Something went wrong')
      
      expect(error.message).toContain('exit code 128')
      expect(error.message).toContain('Something went wrong')
      expect(error.code).toBe('UNKNOWN_ERROR')
    })
  })

  describe('createSpawnError', () => {
    it('should create error from spawn error', () => {
      const spawnError = new Error('spawn npx ENOENT')
      const error = createSpawnError(spawnError)
      
      expect(error.message).toContain('Failed to spawn download process')
      expect(error.message).toContain('npx command not found')
      expect(error.code).toBe('NPX_NOT_FOUND')
      expect(error).toBeInstanceOf(TemplateDownloadError)
    })

    it('should handle unknown spawn errors', () => {
      const spawnError = new Error('Some spawn error')
      const error = createSpawnError(spawnError)
      
      expect(error.message).toContain('Failed to spawn download process')
      expect(error.message).toContain('Some spawn error')
      expect(error.code).toBe('UNKNOWN_ERROR')
    })
  })
})

