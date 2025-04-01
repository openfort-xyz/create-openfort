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

  protected getFolderDir(folder: string) {
    return path.resolve(
      fileURLToPath(import.meta.url),
      '../../../../',
      folder,
      `template-${this.template}`,
    )
  }

  protected copyFolder(folder: string, ignoreFiles?: string[]) {
    const srcDir = this.getFolderDir(folder)

    if (!fs.existsSync(srcDir)) {
      throw new Error(`Template '${this.template}' of '${folder}' not found`);
    }

    if (this.verbose) {
      prompts.log.info(`Copying ${folder} from ${srcDir} to ${this.fileManager.root}`);
    }

    const files = fs.readdirSync(srcDir)
    for (const file of files) {

      const targetPath = this.fileManager.getFilePath(file)
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
    prompts.log.info(`------------Adding to package.json`)
    this.fileManager.write('package.json', JSON.stringify(pkg, null, 2) + '\n')
  }

  protected copyPackageJson() {
    const rawDir = this.getFolderDir("raw-templates")
    const templateDir = this.getFolderDir(`updated-files/openfortkit`)

    const rawPkg = JSON.parse(
      fs.readFileSync(path.join(rawDir, `package.json`), 'utf-8'),
    )
    const templatePkg = JSON.parse(
      fs.readFileSync(path.join(templateDir, `package.json`), 'utf-8'),
    )

    if (this.verbose)
      prompts.log.info(`Copying package.json`)

    const pkg = deepMerge(rawPkg, templatePkg)

    pkg.name = this.fileManager.packageName || 'openfort-app'

    this.fileManager.write('package.json', JSON.stringify(pkg, null, 2) + '\n')
  }

  protected copyRaw() {
    this.copyFolder('raw-templates')
  }

  copyTemplate() {
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
    this.copyPackageJson()

    this.copyFolder('updated-files/common')
    this.copyFolder(`updated-files/openfortkit`, ['package.json'])
  }

  addEnv(env: Record<string, string | undefined>) {
    this.fileManager.write('.env.local', env ? Object.entries(env).map(([key, value]) => value ? `${key}=${value}` : `${key}=`).join('\n') : '' + '\n')
    this.fileManager.write('.env.example', env ? Object.keys(env).map(key => `${key}=`).join('\n') : '' + '\n')
  }

  getEnvName(variable?: string, options?: any) {
    return variable || '';
  }
}