import { ViteTemplateTransformer } from "./ViteTemplateTransformer";
import { copy, FileManager, prompts } from "@openfort/openfort-cli";
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deepMerge } from "./utils";

export type Template = "vite" | "nextjs" | "cra"

export class BaseTemplateTransformer {
  fileManager: FileManager;
  template: Template;
  verbose: boolean;

  constructor(template: Template, fileManager: FileManager, verbose = false) {
    if (!fileManager.root) {
      throw new Error('FileManager not initialized')
    }

    this.verbose = verbose;
    this.template = template;
    this.fileManager = fileManager;
    return this;
  }


  protected getFolderDir(folder: string, addTemplate = true) {
    return path.resolve(
      fileURLToPath(import.meta.url),
      '../../../../',
      folder,
      addTemplate ? `template-${this.template}` : '',
    )
  }

  protected copyDir(srcDir: string, ignoreFiles?: string[]) {

    if (!fs.existsSync(srcDir)) {
      if (this.verbose)
        prompts.log.error(`Template '${this.template}' of '${srcDir}' not found`);
      return
    }

    if (this.verbose) {
      prompts.log.info(`Copying ${srcDir}`);
    }

    const files = fs.readdirSync(srcDir)
    for (const file of files) {

      const targetPath = this.fileManager.getFilePath(
        file.startsWith('_')
          ? file.slice(1)
          : file
      )
      copy(path.join(srcDir, file), targetPath, ignoreFiles?.map(f => path.join(srcDir, f)))
    }

    return { srcDir }
  }

  addToPackageJson(
    {
      devDependencies = {},
      dependencies = {},
      scripts = {},
    }: {
      devDependencies?: Record<string, string>,
      dependencies?: Record<string, string>,
      scripts?: Record<string, string>,
    } = {}) {
    const pkg = JSON.parse(
      this.fileManager.read('package.json'),
    ) as Record<string, any>

    if (!pkg) {
      throw new Error('package.json not found')
    }

    pkg.devDependencies = {
      ...pkg.devDependencies,
      ...devDependencies,
    }

    pkg.dependencies = {
      ...pkg.dependencies,
      ...dependencies,
    }

    pkg.scripts = {
      ...pkg.scripts,
      ...scripts,
    }
    if (this.verbose)
      prompts.log.info(`Adding to package.json`)

    this.fileManager.write('package.json', JSON.stringify(pkg, null, 2) + '\n')
  }

  protected mergePackageJson(sdkFolder: string) {
    if (this.verbose)
      prompts.log.info(`Copying package.json`)

    const rawDir = this.getFolderDir("raw-templates")
    const rawSrcDir = path.join(rawDir, `package.json`)
    const rawPkg = fs.existsSync(rawSrcDir) ? JSON.parse(
      fs.readFileSync(rawSrcDir, 'utf-8'),
    ) : {}

    const templateDir = this.getFolderDir(`updated-files/${sdkFolder}`)
    const templateSrcDir = path.join(templateDir, `package.json`)
    const templatePkg = fs.existsSync(templateSrcDir) ? JSON.parse(
      fs.readFileSync(templateSrcDir, 'utf-8'),
    ) : {}

    const commonDir = this.getFolderDir(`updated-files/${sdkFolder}/common`, false)
    const commonSrcDir = path.join(commonDir, `package.json`)
    const commonPkg = fs.existsSync(commonSrcDir) ? JSON.parse(
      fs.readFileSync(commonSrcDir, 'utf-8'),
    ) : {}

    const pkg = deepMerge(rawPkg, deepMerge(templatePkg, commonPkg))

    pkg.name = this.fileManager.packageName || 'openfort-app'

    this.fileManager.write('package.json', JSON.stringify(pkg, null, 2) + '\n')
  }

  protected copyRaw() {
    this.copyDir(this.getFolderDir('raw-templates'))
  }

  copyTemplate(sdkFolder: string) {
    if (!this.fileManager.root) {
      throw new Error('FileManager not initialized')
    }

    if (this.fileManager.hasBackend) {
      if (this.verbose) {
        prompts.log.info(`Creating frontend folder ${this.fileManager.root}/frontend`);
      }
      fs.mkdirSync(path.join(this.fileManager.root, "frontend"));
    }

    this.copyRaw()
    this.mergePackageJson(sdkFolder)
    // const srcDir = this.getFolderDir(folder)

    this.copyDir(this.getFolderDir('updated-files/common'))
    this.copyDir(this.getFolderDir(`updated-files/${sdkFolder}`), ['package.json'])
    this.copyDir(this.getFolderDir(`updated-files/${sdkFolder}/common`, false), ['package.json'])
  }

  addEnv(env: Record<string, string | undefined>) {
    this.fileManager.write('.env.local', env ? Object.entries(env).map(([key, value]) => value ? `${key}=${value}` : `${key}=`).join('\n') : '' + '\n')
    this.fileManager.write('.env.example', env ? Object.keys(env).map(key => `${key}=`).join('\n') : '' + '\n')
  }

  getEnvName(variable?: string, options?: any) {
    return variable || '';
  }
}