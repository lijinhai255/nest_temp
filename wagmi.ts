import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { 
  metaMaskWallet, 
  trustWallet,
  coinbaseWallet,
  walletConnectWallet,
  injectedWallet,
  okxWallet,
  safeWallet,
  imTokenWallet
} from '@rainbow-me/rainbowkit/wallets';

import { mainnet, polygon, optimism, arbitrum, base, sepolia } from 'wagmi/chains';
import { http, createConfig } from 'wagmi';
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient();

// 定义您想支持的链 - 注意这里使用 as const 来创建正确的类型
const chains = [sepolia, mainnet, polygon, optimism, arbitrum, base] as const;
const projectId = '2e789d28c2f0380f39fc2a7bd198dee7';

// 自定义钱包配置
const connectors = connectorsForWallets(
  [
    {
      groupName: '推荐',
      wallets: [
        metaMaskWallet,
        okxWallet,
        imTokenWallet,
        coinbaseWallet,
        trustWallet,
      ],
    },
    {
      groupName: '其他',
      wallets: [
        walletConnectWallet,
        injectedWallet,
        safeWallet,
      ],
    },
  ],
  {
    appName: 'YC Directory',
    projectId: projectId,
  }
);

// 创建 Wagmi 配置
export const config = createConfig({
  chains,
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
    [sepolia.id]: http(),
  },
  connectors,
  ssr: true,
});

export default config;

export const MTK_CONTRACT_ADDRESS = '0x29c3A0FD12E14E88B73d6ff796AFEd06BF5e5d13'