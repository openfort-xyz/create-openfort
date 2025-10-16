import { blue, cyan, dim, green, lightRed, red, reset, yellow } from './colors'
import {
  CloneError,
  createCloneError,
  createSpawnError,
  SpawnError,
  TemplateTimeoutError,
  UnsupportedFrameworkError,
} from './errors'
import {
  emptyDir,
  type FileManager,
  fileManager,
  formatTargetDir,
  isEmpty,
  isValidPackageName,
  pkgFromUserAgent,
  toValidPackageName,
} from './FileManager'
import { prompts } from './prompts'
import {
  canReadWriteDir,
  downloadAndExtractGitRepo,
  loadEnvExamples,
  parseTemplate,
  promptTemplate,
  replaceInFile,
} from './template'
import { cancel, copy, type PkgInfo } from './utils'

export {
  blue,
  cancel,
  canReadWriteDir,
  CloneError,
  copy,
  createCloneError,
  createSpawnError,
  cyan,
  dim,
  downloadAndExtractGitRepo,
  emptyDir,
  fileManager,
  formatTargetDir,
  green,
  isEmpty,
  isValidPackageName,
  lightRed,
  loadEnvExamples,
  parseTemplate,
  pkgFromUserAgent,
  promptTemplate,
  prompts,
  red,
  replaceInFile,
  reset,
  SpawnError,
  TemplateTimeoutError,
  toValidPackageName,
  UnsupportedFrameworkError,
  yellow,
}
export type { FileManager, PkgInfo }
