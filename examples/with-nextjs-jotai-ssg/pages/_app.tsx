import '../styles/globals.css';
import { ClientProvider } from '@micro-stacks/react';
import { JotaiClientProvider } from '@micro-stacks/jotai';
import { Provider, useAtom } from 'jotai';
import { StacksMainnet, StacksTestnet, StacksMocknet } from 'micro-stacks/network';

import type { AppProps } from 'next/app';
import type { ClientConfig } from '@micro-stacks/client';

const initialNetwork = new StacksMocknet({ url: 'http://localhost:3999' });

function MyApp({ Component, pageProps }: AppProps) {

  return (
    <Provider>
    <JotaiClientProvider>
    <ClientProvider
      appName="Nextjs + Microstacks"
      appIconUrl="/vercel.png"
      network={initialNetwork}
    >      
      <Component {...pageProps} />    

    </ClientProvider>
    </JotaiClientProvider>
    </Provider>
  );
}

export default MyApp;
