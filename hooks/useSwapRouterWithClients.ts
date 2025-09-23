// useSwapRouterWithClients.ts
import { usePublicClient, useWalletClient } from './usePublicClient';
import { Address, Hex } from 'viem';
import { useWallet } from '@/provider';

import useSwapRouterStore, { 
  ExactInputParams, 
  ExactOutputParams, 
  QuoteExactInputParams,
  QuoteExactOutputParams,
  SwapInPoolParams,
  TransactionResult
} from '../store/useSwapRouterStore';

export const useSwapRouterWithClients = () => {
  const store = useSwapRouterStore();
  const { publicClient, chain } = usePublicClient();
  const { walletClient, getWalletClient } = useWalletClient();
  const { address } = useWallet();

  // 初始化合约
  const initContract = (contractAddress: Address = '0xD2c220143F5784b3bD84ae12747d97C8A36CeCB2') => {
    store.initContract(contractAddress);
  };

  // 包装读取方法
  const getPoolManager = async () => {
    if (!publicClient) {
      throw new Error('PublicClient 未初始化');
    }
    return store.getPoolManager(publicClient);
  };

  // 包装写入方法
 const exactInput = async (
  params: ExactInputParams,
  value: bigint = 0n
): Promise<TransactionResult> => {
  if (!publicClient) {
    throw new Error('PublicClient 未初始化');
  }
  if (!chain) {
    throw new Error('Chain 未初始化');
  }
  if (!address) {
    throw new Error('钱包地址未初始化');
  }
  // 验证参数中的地址是否有效
  if (!params.recipient || params.recipient === '0x') {
    throw new Error('接收地址无效');
  }
  
  if (!params.tokenIn || params.tokenIn === '0x') {
    throw new Error('输入代币地址无效');
  }
  
  if (!params.tokenOut || params.tokenOut === '0x') {
    throw new Error('输出代币地址无效');
  }
  
  const walletClient = getWalletClient();
  
  return store.exactInput(
    publicClient, 
    walletClient, 
    chain, 
    params, 
    address as Address,
    value
  );
};

  const exactOutput = async (
    params: ExactOutputParams,
    value: bigint = 0n
  ): Promise<TransactionResult> => {
    if (!publicClient) {
      throw new Error('PublicClient 未初始化');
    }
    if (!chain) {
      throw new Error('Chain 未初始化');
    }
    if (!address) {
      throw new Error('钱包地址未初始化');
    }
    
    const walletClient = getWalletClient();
    
    return store.exactOutput(
      publicClient, 
      walletClient, 
      chain, 
      params, 
      address as Address,
      value
    );
  };

  const quoteExactInput = async (
    params: QuoteExactInputParams
  ): Promise<bigint> => {
    if (!publicClient) {
      throw new Error('PublicClient 未初始化');
    }
    if (!chain) {
      throw new Error('Chain 未初始化');
    }
    if (!address) {
      throw new Error('钱包地址未初始化');
    }
    
    const walletClient = getWalletClient();
    
    return store.quoteExactInput(
      publicClient, 
      walletClient, 
      chain, 
      params, 
      address as Address
    );
  };

  const quoteExactOutput = async (
    params: QuoteExactOutputParams
  ): Promise<bigint> => {
    if (!publicClient) {
      throw new Error('PublicClient 未初始化');
    }
    if (!chain) {
      throw new Error('Chain 未初始化');
    }
    if (!address) {
      throw new Error('钱包地址未初始化');
    }
    
    const walletClient = getWalletClient();
    
    return store.quoteExactOutput(
      publicClient, 
      walletClient, 
      chain, 
      params, 
      address as Address
    );
  };

  const swapInPool = async (
    params: SwapInPoolParams
  ): Promise<[bigint, bigint]> => {
    if (!publicClient) {
      throw new Error('PublicClient 未初始化');
    }
    if (!chain) {
      throw new Error('Chain 未初始化');
    }
    if (!address) {
      throw new Error('钱包地址未初始化');
    }
    
    const walletClient = getWalletClient();
    
    return store.swapInPool(
      publicClient, 
      walletClient, 
      chain, 
      params, 
      address as Address
    );
  };

  // 自动初始化合约
  if (store.contractAddress === null) {
    initContract();
  }

  return {
    // 状态
    contractAddress: store.contractAddress,
    poolManagerAddress: store.poolManagerAddress,
    isLoading: store.isLoading,
    error: store.error,
    lastSwapResult: store.lastSwapResult,
    
    // 方法
    initContract,
    getPoolManager,
    exactInput,
    exactOutput,
    quoteExactInput,
    quoteExactOutput,
    swapInPool,
  };
};

export default useSwapRouterWithClients;