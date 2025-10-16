import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { formatTargetDir } from '../cli/FileManager'
import { getFullCustomCommand, pkgFromUserAgent } from '../cli/utils'

describe('Utils', () => {
  describe('formatTargetDir', () => {
    it('should remove trailing slashes', () => {
      expect(formatTargetDir('my-project/')).toBe('my-project')
      expect(formatTargetDir('my-project///')).toBe('my-project')
      expect(formatTargetDir('/path/to/project/')).toBe('/path/to/project')
    })

    it('should trim whitespace', () => {
      expect(formatTargetDir('  my-project  ')).toBe('my-project')
      expect(formatTargetDir(' my-project / ')).toBe('my-project ') // Trims outer spaces and trailing slash
    })

    it('should handle empty and single character strings', () => {
      expect(formatTargetDir('')).toBe('')
      expect(formatTargetDir('.')).toBe('.')
      expect(formatTargetDir('./')).toBe('.')
    })

    it('should preserve internal structure', () => {
      expect(formatTargetDir('path/to/my-project')).toBe('path/to/my-project')
      expect(formatTargetDir('./nested/folder')).toBe('./nested/folder')
    })
  })

  describe('pkgFromUserAgent', () => {
    const originalUserAgent = process.env.npm_config_user_agent

    beforeEach(() => {
      delete process.env.npm_config_user_agent
    })

    afterEach(() => {
      if (originalUserAgent !== undefined) {
        process.env.npm_config_user_agent = originalUserAgent
      } else {
        delete process.env.npm_config_user_agent
      }
    })

    it('should return undefined when no user agent is set', () => {
      expect(pkgFromUserAgent()).toBeUndefined()
    })

    it('should parse npm user agent', () => {
      process.env.npm_config_user_agent = 'npm/8.19.2 node/v18.12.0 darwin x64'
      expect(pkgFromUserAgent()).toEqual({
        name: 'npm',
        version: '8.19.2',
      })
    })

    it('should parse yarn user agent', () => {
      process.env.npm_config_user_agent = 'yarn/1.22.19 npm/? node/v18.12.0 darwin x64'
      expect(pkgFromUserAgent()).toEqual({
        name: 'yarn',
        version: '1.22.19',
      })
    })

    it('should parse pnpm user agent', () => {
      process.env.npm_config_user_agent = 'pnpm/7.14.0 npm/? node/v18.12.0 darwin x64'
      expect(pkgFromUserAgent()).toEqual({
        name: 'pnpm',
        version: '7.14.0',
      })
    })

    it('should parse bun user agent', () => {
      process.env.npm_config_user_agent = 'bun/1.0.0 npm/? node/v18.12.0 darwin x64'
      expect(pkgFromUserAgent()).toEqual({
        name: 'bun',
        version: '1.0.0',
      })
    })
  })

  describe('getFullCustomCommand', () => {
    it('should handle npm create command', () => {
      const result = getFullCustomCommand('npm create -- my-package', {
        name: 'npm',
        version: '8.19.2',
      })
      expect(result).toBe('npm create -- my-package')
    })

    it('should convert npm create to yarn create', () => {
      const result = getFullCustomCommand('npm create -- my-package', {
        name: 'yarn',
        version: '3.0.0',
      })
      expect(result).toBe('yarn create -- my-package')
    })

    it('should convert npm create to pnpm create without --', () => {
      const result = getFullCustomCommand('npm create -- my-package', {
        name: 'pnpm',
        version: '7.14.0',
      })
      expect(result).toBe('pnpm create my-package')
    })

    it('should convert npm create to bun x', () => {
      const result = getFullCustomCommand('npm create -- my-package', {
        name: 'bun',
        version: '1.0.0',
      })
      expect(result).toBe('bun x create-my-package')
    })

    it('should handle npm exec command with pnpm', () => {
      const result = getFullCustomCommand('npm exec my-package', {
        name: 'pnpm',
        version: '7.14.0',
      })
      expect(result).toBe('pnpm dlx my-package')
    })

    it('should handle npm exec command with yarn', () => {
      const result = getFullCustomCommand('npm exec my-package', {
        name: 'yarn',
        version: '3.0.0',
      })
      expect(result).toBe('yarn dlx my-package')
    })

    it('should handle npm exec command with bun', () => {
      const result = getFullCustomCommand('npm exec my-package', {
        name: 'bun',
        version: '1.0.0',
      })
      expect(result).toBe('bun x my-package')
    })

    it('should remove @latest for yarn 1.x', () => {
      const result = getFullCustomCommand('npm create my-package@latest', {
        name: 'yarn',
        version: '1.22.19',
      })
      expect(result).toBe('yarn create my-package')
    })

    it('should keep @latest for yarn 2+', () => {
      const result = getFullCustomCommand('npm create my-package@latest', {
        name: 'yarn',
        version: '3.0.0',
      })
      expect(result).toBe('yarn create my-package@latest')
    })

    it('should handle command without pkgInfo', () => {
      const result = getFullCustomCommand('npm create my-package')
      expect(result).toBe('npm create my-package')
    })
  })
})
