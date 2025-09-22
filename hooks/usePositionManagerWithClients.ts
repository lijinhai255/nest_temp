// usePositionManagerWithClients.ts
import { usePublicClient, useWalletClient } from './usePublicClient';
import { Address, erc20Abi, parseUnits, formatUnits } from 'viem';
import { 
  useReadContract, 
  useWriteContract, 
  useChainId, 
  useWaitForTransactionReceipt 
} from 'wagmi';
import { useWallet } from '@/provider';

import usePositionManagerStore, { 
  MintParams, 
  MintResult,
  CollectResult,
  BurnResult,
  PositionInfo
} from '../store/usePositionManagerStore';

export const usePositionManagerWithClients = () => {
  const store = usePositionManagerStore();
  const chainId = useChainId();
  
  const { publicClient, chain } = usePublicClient();
  const { walletClient, getWalletClient } = useWalletClient();
  const { address } = useWallet();
  const { writeContract, data: writeData, isPending: isWritePending } = useWriteContract();

  // Position Manager 合约地址
  const POSITION_MANAGER = '0xbe766Bf20eFfe431829C5d5a2744865974A0B610';

  // 🆕 代币授权 Hook
  const useTokenApproval = (
    tokenAddress?: Address,
    spenderAddress: Address = POSITION_MANAGER as Address,
    ownerAddress?: Address
  ) => {
    const targetOwner = ownerAddress || address;
    
    return useReadContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'allowance',
      args: targetOwner && tokenAddress ? [targetOwner, spenderAddress] : undefined,
      query: {
        enabled: !!(tokenAddress && targetOwner),
        refetchInterval: 10000, // 每10秒刷新一次
      }
    });
  };

  // 🆕 代币余额 Hook
  const useTokenBalance = (tokenAddress?: Address, ownerAddress?: Address) => {
    const targetOwner = ownerAddress || address;
    
    return useReadContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: targetOwner && tokenAddress ? [targetOwner] : undefined,
      query: {
        enabled: !!(tokenAddress && targetOwner),
        refetchInterval: 10000, // 每10秒刷新一次
      }
    });
  };

  // 🆕 检查代币授权额度（异步函数）
  const checkTokenAllowance = async (
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string
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

  // 🆕 检查代币余额（异步函数）
  const checkTokenBalance = async (
    tokenAddress: string,
    ownerAddress: string
  ): Promise<bigint> => {
    try {
      if (!publicClient) {
        throw new Error('PublicClient 未初始化');
      }

      const balance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [ownerAddress as `0x${string}`],
      });
      
      console.log(`🔍 ${tokenAddress} 余额:`, balance.toString());
      return balance;
    } catch (error) {
      console.error('检查余额失败:', error);
      return 0n;
    }
  };

  // 🆕 检查代币余额是否足够（异步函数）
  const checkSufficientBalance = async (
    tokenAddress: string,
    requiredAmount: bigint,
    ownerAddress?: string
  ): Promise<boolean> => {
    const targetAddress = ownerAddress || address;
    if (!targetAddress) {
      throw new Error('地址未提供');
    }

    const balance = await checkTokenBalance(tokenAddress, targetAddress);
    const sufficient = balance >= requiredAmount;
    
    console.log(`🔍 余额检查 ${tokenAddress}:`, {
      required: requiredAmount.toString(),
      balance: balance.toString(),
      sufficient
    });
    
    return sufficient;
  };

  // 🆕 批量检查多个代币的授权状态
  const useMultiTokenApprovals = (tokens: { address: Address; amount: bigint }[]) => {
    const approvals = tokens.map(token => 
      useTokenApproval(token.address, POSITION_MANAGER as Address, address)
    );

    const needsApproval = tokens.map((token, index) => {
      const approval = approvals[index];
      return approval.data ? (approval.data as bigint) < token.amount : true;
    });

    const isLoading = approvals.some(approval => approval.isLoading);
    const hasError = approvals.some(approval => approval.error);

    return {
      approvals,
      needsApproval,
      isLoading,
      hasError,
      refetch: () => approvals.forEach(approval => approval.refetch())
    };
  };

  // 🆕 批量检查多个代币的余额
  const useMultiTokenBalances = (tokenAddresses: Address[]) => {
    const balances = tokenAddresses.map(tokenAddress => 
      useTokenBalance(tokenAddress, address)
    );

    const isLoading = balances.some(balance => balance.isLoading);
    const hasError = balances.some(balance => balance.error);

    return {
      balances,
      isLoading,
      hasError,
      refetch: () => balances.forEach(balance => balance.refetch())
    };
  };

  // 🆕 授权代币函数
  const approveToken = async (
    tokenAddress: Address,
    spenderAddress: Address = POSITION_MANAGER as Address,
    amount?: bigint
  ): Promise<string> => {
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
      
      console.log('✅ 授权交易哈希:', hash);
      return hash;
    } catch (error) {
      console.error('授权失败:', error);
      throw error;
    }
  };

  // 🆕 等待交易确认的 Hook
  const useTransactionConfirmation = (hash?: `0x${string}`) => {
    return useWaitForTransactionReceipt({
      hash,
      query: {
        enabled: !!hash,
      }
    });
  };

  // 🆕 检查并处理代币授权的函数
  const ensureTokenApproval = async (
    tokenAddress: Address,
    amount: bigint,
    spenderAddress: Address = POSITION_MANAGER as Address
  ): Promise<boolean> => {
    if (!address) {
      throw new Error('钱包地址未初始化');
    }
    console.log("tokenAddress",tokenAddress,address,amount,spenderAddress)

    try {
      // 检查当前授权
      const currentAllowance = await checkTokenAllowance(
        tokenAddress,
        address,
        spenderAddress
      );

      // 如果授权足够，直接返回
      if (currentAllowance >= amount) {
        console.log('✅ 授权额度足够');
        return true;
      }

      // 需要授权
      console.log(`🔧 需要授权，当前: ${currentAllowance.toString()}, 需要: ${amount.toString()}`);
      
      await approveToken(tokenAddress, spenderAddress);
      return true;
    } catch (error) {
      console.error('处理授权失败:', error);
      throw error;
    }
  };

  // 初始化合约
  const initContract = (contractAddress: Address = POSITION_MANAGER as Address) => {
    store.initContract(contractAddress);
  };

  // 包装读取方法
  const fetchAllPositions = async () => {
    if (!publicClient) {
      throw new Error('PublicClient 未初始化');
    }
    return store.fetchAllPositions(publicClient);
  };

  const fetchUserPositions = async (userAddress?: Address) => {
    if (!publicClient) {
      throw new Error('PublicClient 未初始化');
    }
    const targetAddress = userAddress || address;
    if (!targetAddress) {
      throw new Error('用户地址未提供');
    }
    console.log('Fetching positions for address:', targetAddress);
    return store.fetchUserPositions(publicClient, targetAddress);
  };

  const getPosition = async (positionId: bigint): Promise<PositionInfo | null> => {
    if (!publicClient) {
      throw new Error('PublicClient 未初始化');
    }
    return store.getPosition(publicClient, positionId);
  };

  // 🆕 增强的 mint 方法 - 自动处理授权
  const mintWithApproval = async (params: MintParams): Promise<MintResult> => {
    if (!publicClient) {
      throw new Error('PublicClient 未初始化');
    }
    if (!chain) {
      throw new Error('Chain 未初始化');
    }
    if (!address) {
      throw new Error('钱包地址未初始化');
    }

    try {
      console.log('🚀 开始 mint 流程，自动处理授权...');
      
      // 检查并处理 token0 授权
      console.log('🔍 检查 token0 授权...');
      await ensureTokenApproval(params.token0 as Address, params.amount0Desired);
      
      // 检查并处理 token1 授权
      console.log('🔍 检查 token1 授权...');
      await ensureTokenApproval(params.token1 as Address, params.amount1Desired);
      
      console.log('✅ 所有授权完成，开始 mint...');
      
      // 执行 mint
      const walletClient = getWalletClient();
      return store.mint(publicClient, walletClient, chain, address, params);
      
    } catch (error) {
      console.error('mintWithApproval 失败:', error);
      throw error;
    }
  };

  // 原始的 mint 方法（不处理授权）
  const mint = async (params: MintParams): Promise<MintResult> => {
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
    
    return store.mint(publicClient, walletClient, chain, address, params);
  };

  const collect = async (positionId: bigint, recipient?: Address): Promise<CollectResult> => {
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
    const targetRecipient = recipient || address;
    
    return store.collect(publicClient, walletClient, chain, address, positionId, targetRecipient);
  };

  const burn = async (positionId: bigint): Promise<BurnResult> => {
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
    
    return store.burn(publicClient, walletClient, chain, address, positionId);
  };

  // 自动初始化合约
  if (store.contractAddress === null) {
    initContract();
  }

  return {
    // 状态
    contractAddress: store.contractAddress,
    positions: store.positions,
    userPositions: store.userPositions,
    isLoading: store.isLoading,
    error: store.error,
    chainId,
    
    // 原始方法
    initContract,
    fetchAllPositions,
    fetchUserPositions,
    getPosition,
    mint,
    collect,
    burn,
    
    // 🆕 代币相关 Hooks
    useTokenApproval,
    useTokenBalance,
    useMultiTokenApprovals,
    useMultiTokenBalances,
    useTransactionConfirmation,
    
    // 🆕 代币相关异步函数
    checkTokenAllowance,
    checkTokenBalance,
    checkSufficientBalance, // ✅ 现在包含了这个函数
    approveToken,
    ensureTokenApproval,
    
    // 🆕 增强方法
    mintWithApproval,
    
    // 写入状态
    isWritePending,
    writeData,
  };
};

export default usePositionManagerWithClients;
