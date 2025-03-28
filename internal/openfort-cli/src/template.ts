
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
    display: 'Vite',
    color: cyan,
  },
  {
    name: 'nextjs',
    display: 'Next.js',
    color: green,
  },
  {
    name: 'cra',
    display: 'Create react app',
    color: yellow,
  },
]
export const DEFAULT_AVAILABLE_TEMPLATES = FRAMEWORKS.map(f => f.name)

export async function promptTemplate({
  argTemplate,
  availableTemplates = DEFAULT_AVAILABLE_TEMPLATES,
}: {
  argTemplate?: string
  availableTemplates?: string[]
}) {
  let template = argTemplate
  let hasInvalidArgTemplate = false
  if (argTemplate && (!FRAMEWORKS.some(f => f.name === argTemplate) || !availableTemplates.includes(argTemplate))) {
    template = undefined
    hasInvalidArgTemplate = true
  }
  if (!template) {
    const framework = await prompts.select({
      message: hasInvalidArgTemplate
        ? `"${argTemplate}" isn't a valid template. Please choose from below: `
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