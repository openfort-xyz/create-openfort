
import { cyan, green, yellow } from './colors';
import { prompts } from './prompts';
import { cancel } from './utils';

type ColorFunc = (str: string | number) => string
type Template = {
  name: 'openfort-ui' | 'headless' | 'firebase'
  display: string
  hint?: string
  color: ColorFunc
}

export const TEMPLATES: Template[] = [
  {
    name: 'openfort-ui',
    display: 'Openfort UI',
    hint: "default",
    color: cyan,
  },
  {
    name: 'headless',
    display: 'Headless UI',
    hint: "custom, unstyled",
    color: green,
  },
  {
    name: 'firebase',
    display: 'Third party auth',
    hint: "with Firebase",
    color: yellow,
  },
]

export const DEFAULT_AVAILABLE_TEMPLATES = TEMPLATES.map(f => f.name)

export async function promptTemplate({
  argTemplate,
  availableTemplates = DEFAULT_AVAILABLE_TEMPLATES,
}: {
  argTemplate?: string
  availableTemplates?: string[]
}) {
  let template = argTemplate
  let hasInvalidArgTemplate = false
  if (argTemplate && (!TEMPLATES.some(f => f.name === argTemplate) || !availableTemplates.includes(argTemplate))) {
    template = undefined
    hasInvalidArgTemplate = true
  }
  if (!template) {
    const selectedTemplate = await prompts.select({
      message: hasInvalidArgTemplate
        ? `"${argTemplate}" isn't a valid template. Please choose from below: `
        : 'Select a template:',
      options: TEMPLATES.map((template) => {
        return {
          label: template.color(template.display || template.name),
          value: template,
          hint: template.hint,
        }
      }),
    })
    if (prompts.isCancel(selectedTemplate)) return cancel()

    template = selectedTemplate.name
  }

  return template as Template['name']
}