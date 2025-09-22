// hooks/usePublicClient.ts
import { createPublicClient, createWalletClient, http,
custom ,Address} from 'viem'; // 修正导入
import { sepolia, mainnet, goerli } from 'viem/chains';
import { useWallet } from '@/provider';
import { useMemo } from 'react';

// 根据chainID获取对应的链配置
const getChainConfig = (chainID: number|string) => {
  switch (+chainID) {
    case 1:
      return mainnet;
    case 5:
      return goerli;
    case 11155111:
      return sepolia;
    default:
      console.warn(`⚠️ 未知的链ID: ${chainID}, 默认使用Sepolia测试网`);
      return sepolia;
  }
};

// 创建并返回与当前chainID匹配的publicClient和chain
export const usePublicClient = () => {
  const { chainID } = useWallet();
  const chain = useMemo(() => getChainConfig(chainID), [chainID]);
  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain,
        transport: http(),
      }),
    [chain]
  );

  return { publicClient, chain };
};

// 封装 useWalletClient
// 封装 useWalletClient
export const useWalletClient = () => {
  const { address, provider, chainID } = useWallet();
  const chain = useMemo(() => getChainConfig(chainID), [chainID]);
  
  // 使用 useMemo 缓存 walletClient
  const walletClient = useMemo(() => {
    if (!provider || !address) {
      return null;
    }
    
    return createWalletClient({
      chain,
      transport: custom(provider),
      account: address as Address
    });
  }, [provider, address, chain]);
  
  // 提供一个获取 walletClient 的函数，如果钱包未连接则抛出错误
  const getWalletClient = () => {
    if (!walletClient) {
      throw new Error('钱包未连接');
    }
    return walletClient;
  };
  
  return { walletClient, getWalletClient };
};