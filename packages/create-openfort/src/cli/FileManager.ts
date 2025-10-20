import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { createCloneError, createSpawnError, TemplateTimeoutError } from './errors'
import { prompts } from './prompts'
import { telemetry } from './telemetry'
import { cancel, isValidPackageName, type PkgInfo, pkgFromUserAgent, toValidPackageName } from './utils'
import { isVerbose } from './verboseLevel'

export { isValidPackageName, toValidPackageName }

export function isEmpty(path: string) {
  const files = fs.readdirSync(path)
  return files.length === 0 || (files.length === 1 && files[0] === '.git')
}

export function emptyDir(dir: string) {
  if (!fs.existsSync(dir)) {
    return
  }
  for (const file of fs.readdirSync(dir)) {
    if (file === '.git') {
      continue
    }
    fs.rmSync(path.resolve(dir, file), { recursive: true, force: true })
  }
}

export async function cloneRepo(
  repo: string,
  targetDir: string,
  { verbose, timeout = 60000 }: { verbose?: boolean; timeout?: number } = {}
) {
  return await new Promise<void>((resolve, reject) => {
    if (verbose) {
      prompts.log.info(`Running: npx degit ${repo} ${targetDir}`)
    }

    const child = spawn('npx', ['degit', repo, targetDir], {
      shell: true,
    })

    let stderr = ''
    let hasResolved = false

    const handleResolve = (timeoutId: NodeJS.Timeout) => {
      if (hasResolved) return false
      hasResolved = true
      clearTimeout(timeoutId)
      return true
    }

    // Set timeout to prevent hanging forever
    const timeoutId = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true
        child.kill()
        reject(new TemplateTimeoutError(timeout / 1000))
      }
    }, timeout)

    child.stdout.on('data', (data) => {
      if (verbose) {
        process.stdout.write(`\r[CLONE_REPO stdout]: ${data}`)
      }
    })

    child.stderr.on('data', (data) => {
      stderr += data.toString()
      if (verbose) {
        process.stdout.write(`\r[CLONE_REPO stderr]: ${data}`)
      }
    })

    child.on('close', (code) => {
      if (!handleResolve(timeoutId)) return

      if (code === 0) {
        resolve()
      } else {
        reject(createCloneError(code ?? 1, stderr))
      }
    })

    child.on('error', (err) => {
      if (!handleResolve(timeoutId)) return
      reject(createSpawnError(err))
    })
  })
}

export function copyDir(srcDir: string, destDir: string, ignoreFiles: string[] = []) {
  fs.mkdirSync(destDir, { recursive: true })
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file)
    const destFile = path.resolve(destDir, file)

    copy(srcFile, destFile, ignoreFiles)
  }
}

function copy(src: string, dest: string, ignoreFiles: string[] = []) {
  if (ignoreFiles.some((ignore) => ignore === src)) {
    return
  }
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    copyDir(src, dest, ignoreFiles)
  } else {
    fs.copyFileSync(src, dest)
  }
}

export function editFile(file: string, callback: (content: string) => string) {
  const content = fs.readFileSync(file, 'utf-8')
  fs.writeFileSync(file, callback(content), 'utf-8')
}

export function formatTargetDir(targetDir: string) {
  return targetDir.trim().replace(/\/+$/g, '')
}

export class FileManager {
  root?: string
  cwd: string = process.cwd()
  targetDir?: string
  packageName?: string
  addSubfolders: boolean = false
  pkgInfo?: PkgInfo
  pkgManager: string = 'npm'

  constructor() {
    this.pkgInfo = pkgFromUserAgent()
    this.pkgManager = this.pkgInfo?.name ?? 'npm'

    if (isVerbose) prompts.log.info(`Using ${this.pkgInfo?.name ?? 'npm'} ${this.pkgInfo?.version ?? ''}`)
  }

  async init({
    argTargetDir,
    argOverwrite,
    defaultTargetDir,
  }: {
    argTargetDir?: string
    argOverwrite?: boolean
    defaultTargetDir: string
  }) {
    // 1. Get project name and target dir
    if (argTargetDir) {
      this.targetDir = argTargetDir
      prompts.log.success(`Project name: ${this.targetDir}`)
    } else {
      const projectName = await prompts.text({
        message: 'Project name:',
        defaultValue: defaultTargetDir,
        placeholder: defaultTargetDir,
      })
      if (prompts.isCancel(projectName)) return cancel()
      this.targetDir = formatTargetDir(projectName as string)
    }

    // 2. Handle directory if exist and not empty
    if (fs.existsSync(this.targetDir) && !isEmpty(this.targetDir)) {
      const overwrite = argOverwrite
        ? 'yes'
        : await prompts.select({
            message:
              (this.targetDir === '.' ? 'Current directory' : `Target directory "${this.targetDir}"`) +
              ` is not empty. Please choose how to proceed:`,
            options: [
              {
                label: 'Cancel operation',
                value: 'no',
              },
              {
                label: 'Remove existing files and continue',
                value: 'yes',
              },
              {
                label: 'Ignore files and continue',
                value: 'ignore',
              },
            ],
          })
      if (prompts.isCancel(overwrite)) return cancel()
      switch (overwrite) {
        case 'yes':
          emptyDir(this.targetDir)
          break
        case 'no':
          return cancel()
      }
    }

    // 3. Get package name
    let packageName = path.basename(path.resolve(this.targetDir))
    if (!isValidPackageName(packageName)) {
      const packageNameResult = await prompts.text({
        message: 'Package name:',
        defaultValue: toValidPackageName(packageName),
        placeholder: toValidPackageName(packageName),
        validate(dir) {
          if (dir && !isValidPackageName(dir)) {
            return 'Invalid package.json name'
          }
        },
      })
      if (prompts.isCancel(packageNameResult)) return cancel()

      if (!packageNameResult) packageName = toValidPackageName(packageName)
      else packageName = packageNameResult
    }
    this.packageName = packageName

    this.root = path.join(this.cwd, this.targetDir)
    fs.mkdirSync(this.root, { recursive: true })

    return this
  }

  isInitialized() {
    return !!this.root
  }

  getFilePath(file: string) {
    if (!this.root) {
      throw new Error('FileManager not initialized')
    }
    const targetPath = path.join(this.root, this.addSubfolders ? 'frontend' : '', file)
    return targetPath
  }

  write(file: string, content: string) {
    if (!this.root) {
      throw new Error('FileManager not initialized')
    }
    const targetPath = this.getFilePath(file)

    if (content !== undefined) {
      fs.writeFileSync(targetPath, content)
    }
  }

  read(file: string) {
    if (!this.root) {
      throw new Error('FileManager not initialized')
    }
    const targetPath = this.getFilePath(file)

    return fs.readFileSync(targetPath, 'utf-8').toString()
  }

  async gitPick(repo: string, repoPath: string) {
    if (!this.root) {
      throw new Error('FileManager not initialized')
    }
    const tmpDir = path.join(this.root, 'tmp')

    const spinner = prompts.spinner()
    spinner.start('Downloading template...')
    try {
      if (isVerbose) {
        prompts.log.info(`Cloning repo ${repo} path ${repoPath}`)
      }

      const targetDir = this.addSubfolders ? path.join(this.root, 'frontend') : this.root

      await cloneRepo(repo, tmpDir, { verbose: isVerbose })

      if (isVerbose) {
        prompts.log.info(`Repo cloned. Copying path "${repoPath}" to ${targetDir}`)
      }

      // Move only the specified subfolder to the targetDir
      copyDir(path.join(tmpDir, repoPath), targetDir)

      // Remove the temporary directory
      fs.rmSync(tmpDir, { recursive: true, force: true })

      if (isVerbose) {
        prompts.log.info(`Cloned repo ${repo}`)
      }

      spinner.stop('Template download completed successfully! 🚀')
    } catch (error) {
      // Cleanup
      const errorMessage = error instanceof Error ? error.message : String(error)

      telemetry.send({
        properties: {
          error: errorMessage,
          repo,
          repoPath,
        },
        status: 'error',
      })

      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }

      // Provide user-friendly error message
      spinner.stop(`Failed to download template.\n${errorMessage}`)

      // Re-throw the error to stop execution
      throw error
    }
  }

  async createBackend({
    openfortSecretKey,
    shieldSecretKey,
    shieldApiKey,
    shieldEncryptionShare,
    port,
  }: {
    openfortSecretKey: string
    shieldSecretKey: string
    shieldApiKey: string
    shieldEncryptionShare: string
    port: number
  }) {
    if (!this.root) {
      throw new Error('FileManager not initialized')
    }

    this.addSubfolders = true

    const spinner = prompts.spinner()
    spinner.start('Creating backend...')
    try {
      if (isVerbose) {
        prompts.log.info(`Creating backend folder from openfort-xyz/openfort-backend-quickstart`)
      }
      await cloneRepo(
        'openfort-xyz/openfort-backend-quickstart',
        this.addSubfolders ? path.join(this.root, 'backend') : this.root,
        { verbose: isVerbose }
      )

      if (isVerbose) {
        prompts.log.info(`Cloned backend folder`)
        prompts.log.info(`Copying .env.example to .env`)
      }

      // Copy the .env file
      const envPath = path.join(this.root, 'backend', '.env.example')
      const targetPath = path.join(this.root, 'backend', '.env')

      if (isVerbose) {
        prompts.log.info(`Reading .env.example from ${envPath}`)
      }

      // Read line by line and replace the variables
      const envContent = fs.readFileSync(envPath, 'utf-8').toString()
      const updatedEnvContent = envContent
        .replace(/OPENFORT_SECRET_KEY=/g, `OPENFORT_SECRET_KEY=${openfortSecretKey}`)
        .replace(/SHIELD_SECRET_KEY=/g, `SHIELD_SECRET_KEY=${shieldSecretKey}`)
        .replace(/SHIELD_API_KEY=/g, `SHIELD_API_KEY=${shieldApiKey}`)
        .replace(/SHIELD_ENCRYPTION_SHARE=/g, `SHIELD_ENCRYPTION_SHARE=${shieldEncryptionShare}`)
        .replace(/PORT=/g, `PORT=${port}`)

      if (isVerbose) {
        prompts.log.info(`Writing .env to ${targetPath}`)
      }

      fs.writeFileSync(targetPath, updatedEnvContent)

      spinner.stop('Backend creation completed successfully! 🚀')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      spinner.stop(`Failed to create backend.\n${errorMessage}`)
      telemetry.send({
        properties: {
          error: errorMessage,
        },
        status: 'error',
      })

      // Re-throw the error to stop execution
      throw error
    }
  }

  editFile(file: string, callback: (content: string) => string) {
    if (!this.root) {
      throw new Error('FileManager not initialized')
    }
    const targetPath = this.getFilePath(file)
    editFile(targetPath, callback)
  }

  addEnv(env: Record<string, string | undefined>) {
    if (!this.root) {
      throw new Error('FileManager not initialized')
    }

    if (isVerbose) {
      prompts.log.info(`Filling .env with provided environment variables: \n${JSON.stringify(env, null, 2)}`)
    }

    const envPath = this.getFilePath('.env.example')
    const targetPath = this.getFilePath('.env')

    if (isVerbose) {
      prompts.log.info(`Reading .env.example from ${envPath}`)
      prompts.log.info(`Writing .env to ${targetPath}`)
    }

    // read .env.example
    const example = fs.readFileSync(envPath, 'utf-8')

    // split into lines
    const lines = example.split('\n')

    const filledLines = lines.map((line) => {
      if (!line.trim() || line.trim().startsWith('#')) {
        return line // keep comments & empty lines
      }

      const [key] = line.split('=')
      if (!key) return line

      // take everything after the last "_"
      const suffix = key.includes('_') ? key.split('_').slice(1).join('_') : key

      // const value = Object.entries(env).find(([envKey]) => {
      //   // exact match or suffix match
      //   return envKey === key
      // })?.[1];

      const value = env[suffix]

      if (value !== undefined) {
        return `${key}=${value}`
      }

      return line // keep unchanged if no match
    })

    fs.writeFileSync(targetPath, filledLines.join('\n'), 'utf-8')
  }

  outro() {
    let doneMessage = ''
    const cdProjectName = path.relative(this.cwd, this.root!)
    doneMessage += `Done.\n\nNow run:`
    if (this.root !== this.cwd) {
      doneMessage += `\n  cd ${cdProjectName.includes(' ') ? `"${cdProjectName}"` : cdProjectName}`
    }

    const addRunToMessage = () => {
      doneMessage += `\n  ${this.pkgManager} install`
      doneMessage += `\n  ${this.pkgManager} run dev`
    }

    if (this.addSubfolders) {
      doneMessage += '\n\nFor the backend project, run in one terminal.'
      doneMessage += '\n  cd backend'
      addRunToMessage()
      doneMessage += '\n\nThen run the frontend project in another terminal.'
      doneMessage += '\n  cd frontend'
    }

    addRunToMessage()
    prompts.outro(doneMessage)
  }
}

export const fileManager = new FileManager()
