import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, polygon, optimism, arbitrum, base, sepolia } from 'wagmi/chains';
import { http } from 'viem';
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient();

export const config = getDefaultConfig({
  appName: 'YC Directory',
  projectId: '2e789d28c2f0380f39fc2a7bd198dee7',
  chains: [sepolia, mainnet, polygon, optimism, arbitrum, base], // 将 Sepolia 放在第一位，使其成为默认网络
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
    [sepolia.id]: http(), // 使用默认 RPC
  },
  ssr: true,
});

export default config;

export const MTK_CONTRACT_ADDRESS = '0x29c3A0FD12E14E88B73d6ff796AFEd06BF5e5d13'