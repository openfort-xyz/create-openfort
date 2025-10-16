import { prompts } from './prompts'

export const cancel = (text: string = 'Operation cancelled') => prompts.cancel(text)

export async function setup() {
  await prompts.text({ message: 'What is your name?' })
  console.log('Hello, world!')
}

export interface PkgInfo {
  name: string
  version: string
}

export const MAX_PACKAGE_NAME_LENGTH = 214
const PACKAGE_SEGMENT_PATTERN = /^[a-z\d~-][a-z\d._~-]*$/

function isValidPackageSegment(segment: string) {
  return PACKAGE_SEGMENT_PATTERN.test(segment) && !segment.endsWith('.')
}

export function isValidPackageName(projectName: string) {
  if (!projectName) return false
  if (projectName.length > MAX_PACKAGE_NAME_LENGTH) return false
  if (projectName.includes('*')) return false
  if (projectName.endsWith('.')) return false

  if (projectName.startsWith('@')) {
    const [scope, name, ...rest] = projectName.slice(1).split('/')
    if (!scope || !name || rest.length > 0) return false
    if (!isValidPackageSegment(scope) || !isValidPackageSegment(name)) {
      return false
    }
    return true
  }

  return isValidPackageSegment(projectName)
}

export function toValidPackageName(projectName: string) {
  const sanitized = projectName.trim().toLowerCase().replace(/\s+/g, '-').replace(/^[._]/, '').replace(/\.+$/g, '')

  return sanitized.replace(/[^a-z\d\-~]+/g, '-').slice(0, MAX_PACKAGE_NAME_LENGTH)
}

export function pkgFromUserAgent(): PkgInfo | undefined {
  const userAgent = process.env.npm_config_user_agent
  if (!userAgent) return undefined
  const pkgSpec = userAgent.split(' ')[0]
  const pkgSpecArr = pkgSpec.split('/')
  return {
    name: pkgSpecArr[0],
    version: pkgSpecArr[1],
  }
}

export function getFullCustomCommand(customCommand: string, pkgInfo?: PkgInfo) {
  const pkgManager = pkgInfo ? pkgInfo.name : 'npm'
  const isYarn1 = pkgManager === 'yarn' && pkgInfo?.version.startsWith('1.')

  return (
    customCommand
      .replace(/^npm create (?:-- )?/, () => {
        // `bun create` uses it's own set of templates,
        // the closest alternative is using `bun x` directly on the package
        if (pkgManager === 'bun') {
          return 'bun x create-'
        }
        // pnpm doesn't support the -- syntax
        if (pkgManager === 'pnpm') {
          return 'pnpm create '
        }
        // For other package managers, preserve the original format
        return customCommand.startsWith('npm create -- ') ? `${pkgManager} create -- ` : `${pkgManager} create `
      })
      // Only Yarn 1.x doesn't support `@version` in the `create` command
      .replace('@latest', () => (isYarn1 ? '' : '@latest'))
      .replace(/^npm exec/, () => {
        // Prefer `pnpm dlx`, `yarn dlx`, or `bun x`
        if (pkgManager === 'pnpm') {
          return 'pnpm dlx'
        }
        if (pkgManager === 'yarn' && !isYarn1) {
          return 'yarn dlx'
        }
        if (pkgManager === 'bun') {
          return 'bun x'
        }
        // Use `npm exec` in all other cases,
        // including Yarn 1.x and other custom npm clients.
        return 'npm exec'
      })
  )
}
