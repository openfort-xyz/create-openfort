import { describe, it, expect, vi, beforeEach } from 'vitest'
import { spawn } from 'node:child_process'
import { cloneRepo } from '../cli/FileManager'
import { EventEmitter } from 'node:events'

vi.mock('node:child_process')

describe('cloneRepo', () => {
  let mockChild: any

  beforeEach(() => {
    mockChild = new EventEmitter()
    mockChild.stdout = new EventEmitter()
    mockChild.stderr = new EventEmitter()
    
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
    
    await expect(promise).rejects.toThrow('Process exited with code 1')
  })

  it('should reject on spawn error', async () => {
    const promise = cloneRepo('user/repo', '/target/dir')
    
    const error = new Error('Spawn failed')
    setTimeout(() => mockChild.emit('error', error), 10)
    
    await expect(promise).rejects.toThrow('Spawn failed')
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
})

