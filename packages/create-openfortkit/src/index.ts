import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import colors from 'picocolors'
import { AuthProvider, RecoveryMethod, Types } from '@openfort/openfort-kit'
import { cancel, copy, editFile, FileManager, formatTargetDir, pkgFromUserAgent, PkgInfo, prompts, promptTemplate } from '@openfort/openfort-cli'
import mri from 'mri'
import { copyTemplate } from "@openfort/template-transformer"

const {
  blue,
  blueBright,
  cyan,
  green,
  greenBright,
  magenta,
  red,
  redBright,
  reset,

  yellow,
} = colors

const argv = mri<{
  template?: string
  overwrite?: boolean
  help?: boolean
  verbose?: boolean
}>(process.argv.slice(2), {
  alias: {
    h: 'help',
    t: 'template',
  },
  boolean: [
    'help',
    'overwrite',
    'verbose',
  ],
  string: [
    'template',
  ],
})
const cwd = process.cwd()

// prettier-ignore
const helpMessage = `\
Usage: create-openfort [OPTION]... [DIRECTORY]

Create a new Vite project in JavaScript or TypeScript.
With no arguments, start the CLI in interactive mode.

Options:
  -t, --template NAME        use a specific template

Available templates:
${yellow('vanilla-ts     vanilla')}
${green('vue-ts         vue')}
${cyan('react-ts       react')}
${cyan('react-swc-ts   react-swc')}
${magenta('preact-ts      preact')}
${redBright('lit-ts         lit')}
${red('svelte-ts      svelte')}
${blue('solid-ts       solid')}
${blueBright('qwik-ts        qwik')}
`



const renameFiles: Record<string, string | undefined> = {
  _gitignore: '.gitignore',
  ".env._local": ".env.local",
}

const defaultTargetDir = 'openfortkit-project'

async function init() {
  const argTargetDir = argv._[0]
    ? formatTargetDir(String(argv._[0]))
    : undefined
  const argTemplate = argv.template
  const argOverwrite = argv.overwrite
  const verbose = argv.verbose

  const help = argv.help
  if (help) {
    console.log(helpMessage)
    return
  }

  prompts.intro("Let's create a new Openfortkit project!")

  const pkgInfo = pkgFromUserAgent()

  if (verbose)
    prompts.log.info(`Using ${pkgInfo?.name ?? 'npm'} ${pkgInfo?.version ?? ''}`)

  const fileManager = new FileManager()
  await fileManager.init({
    argTargetDir,
    argOverwrite,
    defaultTargetDir,
  })
  if (!fileManager.targetDir) return;

  const template = await promptTemplate({
    argTemplate,
  })
  if (!template) return;

  const pkgManager = pkgInfo ? pkgInfo.name : 'npm'


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
  prompts.log.success(`Template: ${String(providers)}`)
  if (prompts.isCancel(providers)) return cancel()

  // Wallet Connect Project ID for Wallet provider
  var walletConnectProjectId: string | undefined
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

  var createBackend: boolean | undefined = false
  var recoveryMethod: RecoveryMethod | undefined
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
            label: 'Yes',
            hint: 'You will need to provide an endpoint to create an encryption session',
          },
          {
            value: false,
            label: 'No',
            hint: 'We will create a sample backend for you',
          },
        ],
      })
      if (prompts.isCancel(result)) return cancel()
      createBackend = result
    }
  }

  // Select theme
  const theme = await prompts.select<Types.Theme>({
    message: 'Select a theme:',
    options: [
      {
        value: 'auto',
        label: 'Default',
        hint: 'Auto'
      },
      {
        value: 'web95',
        label: 'Web95',
      },
      {
        value: 'retro',
        label: 'Retro',
      },
      {
        value: 'soft',
        label: 'Soft',
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
        value: 'rounded',
        label: colors.red('rounded'),
      },
      {
        value: 'nouns',
        label: 'Nouns',
      },
    ],
  })
  if (prompts.isCancel(theme)) return cancel()

  prompts.log.success('Good! You are all set.\nPlease provide the following keys to continue.\nGet your keys from https://dashboard.openfort.xyz/developers/api-keys')

  // Input Keys
  const publishableKey = await prompts.text({
    message: 'Openfort Publishable Key:',
    placeholder: 'pk...',
  })
  if (prompts.isCancel(publishableKey)) return cancel()

  const requestOpenfortSecret = async () => {
    const openfortSecretResult = await prompts.text({
      message: 'Openfort Secret:',
      placeholder: 'sk_...',
    })
    if (prompts.isCancel(openfortSecretResult)) return cancel()
    openfortSecret = openfortSecretResult
  }

  var shieldPublishableKey: string | undefined
  if (createEmbeddedSigner) {
    const result = await prompts.text({
      message: 'Shield Publishable Key:',
      placeholder: 'Your Shield Publishable Key',
    })
    if (prompts.isCancel(result)) return cancel()
    shieldPublishableKey = result
  }

  var shieldEncryptionShare: string | undefined
  var shieldSecret: string | undefined
  var openfortSecret: string | undefined
  var apiEndpoint: string | undefined

  const requestShieldSecret = async () => {
    const shieldSecretResult = await prompts.text({
      message: 'Shield Secret:',
      placeholder: 'Your Shield Secret',
    })
    if (prompts.isCancel(shieldSecretResult)) return cancel()
    shieldSecret = shieldSecretResult
  }

  const requestShieldEncryptionShare = async () => {
    const shieldEncryptionShareResult = await prompts.text({
      message: 'Shield Encryption Share:',
      placeholder: 'Your Shield Encryption Share',
    })
    if (prompts.isCancel(shieldEncryptionShareResult)) return cancel()
    shieldEncryptionShare = shieldEncryptionShareResult
  }

  const requestApiEndpoint = async () => {
    const apiEndpointResult = await prompts.text({
      message: 'API Endpoint:',
      placeholder: 'Your API Endpoint',
      validate: (value) => {
        if (!value) {
          return 'API Endpoint is required'
        }
      }
    })
    if (prompts.isCancel(apiEndpointResult)) return cancel()
    apiEndpoint = apiEndpointResult
  }

  if (createEmbeddedSigner) {

    if (recoveryMethod === RecoveryMethod.PASSWORD) {
      await requestShieldEncryptionShare()
    }

    if (recoveryMethod === RecoveryMethod.AUTOMATIC) {
      if (createBackend) {
        await requestOpenfortSecret()
        await requestShieldSecret()
        await requestShieldEncryptionShare()
      } else {
        await requestApiEndpoint()
      }
    }
  }

  // if (verbose)
  //   prompts.log.info(`Using template: ${template} from ${fileManager.templateDir}`)

  prompts.log.step(`Scaffolding project in ${fileManager.root}...`)

  copyTemplate(template, fileManager)

  // pkg.name = fileManager.packageName

  // setupReactSwc(root, template.endsWith('-ts'))

  let doneMessage = ''
  const cdProjectName = path.relative(cwd, fileManager.root!)
  doneMessage += `Done. Now run:\n`
  if (fileManager.root !== cwd) {
    doneMessage += `\n  cd ${cdProjectName.includes(' ') ? `"${cdProjectName}"` : cdProjectName
      }`
  }
  switch (pkgManager) {
    case 'yarn':
      doneMessage += '\n  yarn'
      doneMessage += '\n  yarn dev'
      break
    default:
      doneMessage += `\n  ${pkgManager} install`
      doneMessage += `\n  ${pkgManager} run dev`
      break
  }
  prompts.outro(doneMessage)
}



function setupReactSwc(root: string, isTs: boolean) {
  // renovate: datasource=npm depName=@vitejs/plugin-react-swc
  const reactSwcPluginVersion = '3.8.0'

  editFile(path.resolve(root, 'package.json'), (content) => {
    return content.replace(
      /"@vitejs\/plugin-react": ".+?"/,
      `"@vitejs/plugin-react-swc": "^${reactSwcPluginVersion}"`,
    )
  })
  editFile(
    path.resolve(root, `vite.config.${isTs ? 'ts' : 'js'}`),
    (content) => {
      return content.replace('@vitejs/plugin-react', '@vitejs/plugin-react-swc')
    },
  )
}

init().catch((e) => {
  console.error(e)
})
