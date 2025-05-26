
import { fileURLToPath } from 'node:url';
import { cyan, green, yellow } from './colors';
import { prompts } from './prompts';
import { cancel } from './utils';

type ColorFunc = (str: string | number) => string
type Framework = {
  name: string
  display: string
  color: ColorFunc
}

export const FRAMEWORKS: Framework[] = [
  {
    name: 'vite',
    display: 'Vite (React)',
    color: cyan,
  },
  {
    name: 'nextjs',
    display: 'Next.js',
    color: green,
  },
  // {
  //   name: 'cra',
  //   display: 'Create react app',
  //   color: yellow,
  // },
]
export const DEFAULT_AVAILABLE_TEMPLATES = FRAMEWORKS.map(f => f.name)

export async function promptFramework({
  argFramework,
  availableTemplates = DEFAULT_AVAILABLE_TEMPLATES,
}: {
  argFramework?: string
  availableTemplates?: string[]
}) {
  let template = argFramework
  let hasInvalidargFramework = false
  if (argFramework && (!FRAMEWORKS.some(f => f.name === argFramework) || !availableTemplates.includes(argFramework))) {
    template = undefined
    hasInvalidargFramework = true
  }
  if (!template) {
    const framework = await prompts.select({
      message: hasInvalidargFramework
        ? `"${argFramework}" isn't a valid template. Please choose from below: `
        : 'Select a framework:',
      options: FRAMEWORKS.map((framework) => {
        const frameworkColor = framework.color
        return {
          label: frameworkColor(framework.display || framework.name),
          value: framework,
        }
      }),
    })
    if (prompts.isCancel(framework)) return cancel()

    template = framework.name
  }

  return template;
}