import fs from 'node:fs';
import path from 'node:path';
import { prompts } from './prompts';
import { cancel } from "./utils";

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

export function copyDir(srcDir: string, destDir: string) {
  fs.mkdirSync(destDir, { recursive: true })
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file)
    const destFile = path.resolve(destDir, file)
    copy(srcFile, destFile)
  }
}

export function copy(src: string, dest: string) {
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    copyDir(src, dest)
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
  root?: string;
  cwd: string = process.cwd();
  targetDir?: string;
  packageName?: string;
  // templateDir?: string;

  constructor() {

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
          cancel()
          return
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

    this.root = path.join(this.cwd, this.targetDir)
    fs.mkdirSync(this.root, { recursive: true })
  }


}