import { prompts } from "./prompts";

export const cancel = () => prompts.cancel('Operation cancelled')

export async function setup() {
  await prompts.text({ message: 'What is your name?' });
  console.log('Hello, world!');
}

export interface PkgInfo {
  name: string
  version: string
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
