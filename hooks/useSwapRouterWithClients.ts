// useSwapRouterWithClients.ts
import { usePublicClient, useWalletClient } from './usePublicClient';
import { Address, Hex, erc20Abi } from 'viem';
import { 
  useReadContract, 
  useWriteContract, 
  useWaitForTransactionReceipt 
} from 'wagmi';
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
  const { writeContract, data: writeData, isPending: isWritePending } = useWriteContract();

  // SwapRouter 合约地址
  const SWAP_ROUTER = '0xD2c220143F5784b3bD84ae12747d97C8A36CeCB2';

  // 初始化合约
  const initContract = (contractAddress: Address = SWAP_ROUTER as Address) => {
    store.initContract(contractAddress);
  };

  // 包装读取方法
  const getPoolManager = async () => {
    if (!publicClient) {
      throw new Error('PublicClient 未初始化');
    }
    return store.getPoolManager(publicClient);
  };

  // 检查代币授权额度（异步函数）
  const checkAllowance = async (
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string = store.contractAddress || SWAP_ROUTER
  ): Promise<bigint> => {
    try {
      if (!publicClient) {
        throw new Error('PublicClient 未初始化');
      }

      const allowance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [ownerAddress as `0x${string}`, spenderAddress as `0x${string}`],
      });
      
      console.log(`🔍 ${tokenAddress} 授权额度:`, allowance.toString());
      return allowance;
    } catch (error) {
      console.error('检查授权失败:', error);
      return 0n;
    }
  };

  // 授权代币函数
  const approveToken = async (
    tokenAddress: Address,
    spenderAddress: Address = store.contractAddress as Address || SWAP_ROUTER as Address,
    amount?: bigint
  ): Promise<void> => {
    try {
      // 默认授权最大值
      const approveAmount = amount || BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      
      console.log(`🔧 授权代币 ${tokenAddress} 给 ${spenderAddress}, 数量: ${approveAmount.toString()}`);
      
      const hash = await writeContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spenderAddress, approveAmount],
      });
      
      console.log('✅ 授权交易已提交');
    } catch (error) {
      console.error('授权失败:', error);
      throw error;
    }
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
    
    // 检查授权并在需要时进行授权
    const currentAllowance = await checkAllowance(
      params.tokenIn,
      address,
      store.contractAddress || SWAP_ROUTER
    );

    if (currentAllowance < params.amountIn) {
      console.log(`🔧 需要授权，当前: ${currentAllowance.toString()}, 需要: ${params.amountIn.toString()}`);

      await approveToken(params.tokenIn as Address);

      // 简单等待一下让交易提交
      console.log('⏳ 等待授权交易确认...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('✅ 授权交易已确认');
    } else {
      console.log('✅ 授权额度足够');
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
    
    // 检查授权并在需要时进行授权
    const currentAllowance = await checkAllowance(
      params.tokenIn,
      address,
      store.contractAddress || SWAP_ROUTER
    );

    if (currentAllowance < params.amountInMaximum) {
      console.log(`🔧 需要授权，当前: ${currentAllowance.toString()}, 需要: ${params.amountInMaximum.toString()}`);

      await approveToken(params.tokenIn as Address);

      // 简单等待一下让交易提交
      console.log('⏳ 等待授权交易确认...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('✅ 授权交易已确认');
    } else {
      console.log('✅ 授权额度足够');
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
    isWritePending,
    writeData,
    
    // 方法
    initContract,
    getPoolManager,
    exactInput,
    exactOutput,
    quoteExactInput,
    quoteExactOutput,
    swapInPool,
    
    // 授权相关方法 (仅供内部使用)
    checkAllowance,
    approveToken
  };
};

export default useSwapRouterWithClients;