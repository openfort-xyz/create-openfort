import mri from 'mri'

export function getArgs() {
  return process.argv.slice(2)
}
export type ArgOptions = mri.Options

type Default = Record<string, any>

export function parseArgs<T = Default>(args: string[] = getArgs(), options?: ArgOptions) {
  return mri<T>(args, options)
}
