"use client"

import React from 'react'
import { OpenfortKitProvider, getDefaultConfig, RecoveryMethod, AuthProvider, OpenfortWalletConfig } from '@openfort/openfort-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig } from 'wagmi'
import { polygonAmoy } from 'viem/chains'

const config = createConfig(
  getDefaultConfig({
    appName: 'OpenfortKit demo',
    walletConnectProjectId: WALLET_CONNECT_PROJECT_ID,
    chains: [polygonAmoy], // Add your chain here
    ssr: true,
  })
);

const queryClient = new QueryClient()

const walletConfig: OpenfortWalletConfig = WALLET_CONFIG

const authProviders: AuthProvider[] = AUTH_PROVIDERS

export function Providers({ children }: { children?: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OpenfortKitProvider
          // Set the publishable key of your OpenfortKit account. This field is required.
          publishableKey={OPENFORT_PUBLISHABLE_KEY}

          options={{
            authProviders,
          }}

          theme="VAR_THEME"

          walletConfig={walletConfig}
        >
          {children}
        </OpenfortKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
