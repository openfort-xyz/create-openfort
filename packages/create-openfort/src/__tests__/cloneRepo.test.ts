import { describe, it, expect, vi, beforeEach } from 'vitest'
import { spawn } from 'node:child_process'
import { cloneRepo } from '../cli/FileManager'
import { EventEmitter } from 'node:events'

vi.mock('node:child_process')

describe('cloneRepo', () => {
  let mockChild: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockChild = new EventEmitter()
    mockChild.stdout = new EventEmitter()
    mockChild.stderr = new EventEmitter()
    mockChild.kill = vi.fn()
    
    vi.mocked(spawn).mockReturnValue(mockChild as any)
  })

  it('should spawn npx degit with correct arguments', async () => {
    const promise = cloneRepo('user/repo', '/target/dir')
    
    // Simulate successful completion
    setTimeout(() => mockChild.emit('close', 0, null), 10)
    
    await promise
    
    expect(spawn).toHaveBeenCalledWith(
      'npx',
      ['degit', 'user/repo', '/target/dir'],
      { shell: true }
    )
  })

  it('should resolve on successful clone (exit code 0)', async () => {
    const promise = cloneRepo('user/repo', '/target/dir')
    
    setTimeout(() => mockChild.emit('close', 0, null), 10)
    
    await expect(promise).resolves.toBeUndefined()
  })

  it('should reject on failed clone (non-zero exit code)', async () => {
    const promise = cloneRepo('user/repo', '/target/dir')
    
    setTimeout(() => mockChild.emit('close', 1, null), 10)
    
    await expect(promise).rejects.toThrow('Failed to download template (exit code 1)')
  })

  it('should reject on spawn error', async () => {
    const promise = cloneRepo('user/repo', '/target/dir')
    
    const error = new Error('Spawn failed')
    setTimeout(() => mockChild.emit('error', error), 10)
    
    await expect(promise).rejects.toThrow('Failed to spawn download process. Spawn failed')
  })

  it('should handle stdout data when verbose', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    
    const promise = cloneRepo('user/repo', '/target/dir', { verbose: true })
    
    mockChild.stdout.emit('data', 'Cloning...')
    setTimeout(() => mockChild.emit('close', 0, null), 10)
    
    await promise
    
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('Cloning...'))
    
    writeSpy.mockRestore()
  })

  it('should handle stderr data when verbose', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    
    const promise = cloneRepo('user/repo', '/target/dir', { verbose: true })
    
    mockChild.stderr.emit('data', 'Warning: ...')
    setTimeout(() => mockChild.emit('close', 0, null), 10)
    
    await promise
    
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('Warning'))
    
    writeSpy.mockRestore()
  })

  it('should not log stdout/stderr when not verbose', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    
    const promise = cloneRepo('user/repo', '/target/dir', { verbose: false })
    
    mockChild.stdout.emit('data', 'Cloning...')
    mockChild.stderr.emit('data', 'Warning: ...')
    setTimeout(() => mockChild.emit('close', 0, null), 10)
    
    await promise
    
    expect(writeSpy).not.toHaveBeenCalled()
    
    writeSpy.mockRestore()
  })

  it('should handle multiple close events gracefully', async () => {
    const promise = cloneRepo('user/repo', '/target/dir')
    
    mockChild.emit('close', 0, null)
    mockChild.emit('close', 0, null) // Should not cause issues
    
    await expect(promise).resolves.toBeUndefined()
  })

  describe('timeout handling', () => {
    it('should timeout after default 60 seconds', async () => {
      const promise = cloneRepo('user/repo', '/target/dir')
      
      // Don't emit close event, let it timeout
      await expect(promise).rejects.toThrow('Template download timed out after 60s')
      expect(mockChild.kill).toHaveBeenCalled()
    }, 65000)

    it('should timeout after custom timeout value', async () => {
      const promise = cloneRepo('user/repo', '/target/dir', { timeout: 1000 })
      
      // Don't emit close event, let it timeout
      await expect(promise).rejects.toThrow('Template download timed out after 1s')
      expect(mockChild.kill).toHaveBeenCalled()
    }, 2000)

    it('should include helpful message in timeout error', async () => {
      const promise = cloneRepo('user/repo', '/target/dir', { timeout: 100 })
      
      await expect(promise).rejects.toThrow(/network issues/)
      await expect(promise).rejects.toThrow(/repository being unavailable/)
      await expect(promise).rejects.toThrow(/internet connection/)
    })

    it('should not timeout if process completes in time', async () => {
      const promise = cloneRepo('user/repo', '/target/dir', { timeout: 1000 })
      
      setTimeout(() => mockChild.emit('close', 0, null), 100)
      
      await expect(promise).resolves.toBeUndefined()
      expect(mockChild.kill).not.toHaveBeenCalled()
    })

    it('should clear timeout on successful completion', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      const promise = cloneRepo('user/repo', '/target/dir', { timeout: 1000 })
      
      setTimeout(() => mockChild.emit('close', 0, null), 10)
      
      await promise
      
      expect(clearTimeoutSpy).toHaveBeenCalled()
      clearTimeoutSpy.mockRestore()
    })

    it('should clear timeout on error', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      const promise = cloneRepo('user/repo', '/target/dir', { timeout: 1000 })
      
      setTimeout(() => mockChild.emit('error', new Error('Test error')), 10)
      
      await expect(promise).rejects.toThrow()
      
      expect(clearTimeoutSpy).toHaveBeenCalled()
      clearTimeoutSpy.mockRestore()
    })
  })

  describe('error messages', () => {
    it('should provide helpful error for missing repository', async () => {
      const promise = cloneRepo('user/repo', '/target/dir')
      
      mockChild.stderr.emit('data', 'could not find commit hash for master')
      setTimeout(() => mockChild.emit('close', 1, null), 10)
      
      await expect(promise).rejects.toThrow('repository or path might not exist')
    })

    it('should provide helpful error for network issues (ENOTFOUND)', async () => {
      const promise = cloneRepo('user/repo', '/target/dir')
      
      mockChild.stderr.emit('data', 'Error: ENOTFOUND github.com')
      setTimeout(() => mockChild.emit('close', 1, null), 10)
      
      await expect(promise).rejects.toThrow('Network error - please check your internet connection')
    })

    it('should provide helpful error for network issues (ECONNREFUSED)', async () => {
      const promise = cloneRepo('user/repo', '/target/dir')
      
      mockChild.stderr.emit('data', 'Error: ECONNREFUSED')
      setTimeout(() => mockChild.emit('close', 1, null), 10)
      
      await expect(promise).rejects.toThrow('Network error - please check your internet connection')
    })

    it('should provide helpful error for rate limit', async () => {
      const promise = cloneRepo('user/repo', '/target/dir')
      
      mockChild.stderr.emit('data', 'API rate limit exceeded')
      setTimeout(() => mockChild.emit('close', 1, null), 10)
      
      await expect(promise).rejects.toThrow('GitHub rate limit exceeded')
    })

    it('should include stderr in error message for unknown errors', async () => {
      const promise = cloneRepo('user/repo', '/target/dir')
      
      mockChild.stderr.emit('data', 'Some unknown error occurred')
      setTimeout(() => mockChild.emit('close', 1, null), 10)
      
      await expect(promise).rejects.toThrow('Some unknown error occurred')
    })

    it('should provide helpful error when npx is not found', async () => {
      const promise = cloneRepo('user/repo', '/target/dir')
      
      const error = new Error('spawn npx ENOENT')
      setTimeout(() => mockChild.emit('error', error), 10)
      
      await expect(promise).rejects.toThrow('npx command not found')
      await expect(promise).rejects.toThrow('Node.js and npm are installed')
    })
  })

  describe('edge cases', () => {
    it('should handle timeout firing after close event', async () => {
      const promise = cloneRepo('user/repo', '/target/dir', { timeout: 100 })
      
      // Complete successfully immediately
      mockChild.emit('close', 0, null)
      
      // Wait for timeout to potentially fire
      await promise
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Should still resolve successfully, not throw timeout error
      await expect(promise).resolves.toBeUndefined()
    })

    it('should handle close event after timeout', async () => {
      const promise = cloneRepo('user/repo', '/target/dir', { timeout: 100 })
      
      // Wait for timeout
      await expect(promise).rejects.toThrow('timed out')
      
      // Try to emit close after timeout - should be ignored
      mockChild.emit('close', 0, null)
    })

    it('should handle error event after timeout', async () => {
      const promise = cloneRepo('user/repo', '/target/dir', { timeout: 100 })
      
      // Wait for timeout
      await expect(promise).rejects.toThrow('timed out')
      
      // Try to emit error after timeout - should be ignored
      mockChild.emit('error', new Error('Late error'))
    })

    it('should handle multiple stderr data events', async () => {
      const promise = cloneRepo('user/repo', '/target/dir')
      
      mockChild.stderr.emit('data', 'Error part 1')
      mockChild.stderr.emit('data', ' - Error part 2')
      setTimeout(() => mockChild.emit('close', 1, null), 10)
      
      await expect(promise).rejects.toThrow('Error part 1 - Error part 2')
    })
  })
})

