import { describe, it, expect, afterEach } from 'vitest'
import mri from 'mri'

describe('CLI Arguments Parsing', () => {
  const originalArgv = process.argv

  afterEach(() => {
    process.argv = originalArgv
  })

  describe('mri argument parsing', () => {
    it('should parse template argument', () => {
      const args = ['--template', 'openfort-ui']
      const argv = mri(args, {
        alias: { t: 'template' },
        string: ['template'],
      })
      
      expect(argv.template).toBe('openfort-ui')
    })

    it('should parse template with short alias', () => {
      const args = ['-t', 'headless']
      const argv = mri(args, {
        alias: { t: 'template' },
        string: ['template'],
      })
      
      expect(argv.template).toBe('headless')
    })

    it('should parse overwrite flag', () => {
      const args = ['--overwrite']
      const argv = mri(args, {
        alias: { o: 'overwrite' },
        boolean: ['overwrite'],
        default: { overwrite: false },
      })
      
      expect(argv.overwrite).toBe(true)
    })

    it('should parse help flag', () => {
      const args = ['--help']
      const argv = mri(args, {
        alias: { h: 'help' },
        boolean: ['help'],
        default: { help: false },
      })
      
      expect(argv.help).toBe(true)
    })

    it('should parse help with short alias', () => {
      const args = ['-h']
      const argv = mri(args, {
        alias: { h: 'help' },
        boolean: ['help'],
      })
      
      expect(argv.h).toBe(true)
    })

    it('should parse version flag', () => {
      const args = ['--version']
      const argv = mri(args, {
        alias: { v: 'version' },
        boolean: ['version'],
      })
      
      expect(argv.version).toBe(true)
    })

    it('should parse verbose flag', () => {
      const args = ['--verbose']
      const argv = mri(args, {
        alias: { V: 'verbose' },
        boolean: ['verbose'],
      })
      
      expect(argv.verbose).toBe(true)
    })

    it('should parse verbose-debug flag', () => {
      const args = ['--verbose-debug']
      const argv = mri(args, {
        boolean: ['verbose-debug'],
        default: { 'verbose-debug': false },
      })
      
      expect(argv['verbose-debug']).toBe(true)
    })

    it('should parse default flag', () => {
      const args = ['--default']
      const argv = mri(args, {
        alias: { d: 'default' },
        boolean: ['default'],
      })
      
      expect(argv.default).toBe(true)
    })

    it('should parse dashboard url', () => {
      const args = ['--dashboard', 'https://custom-dashboard.com']
      const argv = mri(args, {
        string: ['dashboard'],
      })
      
      expect(argv.dashboard).toBe('https://custom-dashboard.com')
    })

    it('should parse dashboard as boolean flag', () => {
      const args = ['--dashboard']
      const argv = mri(args, {
        string: ['dashboard'],
        default: { dashboard: false },
      })
      
      // When --dashboard is provided without value and marked as string, mri sets it to empty string
      expect(argv.dashboard).toBe('')
    })

    it('should parse no-validate flag', () => {
      const args = ['--no-validate']
      const argv = mri(args, {
        boolean: ['validate'],
        default: { validate: true },
      })
      
      expect(argv.validate).toBe(false)
    })

    it('should parse no-telemetry flag', () => {
      const args = ['--no-telemetry']
      const argv = mri(args, {
        boolean: ['telemetry'],
        default: { telemetry: true },
      })
      
      expect(argv.telemetry).toBe(false)
    })

    it('should parse positional argument as target directory', () => {
      const args = ['my-project']
      const argv = mri(args)
      
      expect(argv._).toEqual(['my-project'])
    })

    it('should parse multiple arguments together', () => {
      const args = ['my-project', '--template', 'openfort-ui', '--overwrite', '--verbose']
      const argv = mri(args, {
        alias: { t: 'template', o: 'overwrite', V: 'verbose' },
        boolean: ['overwrite', 'verbose'],
        string: ['template'],
      })
      
      expect(argv._).toEqual(['my-project'])
      expect(argv.template).toBe('openfort-ui')
      expect(argv.overwrite).toBe(true)
      expect(argv.verbose).toBe(true)
    })

    it('should handle equals syntax for options', () => {
      const args = ['--template=firebase', '--dashboard=https://custom.com']
      const argv = mri(args, {
        string: ['template', 'dashboard'],
      })
      
      expect(argv.template).toBe('firebase')
      expect(argv.dashboard).toBe('https://custom.com')
    })

    it('should use default values when not provided', () => {
      const args: string[] = []
      const argv = mri(args, {
        boolean: ['overwrite', 'verbose', 'validate'],
        default: {
          overwrite: false,
          verbose: false,
          validate: true,
        },
      })
      
      expect(argv.overwrite).toBe(false)
      expect(argv.verbose).toBe(false)
      expect(argv.validate).toBe(true)
    })

    it('should handle directory paths with spaces (quoted)', () => {
      const args = ['my project folder', '--template', 'openfort-ui']
      const argv = mri(args, {
        string: ['template'],
      })
      
      expect(argv._).toEqual(['my project folder'])
      expect(argv.template).toBe('openfort-ui')
    })

    it('should handle relative paths', () => {
      const args = ['./my-project', '--template', 'headless']
      const argv = mri(args, {
        string: ['template'],
      })
      
      expect(argv._).toEqual(['./my-project'])
      expect(argv.template).toBe('headless')
    })

    it('should handle absolute paths', () => {
      const args = ['/home/user/my-project', '--template', 'firebase']
      const argv = mri(args, {
        string: ['template'],
      })
      
      expect(argv._).toEqual(['/home/user/my-project'])
      expect(argv.template).toBe('firebase')
    })
  })
})

