import { cancel, FileManager, formatTargetDir, prompts, promptTemplate } from '@openfort/openfort-cli'
import { type OpenfortWalletConfig, type Theme } from '@openfort/openfort-kit'
import { TemplateTransformer } from "@openfort/template-transformer"
import mri from 'mri'

// RecoveryMethod and AuthProvider come from @openfort/openfort-kit 
// but if we import them we include the whole package, increasing the bundle size from ~120kb to almost 700kb
enum RecoveryMethod {
  PASSWORD = "password",
  AUTOMATIC = "automatic"
}
enum AuthProvider {
  GOOGLE = "google",
  TWITTER = "twitter",
  FACEBOOK = "facebook",
  EMAIL = "email",
  WALLET = "wallet",
  GUEST = "guest"
}

const argv = mri<{
  template?: string
  overwrite?: boolean
  help?: boolean
  verbose?: boolean
  noValidate?: boolean
}>(process.argv.slice(2), {
  alias: {
    h: 'help',
    t: 'template',
  },
  boolean: [
    'help',
    'overwrite',
    'verbose',
    'noValidate',
  ],
  string: [
    'template',
  ],
})

// prettier-ignore
const helpMessage = `\
Usage: create-openfort [OPTION]... [DIRECTORY]

Create a new Openfortkit project in TypeScript.
With no arguments, start the CLI in interactive mode.
`
type FileSrc = {
  providers: string
}

const filesSrc: Record<string, FileSrc> = {
  vite: {
    providers: "src/providers.tsx"
  },
  nextjs: {
    providers: "src/app/providers.tsx"
  },
}

const defaultTargetDir = 'openfortkit-project'
const defaultApiEndpoint = 'http://localhost:3110/api/protected-create-encryption-session'

async function init() {
  const argTargetDir = argv._[0]
    ? formatTargetDir(String(argv._[0]))
    : undefined
  const argTemplate = argv.template
  const argOverwrite = argv.overwrite
  const verbose = argv.verbose
  const noValidate = argv.noValidate

  const help = argv.help
  if (help) {
    console.log(helpMessage)
    return
  }

  console.log(`\n\n`)

  prompts.intro("Let's create a new Openfortkit project!")

  if (noValidate)
    prompts.log.warn("No validation will be performed on the input values.\nPlease make sure to provide valid values.")

  const fileManager = await new FileManager().init({
    argTargetDir,
    argOverwrite,
    defaultTargetDir,
  })
  if (!fileManager || !fileManager.root) return;

  const template = await promptTemplate({
    argTemplate,
  })
  if (!template) return;

  if (!filesSrc[template]) {
    prompts.log.error(`Template ${template} not found. This is a bug, please report it to https://openfort.io.`)
    return cancel()
  }

  // Choose auth providers
  const providers = await prompts.multiselect({
    message: 'Select additional tools. (use arrow keys / space bar)',
    initialValues: [AuthProvider.EMAIL, AuthProvider.GUEST],
    options: [
      {
        value: AuthProvider.GUEST,
        label: 'Guest',
      },
      {
        value: AuthProvider.EMAIL,
        label: 'Email',
      },
      {
        value: AuthProvider.WALLET,
        label: 'Wallet',
      },
      {
        value: AuthProvider.FACEBOOK,
        label: 'Facebook',
      },
      {
        value: AuthProvider.GOOGLE,
        label: 'Google',
      },
      {
        value: AuthProvider.TWITTER,
        label: 'Twitter',
      },
    ],
    required: false,
  });
  if (prompts.isCancel(providers)) return cancel()

  // Wallet Connect Project ID for Wallet provider
  let walletConnectProjectId: string | undefined
  if (providers.includes(AuthProvider.WALLET)) {
    prompts.log.info("Wallet Connect is required for the Wallet provider.\nGet your Wallet Connect Project ID from https://cloud.reown.com/.")
    const result = await prompts.text({
      message: 'Wallet Connect Project ID:',
      placeholder: 'Your Wallet Connect Project ID',
    })
    if (prompts.isCancel(result)) return cancel()
    walletConnectProjectId = result
  }

  // Choose if want to create a signer for the users
  const createEmbeddedSigner = await prompts.select({
    message: 'Do you want to create an embedded signer for your users?',
    options: [
      {
        value: true,
        label: 'Yes',
        hint: 'Recommended'
      },
      {
        value: false,
        label: 'No',
      },
    ]
  })
  if (prompts.isCancel(createEmbeddedSigner)) return cancel()

  let createBackend: boolean | undefined = false
  let recoveryMethod: RecoveryMethod | undefined
  let apiEndpoint: string = defaultApiEndpoint

  if (createEmbeddedSigner) {
    // Choose recovery method
    const result = await prompts.select({
      message: 'Select a recovery method.',
      options: [
        {
          value: RecoveryMethod.AUTOMATIC,
          label: 'Automatic',
          hint: 'Requires a backend to create an encryption session',
        },
        {
          value: RecoveryMethod.PASSWORD,
          label: 'Password',
        },
      ],
    })
    if (prompts.isCancel(result)) return cancel()
    recoveryMethod = result

    if (recoveryMethod === RecoveryMethod.AUTOMATIC) {
      const result = await prompts.select({
        message: 'Do you have a backend to create an encryption session?',
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
      if (prompts.isCancel(result)) return cancel()
      createBackend = result
    }

    let valid = createBackend;
    let attempts = 0
    while (!valid) {
      const apiEndpointResult = await prompts.text({
        message: attempts === 0 ?
          'Please provide your API endpoint to create an encryption session:'
          : 'Please provide a valid API endpoint to create an encryption session:',
        placeholder: 'http://localhost:3110/api/protected-create-encryption-session',
        validate: (value) => {
          if (noValidate) return;
          if (!value) {
            return 'API endpoint is required'
          }
        }
      })
      if (prompts.isCancel(apiEndpointResult)) return cancel()
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
          prompts.log.error('Invalid API endpoint')
        })

      attempts++;
    }
  }

  // Select theme
  const theme = await prompts.select<Theme>({
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
  })
  if (prompts.isCancel(theme)) return cancel()

  prompts.log.success('Good! You are all set.\nPlease provide the following keys to continue.\nGet your keys from https://dashboard.openfort.xyz/developers/api-keys')


  const templateTransformer = TemplateTransformer.getTransformer(template, fileManager, verbose)

  const env: Record<string, string | undefined> = {}

  const uuidV4Pattern = "[\\da-f]{8}-[\\da-f]{4}-[\\da-f]{4}-[\\da-f]{4}-[\\da-f]{12}";
  const keyPattern = `(test|live)_${uuidV4Pattern}`;
  const skRegex = new RegExp(`^sk_${keyPattern}$`);
  const pkRegex = new RegExp(`^pk_${keyPattern}$`);
  const uuidV4Regex = new RegExp(`^${uuidV4Pattern}$`);

  // Input Keys
  const publishableKey = await prompts.text({
    message: 'Openfort Publishable Key:',
    placeholder: 'pk...',
    validate: (value) => {
      if (noValidate) return;
      if (!value) {
        return 'Openfort Publishable Key is required'
      } else if (!pkRegex.test(value)) {
        return 'Openfort Publishable Key is invalid'
      }
    }
  })
  if (prompts.isCancel(publishableKey)) return cancel()
  env.OPENFORT_PUBLISHABLE_KEY = publishableKey;

  const requestOpenfortSecret = async () => {
    const openfortSecretResult = await prompts.text({
      message: 'Openfort Secret:',
      placeholder: 'sk_...',
      validate: (value) => {
        if (noValidate) return;
        if (!value) {
          return 'Openfort Secret Key is required'
        } else if (!skRegex.test(value)) {
          return 'Openfort Secret Key is invalid'
        }
      }
    })
    if (prompts.isCancel(openfortSecretResult)) return cancel()
    openfortSecret = openfortSecretResult
  }

  let shieldPublishableKey: string | undefined

  const requestShieldPublishable = async () => {
    const result = await prompts.text({
      message: 'Shield Publishable Key:',
      placeholder: 'Your Shield Publishable Key',
      validate: (value) => {
        if (noValidate) return;
        if (!value) {
          return 'Shield Publishable Key is required'
        } else if (!uuidV4Regex.test(value)) {
          return 'Shield Publishable Key is invalid'
        }
      }
    })
    if (prompts.isCancel(result)) return cancel()
    shieldPublishableKey = result
  }

  let shieldEncryptionShare: string | undefined
  let shieldSecret: string | undefined
  let openfortSecret: string | undefined

  const requestShieldSecret = async () => {
    const shieldSecretResult = await prompts.text({
      message: 'Shield Secret:',
      placeholder: 'Your Shield Secret',
      validate: (value) => {
        if (noValidate) return;
        if (!value) {
          return 'Shield Secret Key is required'
        } else if (!uuidV4Regex.test(value)) {
          return 'Shield Secret Key is invalid'
        }
      }
    })
    if (prompts.isCancel(shieldSecretResult)) return cancel()
    shieldSecret = shieldSecretResult
  }

  const requestShieldEncryptionShare = async () => {
    const shieldEncryptionShareResult = await prompts.text({
      message: 'Shield Encryption Share:',
      placeholder: 'Your Shield Encryption Share',
      validate: (value) => {
        if (noValidate) return;
        if (!value) {
          return 'Shield Encryption Share is required'
        } else if (value.length !== 44) {
          return 'Shield Encryption Share is invalid'
        }
      }
    })
    if (prompts.isCancel(shieldEncryptionShareResult)) return cancel()
    shieldEncryptionShare = shieldEncryptionShareResult
  }


  let config: OpenfortWalletConfig | null = null

  if (createEmbeddedSigner) {
    if (recoveryMethod === RecoveryMethod.PASSWORD) {
      await requestShieldPublishable()
      await requestShieldEncryptionShare()

      if (!shieldPublishableKey || !shieldEncryptionShare) {
        return cancel("Missing Shield Publishable Key or Shield Encryption Share")
      }

      env.SHIELD_PUBLISHABLE_KEY = shieldPublishableKey
      env.SHIELD_ENCRYPTION_SHARE = shieldEncryptionShare

      config = {
        createEmbeddedSigner: true,
        embeddedSignerConfiguration: {
          shieldPublishableKey: "_ENV_.SHIELD_PUBLISHABLE_KEY",
          recoveryMethod: recoveryMethod,
          shieldEncryptionKey: "_ENV_.SHIELD_ENCRYPTION_SHARE",
        }
      }
    } else if (recoveryMethod === RecoveryMethod.AUTOMATIC) {
      if (createBackend) {
        await requestOpenfortSecret()
        await requestShieldPublishable()
        await requestShieldSecret()
        await requestShieldEncryptionShare()
      } else {
        await requestShieldPublishable()
      }

      if (!shieldPublishableKey) {
        return cancel("Missing Shield Publishable Key")
      }

      env.SHIELD_PUBLISHABLE_KEY = shieldPublishableKey
      env.API_ENDPOINT = apiEndpoint

      config = {
        createEmbeddedSigner: true,
        embeddedSignerConfiguration: {
          shieldPublishableKey: "_ENV_.SHIELD_PUBLISHABLE_KEY",
          recoveryMethod: recoveryMethod,
          createEncryptedSessionEndpoint: "_ENV_.API_ENDPOINT",
        }
      }
    } else {
      cancel("Invalid recovery method")
    }
  } else {
    config = {
      linkWalletOnSignUp: true,
    }
  }

  if (verbose)
    prompts.log.info(`Using template: ${template}`)

  prompts.log.step(`Scaffolding project in ${fileManager.root}...`)

  if (createBackend) {
    if (!openfortSecret || !shieldSecret || !shieldPublishableKey || !shieldEncryptionShare) {
      return cancel("Missing Openfort Secret, Shield Secret, Shield Publishable Key or Shield Encryption Share")
    }

    await fileManager.createBackend({
      openfortSecretKey: openfortSecret,
      shieldSecretKey: shieldSecret,
      shieldApiKey: shieldPublishableKey,
      shieldEncryptionShare: shieldEncryptionShare,
      port: 3110,
    })
  }


  templateTransformer.copyTemplate("openfortkit");

  if (verbose)
    prompts.log.info(`Template copied: ${template}`)

  let configString = JSON.stringify(config, null, 2)

  const match = /"_ENV_\.(.*)"/
  let envVar = configString.match(match)

  while (envVar) {
    if (verbose)
      prompts.log.info(`Replacing ${envVar[0]} with ${templateTransformer.getEnvName(envVar[1])}`)

    configString = configString.replace(match, templateTransformer.getEnvName(envVar[1]))
    envVar = configString.match(match)
  }

  configString = configString.replace('"recoveryMethod": "automatic"', "recoveryMethod: RecoveryMethod.AUTOMATIC")
  configString = configString.replace('"recoveryMethod": "password"', "recoveryMethod: RecoveryMethod.PASSWORD")

  const providerToString = {
    [AuthProvider.EMAIL]: 'AuthProvider.EMAIL',
    [AuthProvider.GUEST]: 'AuthProvider.GUEST',
    [AuthProvider.WALLET]: 'AuthProvider.WALLET',
    [AuthProvider.FACEBOOK]: 'AuthProvider.FACEBOOK',
    [AuthProvider.GOOGLE]: 'AuthProvider.GOOGLE',
    [AuthProvider.TWITTER]: 'AuthProvider.TWITTER',
  }

  const providersString = "[\n  " +
    providers.map((provider) => {
      return providerToString[provider]
    }).join(',\n  ')
    + "\n]"


  fileManager.editFile(
    filesSrc[template].providers,
    (content) => {
      return content
        .replace(/WALLET_CONFIG/g, configString,)
        .replace(/WALLET_CONNECT_PROJECT_ID/g, templateTransformer.getEnvName('WALLET_CONNECT_PROJECT_ID'))
        .replace(/OPENFORT_PUBLISHABLE_KEY/g, templateTransformer.getEnvName('OPENFORT_PUBLISHABLE_KEY'))
        .replace(/AUTH_PROVIDERS/g, providersString)
        .replace(/VAR_THEME/g, theme)
        .replace(/"([^"]+)": /g, '$1: ')
    },
  )

  env.WALLET_CONNECT_PROJECT_ID = walletConnectProjectId

  templateTransformer.addEnv(env)

  fileManager.outro();
}

init().catch((error) => {
  console.error(error)
})
