// hooks/usePublicClient.ts
import { createPublicClient, http } from 'viem';
import { sepolia, mainnet, goerli } from 'viem/chains';
import { useWallet } from '@/provider';
import { useMemo } from 'react';

// 根据chainID获取对应的链配置
const getChainConfig = (chainID: number|string) => {
  console.log("getChainConfig-----chainID",chainID)
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
  console.log("usePublicClient====usePublicClient",chain,chainID)
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

