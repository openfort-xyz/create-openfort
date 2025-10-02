import { Theme } from '@openfort/react'
import mri from 'mri'
import { cancel, FileManager, formatTargetDir, prompts, promptTemplate } from './cli'

// RecoveryMethod and AuthProvider come from @openfort/openfort-kit 
// but if we import them we include the whole package, increasing the bundle size from ~120kb to almost 700kb

const argv = mri<{
  template?: string
  overwrite?: boolean
  help?: boolean
  verbose?: boolean
  validate?: boolean
  default?: boolean
  theme?: Theme
  dashboard?: string | boolean
}>(process.argv.slice(2), {
  alias: {
    h: 'help',
    t: 'template',
    o: 'overwrite',
    v: 'verbose',
    d: 'default',
  },
  boolean: [
    'help',
    'overwrite',
    'verbose',
    'validate',
  ],
  string: [
    'dashboard',
    'template',
  ],
  default: {
    template: undefined,
    overwrite: false,
    verbose: false,
    validate: true,
    default: false,
    dashboard: false,
  },
})

// prettier-ignore
const helpMessage = `\
Usage: create-openfort [OPTION]... [DIRECTORY]

Create a new Openfortkit project in TypeScript.
With no arguments, start the CLI in interactive mode.

Options:
  -h, --help            Show this help message and exit
  -o, --overwrite       Overwrite existing files
  -v, --verbose         Enable verbose mode
  -d, --default         Use default values for all inputs
  -t, --template        Template to use

  --no-validate     Disable input validation
`

const defaultTargetDir = 'openfortkit-project'
const defaultApiEndpoint = 'http://localhost:3110/api/protected-create-encryption-session'

const defaultDashboardUrl = "https://dashboard.openfort.io";

async function init() {
  const argTargetDir = argv._[0]
    ? formatTargetDir(String(argv._[0]))
    : undefined
  const argTemplate = argv.template
  const argOverwrite = argv.overwrite
  const verbose = argv.verbose
  const validate = !!argv.validate
  const defaultValues = argv.default
  const dashboard = !!argv.dashboard ? argv.dashboard !== true ? String(argv.dashboard) : defaultDashboardUrl : false

  const help = argv.help
  if (help) {
    console.log(helpMessage)
    return
  }

  console.log(`\n`)

  prompts.intro("Let's create a new Openfortkit project!")

  if (verbose) {
    prompts.log.success("Verbose mode enabled")
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
    prompts.log.warn("No validation will be performed on the input values.\nPlease make sure to provide valid values." + argTemplate)

  const fileManager = await new FileManager({ verbose }).init({
    argTargetDir,
    argOverwrite,
    defaultTargetDir,
  })
  if (!fileManager || !fileManager.root) return;

  if (argTemplate && verbose) {
    prompts.log.info(`Using template from argument: ${argTemplate}`)
  }

  const template = await promptTemplate({
    argTemplate: argTemplate,
  })
  if (!template) return; // When cancelled

  let createBackend: boolean | undefined = false
  let apiEndpoint: string = defaultApiEndpoint

  const createEmbeddedSigner = true;

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

      let valid = createBackend;
      let attempts = 0
      while (!valid) {
        const apiEndpointResult = await prompts.text({
          message: attempts === 0 ?
            'Please provide your API endpoint to create an encryption session:'
            : 'Please provide a valid API endpoint to create an encryption session:',
          placeholder: 'http://localhost:3110/api/protected-create-encryption-session',
          validate: (value) => {
            if (!validate) return;
            if (!value) {
              return 'API endpoint is required'
            }
          }
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
          }).catch((error) => {
            prompts.log.error('Invalid API endpoint. Ensure you have a backend running and the endpoint is correct.')
          })

        if (!validate) {
          valid = true
        }

        attempts++;
      }
    }
  }

  // Select theme
  let theme: Theme | undefined;

  if (template === "openfort-ui") {
    const themeResult = await prompts.select<Theme | symbol>({
      message: 'Select a theme:',
      options: [
        {
          value: 'auto',
          label: 'Default',
          hint: 'Auto'
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
    });
    if (prompts.isCancel(themeResult)) throw cancel();
    theme = themeResult as Theme;
  }


  prompts.log.success(`Good! You are all set.\nPlease provide the following keys to continue.\nGet your keys from ${dashboard || defaultDashboardUrl}/developers/api-keys`)

  // const templateTransformer = TemplateTransformer.getTransformer(template, fileManager, verbose)


  const uuidV4Pattern = "[\\da-f]{8}-[\\da-f]{4}-[\\da-f]{4}-[\\da-f]{4}-[\\da-f]{12}";
  const keyPattern = `(test|live)_${uuidV4Pattern}`;
  const skRegex = new RegExp(`^sk_${keyPattern}$`);
  const pkRegex = new RegExp(`^pk_${keyPattern}$`);
  const uuidV4Regex = new RegExp(`^${uuidV4Pattern}$`);

  // Input Keys
  const requestOpenfortPublic = async () => {
    const publishableKey = await prompts.text({
      message: 'Openfort Publishable Key:',
      placeholder: 'pk...',
      validate: (value) => {
        if (!validate) return;
        if (!value) {
          return 'Openfort Publishable Key is required'
        } else if (!pkRegex.test(value)) {
          return 'Openfort Publishable Key is invalid'
        }
      }
    })
    if (prompts.isCancel(publishableKey)) throw cancel()
    return publishableKey
  }

  const requestOpenfortSecret = async () => {
    const openfortSecretResult = await prompts.text({
      message: 'Openfort Secret:',
      placeholder: 'sk_...',
      validate: (value) => {
        if (!validate) return;
        if (!value) {
          return 'Openfort Secret Key is required'
        } else if (!skRegex.test(value)) {
          return 'Openfort Secret Key is invalid'
        }
      }
    })
    if (prompts.isCancel(openfortSecretResult)) throw cancel()
    return openfortSecretResult
  }

  const requestShieldPublishable = async () => {
    const result = await prompts.text({
      message: 'Shield Publishable Key:',
      placeholder: 'Your Shield Publishable Key',
      validate: (value) => {
        if (!validate) return;
        if (!value) {
          return 'Shield Publishable Key is required'
        } else if (!uuidV4Regex.test(value)) {
          return 'Shield Publishable Key is invalid'
        }
      }
    })
    if (prompts.isCancel(result)) throw cancel()
    return result
  }

  const requestShieldSecret = async () => {
    const shieldSecretResult = await prompts.text({
      message: 'Shield Secret:',
      placeholder: 'Your Shield Secret',
      validate: (value) => {
        if (!validate) return;
        if (!value) {
          return 'Shield Secret Key is required'
        } else if (!uuidV4Regex.test(value)) {
          return 'Shield Secret Key is invalid'
        }
      }
    })
    if (prompts.isCancel(shieldSecretResult)) throw cancel()
    return shieldSecretResult
  }

  const requestShieldEncryptionShare = async () => {
    const shieldEncryptionShareResult = await prompts.text({
      message: 'Shield Encryption Share:',
      placeholder: 'Your Shield Encryption Share',
      validate: (value) => {
        if (!validate) return;
        if (!value) {
          return 'Shield Encryption Share is required'
        } else if (value.length !== 44) {
          return 'Shield Encryption Share is invalid'
        }
      }
    })
    if (prompts.isCancel(shieldEncryptionShareResult)) throw cancel()
    return shieldEncryptionShareResult
  }


  // let config: OpenfortWalletConfig | null = null

  // if (createEmbeddedSigner) {
  //   if (createb) {
  //     await requestShieldEncryptionShare()
  //     await requestShieldPublishable()

  //     if (!shieldPublishableKey || !shieldEncryptionShare) {
  //       throw cancel("Missing Shield Publishable Key or Shield Encryption Share")
  //     }

  //     env.SHIELD_PUBLISHABLE_KEY = shieldPublishableKey
  //     env.SHIELD_ENCRYPTION_SHARE = shieldEncryptionShare

  //   } else if (recoveryMethod === RecoveryMethod.AUTOMATIC) {
  //     if (createBackend) {
  //       await requestOpenfortSecret()
  //       await requestShieldEncryptionShare()
  //       await requestShieldPublishable()
  //       await requestShieldSecret()
  //     } else {
  //       await requestShieldPublishable()
  //     }

  //     if (!shieldPublishableKey) {
  //       throw cancel("Missing Shield Publishable Key")
  //     }

  //     env.SHIELD_PUBLISHABLE_KEY = shieldPublishableKey
  //     env.API_ENDPOINT = apiEndpoint

  //     config = {
  //       createEmbeddedSigner: true,
  //       embeddedSignerConfiguration: {
  //         shieldPublishableKey: "_ENV_.SHIELD_PUBLISHABLE_KEY",
  //         recoveryMethod: recoveryMethod,
  //         createEncryptedSessionEndpoint: "_ENV_.API_ENDPOINT",
  //       }
  //     }
  //   } else {
  //     cancel("Invalid recovery method")
  //   }
  // } else {
  //   config = {
  //     linkWalletOnSignUp: true,
  //   }
  // }



  const openfortPublic = await requestOpenfortPublic()

  const shieldPublishableKey = await requestShieldPublishable()

  let openfortSecret = undefined
  let shieldSecret = undefined
  let shieldEncryptionShare = undefined

  if (createBackend) {
    openfortSecret = await requestOpenfortSecret()
    shieldEncryptionShare = await requestShieldEncryptionShare()
    shieldSecret = await requestShieldSecret()
  }

  if (verbose)
    prompts.log.info(`Using template: ${template}`)

  prompts.log.step(`Scaffolding project in ${fileManager.root}...`)

  if (createBackend) {
    if (!openfortSecret || !shieldSecret || !shieldPublishableKey || !shieldEncryptionShare) {
      throw cancel("Missing Openfort Secret, Shield Secret, Shield Publishable Key or Shield Encryption Share")
    }

    await fileManager.createBackend({
      openfortSecretKey: openfortSecret,
      shieldSecretKey: shieldSecret,
      shieldApiKey: shieldPublishableKey,
      shieldEncryptionShare: shieldEncryptionShare,
      port: 3110,
    })
  }

  await fileManager.gitPick("openfort-xyz/openfort-react/tree/main/examples/quickstarts/" + template)

  const env: Record<string, string | undefined> = {
    SHIELD_PUBLISHABLE_KEY: shieldPublishableKey,
    OPENFORT_PUBLISHABLE_KEY: openfortPublic,
    CREATE_ENCRYPTED_SESSION_ENDPOINT: createEmbeddedSigner ? apiEndpoint : undefined,
  }

  if (theme) {
    env.OPENFORT_THEME = theme
  }

  // templateTransformer.copyTemplate("openfortkit");

  // let configString = JSON.stringify(config, null, 2)

  // const match = /"_ENV_\.(.*)"/
  // let envVar = configString.match(match)

  // while (envVar) {
  //   if (verbose)
  //     prompts.log.info(`Replacing ${envVar[0]} with ${templateTransformer.getEnvName(envVar[1])}`)

  //   configString = configString.replace(match, templateTransformer.getEnvName(envVar[1]))
  //   envVar = configString.match(match)
  // }

  // configString = configString.replace('"recoveryMethod": "automatic"', "recoveryMethod: RecoveryMethod.AUTOMATIC")
  // configString = configString.replace('"recoveryMethod": "password"', "recoveryMethod: RecoveryMethod.PASSWORD")

  // const providerToString = {
  //   [AuthProvider.EMAIL]: 'AuthProvider.EMAIL',
  //   [AuthProvider.GUEST]: 'AuthProvider.GUEST',
  //   [AuthProvider.WALLET]: 'AuthProvider.WALLET',
  //   [AuthProvider.FACEBOOK]: 'AuthProvider.FACEBOOK',
  //   [AuthProvider.GOOGLE]: 'AuthProvider.GOOGLE',
  //   [AuthProvider.TWITTER]: 'AuthProvider.TWITTER',
  // }

  // const providersString = "[\n  " +
  //   providers.map((provider) => {
  //     return providerToString[provider]
  //   }).join(',\n  ')
  //   + "\n]"


  // fileManager.editFile(
  //   filesSrc[template].providers,
  //   (content) => {
  //     return content
  //       .replace(/WALLET_CONFIG/g, configString,)
  //       .replace(/WALLET_CONNECT_PROJECT_ID/g, templateTransformer.getEnvName('WALLET_CONNECT_PROJECT_ID'))
  //       .replace(/OPENFORT_PUBLISHABLE_KEY/g, templateTransformer.getEnvName('OPENFORT_PUBLISHABLE_KEY'))
  //       .replace(/AUTH_PROVIDERS/g, providersString)
  //       .replace(/VAR_THEME/g, theme)
  //       .replace(/"([^"]+)": /g, '$1: ')
  //   },
  // )

  // env.WALLET_CONNECT_PROJECT_ID = walletConnectProjectId




  // TODO: Add telemetry (posthog) --no-telemetry

  // TODO: Git init and commit first commit

  fileManager.addEnv(env)
  // templateTransformer.addEnv(env)

  fileManager.outro();
}

init().catch(() => { })
