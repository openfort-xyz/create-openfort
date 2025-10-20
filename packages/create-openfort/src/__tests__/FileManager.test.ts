import fs from 'node:fs'
import path from 'node:path'
import * as prompts from '@clack/prompts'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  copyDir,
  editFile,
  emptyDir,
  FileManager,
  isEmpty,
  isValidPackageName,
  toValidPackageName,
} from '../cli/FileManager'

// Mock modules
vi.mock('node:fs')
vi.mock('node:child_process')
vi.mock('@clack/prompts')

describe('FileManager helpers', () => {
  describe('isValidPackageName', () => {
    it('should validate correct package names', () => {
      expect(isValidPackageName('my-package')).toBe(true)
      expect(isValidPackageName('my_package')).toBe(true)
      expect(isValidPackageName('mypackage')).toBe(true)
      expect(isValidPackageName('@scope/my-package')).toBe(true)
      expect(isValidPackageName('my-package-123')).toBe(true)
      expect(isValidPackageName('a'.repeat(214))).toBe(true)
    })

    it('should reject invalid package names', () => {
      expect(isValidPackageName('My-Package')).toBe(false) // uppercase
      expect(isValidPackageName('my package')).toBe(false) // spaces
      expect(isValidPackageName('my@package')).toBe(false) // @ in wrong place
      expect(isValidPackageName('')).toBe(false) // empty
      expect(isValidPackageName('my-package.')).toBe(false) // trailing dot
    })

    it('should reject scoped names containing asterisks', () => {
      expect(isValidPackageName('@open*scope/hello')).toBe(false)
    })

    it('should reject package names with trailing dots', () => {
      expect(isValidPackageName('@viem/viem..')).toBe(false)
      expect(isValidPackageName('package..')).toBe(false)
    })

    it('should reject package names that exceed npm length limit', () => {
      expect(isValidPackageName('a'.repeat(215))).toBe(false)
    })

    it('should reject scopes ending with dots', () => {
      expect(isValidPackageName('@scope./pkg')).toBe(false)
    })
  })

  describe('toValidPackageName', () => {
    it('should convert invalid names to valid ones', () => {
      expect(toValidPackageName('My Package')).toBe('my-package')
      expect(toValidPackageName('MY_PACKAGE')).toBe('my-package') // Underscores are converted to lowercase and kept
      expect(toValidPackageName('  package  ')).toBe('package')
      expect(toValidPackageName('package@123')).toBe('package-123')
      expect(toValidPackageName('.package')).toBe('package')
      expect(toValidPackageName('_package')).toBe('package')
    })

    it('should handle special characters', () => {
      expect(toValidPackageName('my!package')).toBe('my-package')
      expect(toValidPackageName('my#package$')).toBe('my-package-') // Trailing special chars become -
      expect(toValidPackageName('my++package')).toBe('my-package')
    })

    it('should strip trailing dots and enforce max length', () => {
      expect(toValidPackageName('package..')).toBe('package')
      expect(toValidPackageName('a'.repeat(220))).toHaveLength(214)
    })
  })

  describe('isEmpty', () => {
    beforeEach(() => {
      vi.mocked(fs.readdirSync).mockReset()
    })

    it('should return true for empty directory', () => {
      vi.mocked(fs.readdirSync).mockReturnValue([])
      expect(isEmpty('/empty/dir')).toBe(true)
    })

    it('should return true for directory with only .git', () => {
      vi.mocked(fs.readdirSync).mockReturnValue(['.git'] as any)
      expect(isEmpty('/with/git')).toBe(true)
    })

    it('should return false for directory with files', () => {
      vi.mocked(fs.readdirSync).mockReturnValue(['file.txt', '.git'] as any)
      expect(isEmpty('/with/files')).toBe(false)
    })

    it('should return false for directory with other hidden files', () => {
      vi.mocked(fs.readdirSync).mockReturnValue(['.git', '.gitignore'] as any)
      expect(isEmpty('/with/hidden')).toBe(false)
    })
  })

  describe('emptyDir', () => {
    beforeEach(() => {
      vi.mocked(fs.existsSync).mockReset()
      vi.mocked(fs.readdirSync).mockReset()
      vi.mocked(fs.rmSync).mockReset()
    })

    it('should not do anything if directory does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      emptyDir('/nonexistent')
      expect(fs.readdirSync).not.toHaveBeenCalled()
      expect(fs.rmSync).not.toHaveBeenCalled()
    })

    it('should remove all files except .git', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync).mockReturnValue(['file1.txt', 'file2.txt', '.git', 'folder'] as any)

      emptyDir('/test/dir')

      expect(fs.rmSync).toHaveBeenCalledTimes(3)
      expect(fs.rmSync).toHaveBeenCalledWith(path.resolve('/test/dir', 'file1.txt'), { recursive: true, force: true })
      expect(fs.rmSync).toHaveBeenCalledWith(path.resolve('/test/dir', 'file2.txt'), { recursive: true, force: true })
      expect(fs.rmSync).toHaveBeenCalledWith(path.resolve('/test/dir', 'folder'), { recursive: true, force: true })
      expect(fs.rmSync).not.toHaveBeenCalledWith(path.resolve('/test/dir', '.git'), expect.any(Object))
    })

    it('should preserve .git directory', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readdirSync).mockReturnValue(['.git', 'README.md'] as any)

      emptyDir('/test/dir')

      expect(fs.rmSync).toHaveBeenCalledTimes(1)
      expect(fs.rmSync).toHaveBeenCalledWith(path.resolve('/test/dir', 'README.md'), { recursive: true, force: true })
    })
  })

  describe('editFile', () => {
    beforeEach(() => {
      vi.mocked(fs.readFileSync).mockReset()
      vi.mocked(fs.writeFileSync).mockReset()
    })

    it('should read, transform, and write file', () => {
      const originalContent = 'Hello World'
      const transformedContent = 'HELLO WORLD'

      vi.mocked(fs.readFileSync).mockReturnValue(originalContent)

      editFile('/test/file.txt', (content) => content.toUpperCase())

      expect(fs.readFileSync).toHaveBeenCalledWith('/test/file.txt', 'utf-8')
      expect(fs.writeFileSync).toHaveBeenCalledWith('/test/file.txt', transformedContent, 'utf-8')
    })

    it('should handle multi-line content', () => {
      const originalContent = 'line1\nline2\nline3'
      const transformedContent = 'line1\nmodified line2\nline3'

      vi.mocked(fs.readFileSync).mockReturnValue(originalContent)

      editFile('/test/file.txt', (content) => content.replace('line2', 'modified line2'))

      expect(fs.writeFileSync).toHaveBeenCalledWith('/test/file.txt', transformedContent, 'utf-8')
    })
  })

  describe('copyDir', () => {
    beforeEach(() => {
      vi.mocked(fs.mkdirSync).mockReset()
      vi.mocked(fs.readdirSync).mockReset()
      vi.mocked(fs.statSync).mockReset()
      vi.mocked(fs.copyFileSync).mockReset()
    })

    it('should create destination directory', () => {
      vi.mocked(fs.readdirSync).mockReturnValue([])

      copyDir('/src', '/dest')

      expect(fs.mkdirSync).toHaveBeenCalledWith('/dest', { recursive: true })
    })

    it('should copy files from source to destination', () => {
      vi.mocked(fs.readdirSync).mockReturnValue(['file1.txt', 'file2.txt'] as any)
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as any)

      copyDir('/src', '/dest')

      expect(fs.copyFileSync).toHaveBeenCalledWith(
        path.resolve('/src', 'file1.txt'),
        path.resolve('/dest', 'file1.txt')
      )
      expect(fs.copyFileSync).toHaveBeenCalledWith(
        path.resolve('/src', 'file2.txt'),
        path.resolve('/dest', 'file2.txt')
      )
    })

    it('should recursively copy directories', () => {
      vi.mocked(fs.readdirSync)
        .mockReturnValueOnce(['folder'] as any)
        .mockReturnValueOnce(['nested-file.txt'] as any)

      vi.mocked(fs.statSync)
        .mockReturnValueOnce({ isDirectory: () => true } as any)
        .mockReturnValueOnce({ isDirectory: () => false } as any)

      copyDir('/src', '/dest')

      expect(fs.mkdirSync).toHaveBeenCalledWith('/dest', { recursive: true })
      expect(fs.mkdirSync).toHaveBeenCalledWith(path.resolve('/dest', 'folder'), { recursive: true })
    })

    it('should respect ignore list', () => {
      vi.mocked(fs.readdirSync).mockReturnValue(['file1.txt', 'file2.txt', 'ignored.txt'] as any)
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as any)

      copyDir('/src', '/dest', [path.resolve('/src', 'ignored.txt')])

      expect(fs.copyFileSync).toHaveBeenCalledTimes(2)
      expect(fs.copyFileSync).not.toHaveBeenCalledWith(path.resolve('/src', 'ignored.txt'), expect.any(String))
    })
  })
})

describe('FileManager class', () => {
  let fileManager: FileManager

  beforeEach(() => {
    vi.clearAllMocks()
    fileManager = new FileManager()
  })

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(fileManager.cwd).toBe(process.cwd())
      expect(fileManager.addSubfolders).toBe(false)
      expect(fileManager.pkgManager).toBeTruthy()
    })

    it('should detect package manager from user agent', () => {
      const originalUserAgent = process.env.npm_config_user_agent
      process.env.npm_config_user_agent = 'pnpm/7.14.0 npm/? node/v18.12.0'

      const fm = new FileManager()
      expect(fm.pkgManager).toBe('pnpm')

      if (originalUserAgent !== undefined) {
        process.env.npm_config_user_agent = originalUserAgent
      } else {
        delete process.env.npm_config_user_agent
      }
    })
  })

  describe('getFilePath', () => {
    it('should throw error if not initialized', () => {
      expect(() => fileManager.getFilePath('test.txt')).toThrow('FileManager not initialized')
    })

    it('should return correct path when initialized without subfolders', () => {
      fileManager.root = '/test/project'
      fileManager.addSubfolders = false

      const result = fileManager.getFilePath('file.txt')
      expect(result).toBe(path.join('/test/project', 'file.txt'))
    })

    it('should return correct path when initialized with subfolders', () => {
      fileManager.root = '/test/project'
      fileManager.addSubfolders = true

      const result = fileManager.getFilePath('file.txt')
      expect(result).toBe(path.join('/test/project', 'frontend', 'file.txt'))
    })
  })

  describe('write', () => {
    beforeEach(() => {
      vi.mocked(fs.writeFileSync).mockReset()
    })

    it('should throw error if not initialized', () => {
      expect(() => fileManager.write('test.txt', 'content')).toThrow('FileManager not initialized')
    })

    it('should write file with content', () => {
      fileManager.root = '/test/project'

      fileManager.write('test.txt', 'Hello World')

      expect(fs.writeFileSync).toHaveBeenCalledWith(path.join('/test/project', 'test.txt'), 'Hello World')
    })
  })

  describe('read', () => {
    beforeEach(() => {
      vi.mocked(fs.readFileSync).mockReset()
    })

    it('should throw error if not initialized', () => {
      expect(() => fileManager.read('test.txt')).toThrow('FileManager not initialized')
    })

    it('should read file content', () => {
      fileManager.root = '/test/project'
      vi.mocked(fs.readFileSync).mockReturnValue('File content')

      const result = fileManager.read('test.txt')

      expect(fs.readFileSync).toHaveBeenCalledWith(path.join('/test/project', 'test.txt'), 'utf-8')
      expect(result).toBe('File content')
    })
  })

  describe('addEnv', () => {
    beforeEach(() => {
      vi.mocked(fs.readFileSync).mockReset()
      vi.mocked(fs.writeFileSync).mockReset()
    })

    it('should throw error if not initialized', () => {
      expect(() => fileManager.addEnv({})).toThrow('FileManager not initialized')
    })

    it('should create .env from .env.example with provided values', () => {
      fileManager.root = '/test/project'

      // The .env.example has prefixed keys (e.g., NEXT_PUBLIC_)
      const envExample = `# Comment
NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY=
VITE_SHIELD_PUBLISHABLE_KEY=
NEXT_PUBLIC_CREATE_ENCRYPTED_SESSION_ENDPOINT=
NEXT_PUBLIC_OPENFORT_THEME=`

      vi.mocked(fs.readFileSync).mockReturnValue(envExample)

      // The env object has the suffix part (after first underscore)
      fileManager.addEnv({
        PUBLIC_OPENFORT_PUBLISHABLE_KEY: 'pk_test_123',
        SHIELD_PUBLISHABLE_KEY: 'shield_123',
        PUBLIC_CREATE_ENCRYPTED_SESSION_ENDPOINT: 'http://localhost:3110/api',
        PUBLIC_OPENFORT_THEME: 'midnight',
      })

      const expectedContent = `# Comment
NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY=pk_test_123
VITE_SHIELD_PUBLISHABLE_KEY=shield_123
NEXT_PUBLIC_CREATE_ENCRYPTED_SESSION_ENDPOINT=http://localhost:3110/api
NEXT_PUBLIC_OPENFORT_THEME=midnight`

      expect(fs.writeFileSync).toHaveBeenCalledWith(path.join('/test/project', '.env'), expectedContent, 'utf-8')
    })

    it('should preserve comments and empty lines', () => {
      fileManager.root = '/test/project'

      const envExample = `# This is a comment
# Another comment

OPENFORT_PUBLISHABLE_KEY=
# Inline comment
SHIELD_PUBLISHABLE_KEY=`

      vi.mocked(fs.readFileSync).mockReturnValue(envExample)

      fileManager.addEnv({
        OPENFORT_PUBLISHABLE_KEY: 'pk_test_123',
      })

      expect(fs.writeFileSync).toHaveBeenCalled()
      const writtenContent = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string
      expect(writtenContent).toContain('# This is a comment')
      expect(writtenContent).toContain('# Another comment')
    })

    it('should leave unmatched keys unchanged', () => {
      fileManager.root = '/test/project'

      const envExample = `NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY=
OTHER_KEY=default_value`

      vi.mocked(fs.readFileSync).mockReturnValue(envExample)

      // Only provide value for one key
      fileManager.addEnv({
        PUBLIC_OPENFORT_PUBLISHABLE_KEY: 'pk_test_123',
      })

      const writtenContent = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string
      expect(writtenContent).toContain('NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY=pk_test_123')
      expect(writtenContent).toContain('OTHER_KEY=default_value')
    })

    it('should handle undefined values', () => {
      fileManager.root = '/test/project'

      const envExample = `NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY=
VITE_SHIELD_PUBLISHABLE_KEY=`

      vi.mocked(fs.readFileSync).mockReturnValue(envExample)

      fileManager.addEnv({
        PUBLIC_OPENFORT_PUBLISHABLE_KEY: 'pk_test_123',
        SHIELD_PUBLISHABLE_KEY: undefined,
      })

      const writtenContent = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string
      expect(writtenContent).toContain('NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY=pk_test_123')
      expect(writtenContent).toContain('VITE_SHIELD_PUBLISHABLE_KEY=')
    })
  })

  describe('isInitialized', () => {
    it('should return false when not initialized', () => {
      expect(fileManager.isInitialized()).toBe(false)
    })

    it('should return true when initialized', () => {
      fileManager.root = '/test/project'
      expect(fileManager.isInitialized()).toBe(true)
    })
  })

  describe('outro', () => {
    beforeEach(() => {
      vi.mocked(prompts.outro).mockReset()
    })

    it('should generate correct outro message for npm', () => {
      fileManager.root = '/test/my-project'
      fileManager.cwd = '/test'
      fileManager.pkgManager = 'npm'
      fileManager.addSubfolders = false

      fileManager.outro()

      expect(prompts.outro).toHaveBeenCalledWith(expect.stringContaining('npm install'))
      expect(prompts.outro).toHaveBeenCalledWith(expect.stringContaining('npm run dev'))
    })

    it('should include cd command when root !== cwd', () => {
      fileManager.root = '/test/my-project'
      fileManager.cwd = '/test'
      fileManager.pkgManager = 'npm'

      fileManager.outro()

      expect(prompts.outro).toHaveBeenCalledWith(expect.stringContaining('cd my-project'))
    })

    it('should include subfolder instructions when addSubfolders is true', () => {
      fileManager.root = '/test/my-project'
      fileManager.cwd = '/test'
      fileManager.pkgManager = 'npm'
      fileManager.addSubfolders = true

      fileManager.outro()

      expect(prompts.outro).toHaveBeenCalledWith(expect.stringContaining('cd backend'))
      expect(prompts.outro).toHaveBeenCalledWith(expect.stringContaining('cd frontend'))
    })
  })
})
