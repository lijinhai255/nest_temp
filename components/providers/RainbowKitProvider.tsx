'use client';

import { RainbowKitProvider as RKProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider } from '@tanstack/react-query';
import { config, queryClient } from '@/wagmi';

// 导入 RainbowKit 样式
import '@rainbow-me/rainbowkit/styles.css';

interface RainbowKitProviderProps {
  children: React.ReactNode;
}

export function RainbowKitProvider({ children }: RainbowKitProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RKProvider>
          {children}
        </RKProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}