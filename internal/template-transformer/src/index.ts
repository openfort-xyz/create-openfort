import { copy, FileManager } from "@openfort/openfort-cli";
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type Template = "vite" | "nextjs" | "cra"

export interface TemplateOptions {
  env?: Record<string, string>
}

export const copyTemplate = async (
  template: string,
  fileManager: FileManager,
  options: TemplateOptions = {}
) => {
  const templateDir = path.resolve(
    fileURLToPath(import.meta.url),
    '../../../../raw-templates',
    `template-${template}`,
  )

  if (!fs.existsSync(templateDir)) {
    throw new Error(`Template '${template}' not found`);
  }

  function write(file: string, content?: string, renameFiles: Record<string, string> = {}) {
    if (!fileManager.root ) {
      throw new Error('FileManager not initialized')
    }
    if (!templateDir) {
      throw new Error('Template directory not set')
    }

    const targetPath = path.join(fileManager.root, renameFiles[file] ?? file)
    if (content) {
      fs.writeFileSync(targetPath, content)
    } else {
      copy(path.join(templateDir, file), targetPath)
    }
  }

  const files = fs.readdirSync(templateDir)
  for (const file of files.filter((f) => f !== 'package.json')) {
    write(file)
  }

  const pkg = JSON.parse(
    fs.readFileSync(path.join(templateDir, `package.json`), 'utf-8'),
  )

  write('package.json', JSON.stringify(pkg, null, 2) + '\n')
}