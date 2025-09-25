// usePoolManagerWithClients.ts
import { useCallback } from 'react';
import { usePublicClient, useWalletClient } from './usePublicClient';
import { Address } from 'viem';
import { useWallet } from '@/provider';

import usePoolManagerStore, { 
  CreatePoolParams, 
  CreateAndInitializeParams, 
  TransactionResult,
  ContractParameters 
} from '../store/usePoolManagerStore';

export const usePoolManagerWithClients = () => {
  // 修正：添加括号来调用 hook
  const store = usePoolManagerStore();
  const { publicClient, chain } = usePublicClient();
  const { walletClient, getWalletClient } = useWalletClient();
  const { address } = useWallet();

  // 初始化合约
  const initContract = (contractAddress: Address = '0xddC12b3F9F7C91C79DA7433D8d212FB78d609f7B') => {
    store.initContract(contractAddress);
  };

  // 包装读取方法
  const fetchAllPools = useCallback(async () => {
    if (!publicClient) {
      throw new Error('PublicClient 未初始化');
    }
    return store.fetchAllPools(publicClient);
  }, [publicClient, store.fetchAllPools]);

  const fetchPairs = async () => {
    if (!publicClient) {
      throw new Error('PublicClient 未初始化');
    }
    return store.fetchPairs(publicClient);
  };

  const getPool = async (tokenA: Address, tokenB: Address, index: number) => {
    if (!publicClient) {
      throw new Error('PublicClient 未初始化');
    }
    return store.getPool(publicClient, tokenA, tokenB, index);
  };

  const getParameters = async (): Promise<ContractParameters> => {
    if (!publicClient) {
      throw new Error('PublicClient 未初始化');
    }
    return store.getParameters(publicClient);
  };

  // 包装写入方法 - 修正参数顺序
  const createPool = async (params: CreatePoolParams): Promise<TransactionResult> => {
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
    
    // 修正参数顺序：account 应该在 params 之前
    return store.createPool(publicClient, walletClient, chain, params,address as unknown as Address);
  };

  const createAndInitializePoolIfNecessary = async (
    params: CreateAndInitializeParams
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
    console.log('createAndInitializePoolIfNecessary:', address, params);
    
    // 修正参数顺序：account 应该在 params 之前
    return store.createAndInitializePoolIfNecessary(publicClient, walletClient, chain, params,address as unknown as Address);
  };

  // 自动初始化合约
  if (store.contractAddress === null) {
    initContract();
  }

  return {
    // 状态
    contractAddress: store.contractAddress,
    poolsInfo: store.poolsInfo,
    pairs: store.pairs,
    isLoading: store.isLoading,
    error: store.error,
    
    // 方法
    initContract,
    fetchAllPools,
    fetchPairs,
    getPool,
    getParameters,
    createPool,
    createAndInitializePoolIfNecessary,
  };
};

export default usePoolManagerWithClients;
