import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import path from 'node:path'
import { FileManager } from '../cli/FileManager'

vi.mock('node:child_process')
vi.mock('@clack/prompts')

describe('Integration Tests', () => {
  describe('Full workflow simulation', () => {
    let fileManager: FileManager
    let testRoot: string

    beforeEach(() => {
      vi.clearAllMocks()
      
      fileManager = new FileManager()
      testRoot = '/test/openfort-project'
    })

    it('should initialize FileManager with correct properties', () => {
      fileManager.root = testRoot
      fileManager.packageName = 'openfort-project'
      fileManager.targetDir = 'openfort-project'
      
      expect(fileManager.isInitialized()).toBe(true)
      expect(fileManager.root).toBe(testRoot)
      expect(fileManager.packageName).toBe('openfort-project')
      expect(fileManager.targetDir).toBe('openfort-project')
      expect(fileManager.addSubfolders).toBe(false)
    })

    it('should handle frontend-only project properties', () => {
      fileManager.root = testRoot
      fileManager.packageName = 'openfort-project'
      fileManager.targetDir = 'openfort-project'
      fileManager.addSubfolders = false
      
      expect(fileManager.isInitialized()).toBe(true)
      expect(fileManager.addSubfolders).toBe(false)
      expect(fileManager.getFilePath('package.json')).toBe(path.join(testRoot, 'package.json'))
    })

    it('should handle full-stack project properties', () => {
      fileManager.root = testRoot
      fileManager.packageName = 'openfort-project'
      fileManager.targetDir = 'openfort-project'
      fileManager.addSubfolders = true
      
      expect(fileManager.isInitialized()).toBe(true)
      expect(fileManager.addSubfolders).toBe(true)
      expect(fileManager.getFilePath('package.json')).toBe(path.join(testRoot, 'frontend', 'package.json'))
    })
  })

  describe('Error handling scenarios', () => {
    let fileManager: FileManager

    beforeEach(() => {
      fileManager = new FileManager()
    })

    it('should throw error when trying to write before initialization', () => {
      expect(() => {
        fileManager.write('test.txt', 'content')
      }).toThrow('FileManager not initialized')
    })

    it('should throw error when trying to read before initialization', () => {
      expect(() => {
        fileManager.read('test.txt')
      }).toThrow('FileManager not initialized')
    })

    it('should throw error when trying to addEnv before initialization', () => {
      expect(() => {
        fileManager.addEnv({})
      }).toThrow('FileManager not initialized')
    })

    it('should throw error when trying to getFilePath before initialization', () => {
      expect(() => {
        fileManager.getFilePath('test.txt')
      }).toThrow('FileManager not initialized')
    })
  })

  describe('Environment variable logic', () => {
    it('should extract suffix correctly from keys', () => {
      const key = 'NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY'
      const suffix = key.includes('_') ? key.split('_').slice(1).join('_') : key
      
      expect(suffix).toBe('PUBLIC_OPENFORT_PUBLISHABLE_KEY')
    })

    it('should extract suffix from VITE prefixed keys', () => {
      const key = 'VITE_SHIELD_PUBLISHABLE_KEY'
      const suffix = key.includes('_') ? key.split('_').slice(1).join('_') : key
      
      expect(suffix).toBe('SHIELD_PUBLISHABLE_KEY')
    })

    it('should handle keys without prefix', () => {
      const key = 'SIMPLE_KEY'
      const suffix = key.includes('_') ? key.split('_').slice(1).join('_') : key
      
      expect(suffix).toBe('KEY')
    })

    it('should handle keys with no underscores', () => {
      const key = 'SIMPLEKEY'
      const suffix = key.includes('_') ? key.split('_').slice(1).join('_') : key
      
      expect(suffix).toBe('SIMPLEKEY')
    })

    it('should handle keys with multiple underscores', () => {
      const key = 'NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY'
      const parts = key.split('_')
      const suffix = parts.slice(1).join('_')
      
      expect(suffix).toBe('PUBLIC_OPENFORT_PUBLISHABLE_KEY')
      expect(parts.length).toBe(5)
    })
  })

  describe('Package manager detection', () => {
    const originalUserAgent = process.env.npm_config_user_agent

    afterEach(() => {
      if (originalUserAgent !== undefined) {
        process.env.npm_config_user_agent = originalUserAgent
      } else {
        delete process.env.npm_config_user_agent
      }
    })

    it('should detect npm', () => {
      process.env.npm_config_user_agent = 'npm/8.19.2 node/v18.12.0'
      const fm = new FileManager()
      expect(fm.pkgManager).toBe('npm')
    })

    it('should detect yarn', () => {
      process.env.npm_config_user_agent = 'yarn/3.0.0 node/v18.12.0'
      const fm = new FileManager()
      expect(fm.pkgManager).toBe('yarn')
    })

    it('should detect pnpm', () => {
      process.env.npm_config_user_agent = 'pnpm/7.14.0 node/v18.12.0'
      const fm = new FileManager()
      expect(fm.pkgManager).toBe('pnpm')
    })

    it('should default to npm when no user agent', () => {
      delete process.env.npm_config_user_agent
      const fm = new FileManager()
      expect(fm.pkgManager).toBe('npm')
    })
  })
})

