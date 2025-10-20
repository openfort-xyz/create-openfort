import { blue, cyan, dim, green, red, reset, yellow } from './colors'
import { createCloneError, createSpawnError, TemplateTimeoutError } from './errors'
import {
  copy,
  emptyDir,
  type FileManager,
  fileManager,
  formatTargetDir,
  isEmpty,
  isValidPackageName,
  toValidPackageName,
} from './FileManager'
import { prompts } from './prompts'
import { promptTemplate } from './template'
import { cancel, type PkgInfo, pkgFromUserAgent } from './utils'

export {
  blue,
  cancel,
  copy,
  createCloneError,
  createSpawnError,
  cyan,
  dim,
  emptyDir,
  fileManager,
  formatTargetDir,
  green,
  isEmpty,
  isValidPackageName,
  pkgFromUserAgent,
  promptTemplate,
  prompts,
  red,
  reset,
  TemplateTimeoutError,
  toValidPackageName,
  yellow,
}
export type { FileManager, PkgInfo }
