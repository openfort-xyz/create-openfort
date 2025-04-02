import fs from 'node:fs';
import path from 'node:path';
import { prompts } from './prompts';
import { cancel, getFullCustomCommand, pkgFromUserAgent, PkgInfo } from "./utils";
import { spawn } from 'node:child_process';

function isValidPackageName(projectName: string) {
  return /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(
    projectName,
  )
}

function toValidPackageName(projectName: string) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z\d\-~]+/g, '-')
}

function isEmpty(path: string) {
  const files = fs.readdirSync(path)
  return files.length === 0 || (files.length === 1 && files[0] === '.git')
}

function emptyDir(dir: string) {
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

export function copyDir(srcDir: string, destDir: string, ignoreFiles: string[] = []) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file);
    const destFile = path.resolve(destDir, file);

    copy(srcFile, destFile, ignoreFiles);
  }
}

export function copy(src: string, dest: string, ignoreFiles: string[] = []) {
  if (ignoreFiles.some(ignore => ignore === src)) {
    return;
  }
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    copyDir(src, dest, ignoreFiles);
  } else {
    fs.copyFileSync(src, dest);
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
  root?: string;
  cwd: string = process.cwd();
  targetDir?: string;
  packageName?: string;
  hasBackend: boolean = false;
  verbose: boolean;
  pkgInfo?: PkgInfo
  pkgManager: string = 'npm'

  constructor({ verbose }: { verbose?: boolean } = {}) {

    this.pkgInfo = pkgFromUserAgent()
    this.pkgManager = this.pkgInfo?.name ?? 'npm'
    this.verbose = !!verbose

    if (verbose)
      prompts.log.info(`Using ${this.pkgInfo?.name ?? 'npm'} ${this.pkgInfo?.version ?? ''}`)

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
            (this.targetDir === '.'
              ? 'Current directory'
              : `Target directory "${this.targetDir}"`) +
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

      if (!packageNameResult)
        packageName = toValidPackageName(packageName)
      else
        packageName = packageNameResult
    }
    this.packageName = packageName

    this.root = path.join(this.cwd, this.targetDir)
    fs.mkdirSync(this.root, { recursive: true })

    return this;
  }

  isInitialized() {
    return !!this.root
  }

  getFilePath(file: string) {
    if (!this.root) {
      throw new Error('FileManager not initialized')
    }
    const targetPath = path.join(this.root, this.hasBackend ? "frontend" : "", file)
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

    return fs.readFileSync(targetPath, 'utf-8').toString();
  }

  async createBackend({
    openfortSecretKey,
    shieldSecretKey,
    shieldApiKey,
    shieldEncryptionShare,
    port
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

    this.hasBackend = true;

    const spinner = prompts.spinner()
    spinner.start('Creating backend...')
    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn('npx', ['degit', 'openfort-xyz/auth-sample-backend', 'backend'], {
          cwd: this.root,
          shell: true,
        });

        child.on('close', (code) => {
          if (code === 0) {
            resolve(); // Process completed successfully
          } else {
            reject(new Error(`Process exited with code ${code}`));
          }
        });

        child.on('error', (err) => {
          reject(err); // Handle errors
        });
      });

      // Copy the .env file
      const envPath = path.join(this.root, "backend", ".env.example");
      const targetPath = path.join(this.root, "backend", ".env");

      // Read line by line and replace the variables
      const envContent = fs.readFileSync(envPath, 'utf-8').toString();
      const updatedEnvContent = envContent
        .replace(/OPENFORT_SECRET_KEY=/g, `OPENFORT_SECRET_KEY=${openfortSecretKey}`)
        .replace(/SHIELD_SECRET_KEY=/g, `SHIELD_SECRET_KEY=${shieldSecretKey}`)
        .replace(/SHIELD_API_KEY=/g, `SHIELD_API_KEY=${shieldApiKey}`)
        .replace(/SHIELD_ENCRYPTION_SHARE=/g, `SHIELD_ENCRYPTION_SHARE=${shieldEncryptionShare}`)
        .replace(/PORT=/g, `PORT=${port}`)

      fs.writeFileSync(targetPath, updatedEnvContent);

      spinner.stop('Backend creation completed successfully! 🚀');
    } catch (error) {
      spinner.stop('Failed to create backend: ' + JSON.stringify(error));
    }
  }

  editFile(file: string, callback: (content: string) => string) {
    if (!this.root) {
      throw new Error('FileManager not initialized')
    }
    const targetPath = this.getFilePath(file)
    editFile(targetPath, callback)
  }

  outro() {
    let doneMessage = ''
    const cdProjectName = path.relative(this.cwd, this.root!)
    doneMessage += `Done.\nNow run:`
    if (this.root !== this.cwd) {
      doneMessage += `\n  cd ${cdProjectName.includes(' ') ? `"${cdProjectName}"` : cdProjectName}`
    }

    const addRunToMessage = () => {
      switch (this.pkgManager) {
        case 'yarn':
          doneMessage += '\n  yarn'
          doneMessage += '\n  yarn dev'
          break
        default:
          doneMessage += `\n  ${this.pkgManager} install`
          doneMessage += `\n  ${this.pkgManager} run dev`
          break
      }
    }

    if (this.hasBackend) {
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