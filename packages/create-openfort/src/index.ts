import type { Theme } from '@openfort/react'
import mri from 'mri'
import { cancel, fileManager, formatTargetDir, prompts, promptTemplate } from './cli'
import { telemetry } from './cli/telemetry'
import { isVerbose, setVerboseLevel } from './cli/verboseLevel'
import { CLI_VERSION } from './version'

// RecoveryMethod and AuthProvider come from @openfort/react
// but if we import them we include the whole package, increasing the bundle size from ~120kb to almost 700kb

const argv = mri<{
  template?: string
  overwrite?: boolean
  help?: boolean
  verbose?: boolean
  validate?: boolean
  default?: boolean
  theme?: Theme
  version?: boolean
  dashboard?: string | boolean
  'verbose-debug'?: boolean
  telemetry?: boolean
}>(process.argv.slice(2), {
  alias: {
    h: 'help',
    t: 'template',
    o: 'overwrite',
    d: 'default',
    V: 'verbose',
    v: 'version',
  },
  boolean: ['help', 'overwrite', 'verbose', 'validate', 'version', 'verbose-debug'],
  string: ['dashboard', 'template'],
  default: {
    template: undefined,
    overwrite: false,
    verbose: false,
    validate: true,
    default: false,
    dashboard: false,
    version: false,
    telemetry: true,
    'verbose-debug': false,
  },
})

// prettier-ignore
const helpMessage = `\
Usage: create-openfort [OPTION]... [DIRECTORY]

Create a new Openfort project in TypeScript.
With no arguments, start the CLI in interactive mode.

Options:
  -h, --help            Show this help message and exit
  -o, --overwrite       Overwrite existing files
  -d, --default         Use default values for all inputs
  -t, --template        Template to use
  -v, --version         Version number
  -V, --verbose        Enable verbose mode

  --no-validate        Disable input validation
  --no-telemetry       Disable sending anonymous usage data
`

const defaultTargetDir = 'openfort-project'
const defaultApiEndpoint = 'http://localhost:3110/api/protected-create-encryption-session'

const defaultDashboardUrl = 'https://dashboard.openfort.io'

async function init() {
  const argTargetDir = argv._[0] ? formatTargetDir(String(argv._[0])) : undefined
  const argTemplate = argv.template
  const argOverwrite = argv.overwrite
  const validate = !!argv.validate
  const defaultValues = argv.default
  const dashboard = argv.dashboard ? (argv.dashboard !== true ? String(argv.dashboard) : defaultDashboardUrl) : false

  setVerboseLevel(!!argv.verbose, !!argv['verbose-debug'])

  telemetry.enabled = argv.telemetry !== false

  // read version from package.json

  const version = argv.version
  if (version) {
    console.log(`create-openfort version: ${CLI_VERSION}`)
    return
  }

  telemetry.send({
    status: 'started',
  })

  console.log(`\n`)

  const help = argv.help
  if (help) {
    console.log(helpMessage)
    return
  }

  prompts.intro("Let's create a new Openfort project!")

  if (isVerbose) {
    prompts.log.success('Verbose mode enabled')
    prompts.log.info(`create-openfort version: ${CLI_VERSION}`)
    // prompts.log.info("Arguments:")
    // Object.entries(argv).forEach(([key, value]) => {
    //   prompts.log.info(`${key}: ${value}`)
    // })
    // console.log('\n')
  }

  if (dashboard) {
    prompts.log.info(`You can manage your Openfort project at ${dashboard}`)
  }

  if (!validate)
    prompts.log.warn('No validation will be performed on the input values.\nPlease make sure to provide valid values.')

  await fileManager.init({
    argTargetDir,
    argOverwrite,
    defaultTargetDir,
  })

  if (!fileManager || !fileManager.root) return

  if (argTemplate && isVerbose) {
    prompts.log.info(`Using template from argument: ${argTemplate}`)
  }

  const template = await promptTemplate({
    argTemplate: argTemplate,
  })
  if (!template) return // When cancelled

  let createBackend: boolean | undefined = false
  let apiEndpoint: string = defaultApiEndpoint

  const createEmbeddedSigner = true

  if (createEmbeddedSigner) {
    // Choose recovery method
    const withAutomaticRecovery = defaultValues
      ? true
      : await prompts.select({
          message: 'Do you want to create a backend for automatic account recovery?',
          options: [
            {
              value: true,
              label: 'Yes',
              hint: 'Better user experience',
            },
            {
              value: false,
              label: 'No',
              hint: 'Users will recover their account with a password or passkey',
            },
          ],
        })
    if (prompts.isCancel(withAutomaticRecovery)) throw cancel()

    if (withAutomaticRecovery) {
      const result = await prompts.select({
        message: 'Do you already have a backend to create an encryption session?',
        options: [
          {
            value: true,
            label: 'No',
            hint: 'We will create a sample backend for you',
          },
          {
            value: false,
            label: 'Yes',
            hint: 'You will need to provide an endpoint to create an encryption session',
          },
        ],
      })
      if (prompts.isCancel(result)) throw cancel()
      createBackend = result

      let valid = createBackend
      let attempts = 0
      while (!valid) {
        const apiEndpointResult = await prompts.text({
          message:
            attempts === 0
              ? 'Please provide your API endpoint to create an encryption session:'
              : 'Please provide a valid API endpoint to create an encryption session:',
          placeholder: 'http://localhost:3110/api/protected-create-encryption-session',
          validate: (value) => {
            if (!validate) return
            if (!value) {
              return 'API endpoint is required'
            }
          },
        })
        if (prompts.isCancel(apiEndpointResult)) throw cancel()
        apiEndpoint = apiEndpointResult

        await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
          .then((response) => response.json())
          .then((body) => {
            if (body.session) {
              valid = true
            } else {
              prompts.log.error(`Invalid API endpoint:

Response must be:
{
  "session": "<session>"
}

But got:
${JSON.stringify(body, null, 2)}
`)
            }
          })
          .catch((_error) => {
            prompts.log.error('Invalid API endpoint. Ensure you have a backend running and the endpoint is correct.')
          })

        if (!validate) {
          valid = true
        }

        attempts++
      }
    }
  }

  // Select theme
  let theme: Theme | undefined

  if (template === 'openfort-ui') {
    const themeResult = await prompts.select<Theme | symbol>({
      message: 'Select a theme:',
      options: [
        {
          value: 'auto',
          label: 'Default',
          hint: 'Auto',
        },
        {
          value: 'midnight',
          label: 'Midnight',
        },
        {
          value: 'minimal',
          label: 'Minimal',
        },
        {
          value: 'soft',
          label: 'Soft',
        },
        {
          value: 'web95',
          label: 'Web95',
        },
        {
          value: 'rounded',
          label: 'Rounded',
        },
        {
          value: 'retro',
          label: 'Retro',
        },
        {
          value: 'nouns',
          label: 'Nouns',
        },
      ],
    })
    if (prompts.isCancel(themeResult)) throw cancel()
    theme = themeResult as Theme
  }

  prompts.log.success(
    `Good! You are all set.\nPlease provide the following keys to continue.\nGet your keys from ${dashboard || defaultDashboardUrl}/developers/api-keys`
  )

  // const templateTransformer = TemplateTransformer.getTransformer(template, fileManager, verbose)

  const uuidV4Pattern = '[\\da-f]{8}-[\\da-f]{4}-[\\da-f]{4}-[\\da-f]{4}-[\\da-f]{12}'
  const keyPattern = `(test|live)_${uuidV4Pattern}`
  const skRegex = new RegExp(`^sk_${keyPattern}$`)
  const pkRegex = new RegExp(`^pk_${keyPattern}$`)
  const uuidV4Regex = new RegExp(`^${uuidV4Pattern}$`)
  const length44Regex = /^.{44}$/

  const validateInput = (value: string, pattern: RegExp, name: string) => {
    if (!validate) return
    if (value === '-') return
    if (!value) {
      return `${name} is required`
    } else if (!pattern.test(value)) {
      return `${name} is invalid`
    }
  }

  // Input Keys
  const requestOpenfortPublic = async () => {
    const publishableKey = await prompts.text({
      message: 'Openfort Publishable Key:',
      placeholder: 'pk...',
      validate: (value) => validateInput(value, pkRegex, 'Openfort Publishable Key'),
    })
    if (prompts.isCancel(publishableKey)) throw cancel()
    return publishableKey
  }

  const requestOpenfortSecret = async () => {
    const openfortSecretResult = await prompts.text({
      message: 'Openfort Secret:',
      placeholder: 'sk_...',
      validate: (value) => validateInput(value, skRegex, 'Openfort Secret Key'),
    })
    if (prompts.isCancel(openfortSecretResult)) throw cancel()
    return openfortSecretResult
  }

  const requestShieldPublishable = async () => {
    const result = await prompts.text({
      message: 'Shield Publishable Key:',
      placeholder: 'Your Shield Publishable Key',
      validate: (value) => validateInput(value, uuidV4Regex, 'Shield Publishable Key'),
    })
    if (prompts.isCancel(result)) throw cancel()
    return result
  }

  const requestShieldSecret = async () => {
    const shieldSecretResult = await prompts.text({
      message: 'Shield Secret:',
      placeholder: 'Your Shield Secret',
      validate: (value) => validateInput(value, uuidV4Regex, 'Shield Secret Key'),
    })
    if (prompts.isCancel(shieldSecretResult)) throw cancel()
    return shieldSecretResult
  }

  const requestShieldEncryptionShare = async () => {
    const shieldEncryptionShareResult = await prompts.text({
      message: 'Shield Encryption Share:',
      placeholder: 'Your Shield Encryption Share',
      validate: (value) => validateInput(value, length44Regex, 'Shield Encryption Share'),
    })
    if (prompts.isCancel(shieldEncryptionShareResult)) throw cancel()
    return shieldEncryptionShareResult
  }

  const openfortPublic = await requestOpenfortPublic()
  telemetry.projectId = openfortPublic

  let shieldPublishableKey: string | undefined
  let openfortSecret: string | undefined
  let shieldSecret: string | undefined
  let shieldEncryptionShare: string | undefined

  if (createBackend) {
    openfortSecret = await requestOpenfortSecret()

    shieldPublishableKey = await requestShieldPublishable()
    shieldEncryptionShare = await requestShieldEncryptionShare()
    shieldSecret = await requestShieldSecret()
  } else {
    // separate to ask shield and openfort keys together
    shieldPublishableKey = await requestShieldPublishable()
  }

  if (isVerbose) prompts.log.info(`Using template: ${template}`)

  prompts.log.step(`Scaffolding project in ${fileManager.root}...`)

  if (createBackend) {
    if (!openfortSecret || !shieldSecret || !shieldPublishableKey || !shieldEncryptionShare) {
      throw cancel('Missing Openfort Secret, Shield Secret, Shield Publishable Key or Shield Encryption Share')
    }

    await fileManager.createBackend({
      openfortSecretKey: openfortSecret,
      shieldSecretKey: shieldSecret,
      shieldApiKey: shieldPublishableKey,
      shieldEncryptionShare: shieldEncryptionShare,
      port: 3110,
    })
  }

  await fileManager.gitPick('openfort-xyz/openfort-react', `examples/quickstarts/${template}`)

  const env: Record<string, string | undefined> = {
    SHIELD_PUBLISHABLE_KEY: shieldPublishableKey,
    OPENFORT_PUBLISHABLE_KEY: openfortPublic,
    CREATE_ENCRYPTED_SESSION_ENDPOINT: createEmbeddedSigner ? apiEndpoint : undefined,
  }

  if (theme) {
    env.OPENFORT_THEME = theme
  }

  telemetry.send({
    status: 'completed',
  })

  // TODO: Git init and commit first commit

  fileManager.addEnv(env)
  // templateTransformer.addEnv(env)

  fileManager.outro()
}

init().catch(() => {})
