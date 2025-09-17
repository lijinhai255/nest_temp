import { useState, useEffect, useCallback } from 'react';
import { 
  parseEther, 
  formatEther,
  createWalletClient,
  custom,
  Address,
  Block,
  WriteContractReturnType,
  WaitForTransactionReceiptReturnType,
  PublicClient
} from 'viem';
import { useWallet } from '@/provider';
import { usePublicClient } from '@/hooks/usePublicClient';

import implementationABI from '@/lib/abi/MetaNodeStake.json';

export const PROXY_CONTRACT_ADDRESS = implementationABI.address as Address;


// 创建公共客户端（单例）
export 

// 🆕 冷却信息类型定义
interface CooldownInfo {
  unstakeTime: number;           // 解质押时间戳
  unlockTime: number;            // 解锁时间戳
  remainingSeconds: number;      // 剩余秒数
  remainingBlocks: number;       // 剩余区块数
  isReady: boolean;              // 是否可以提取
  currentBlock: number;          // 当前区块号
}

// 🆕 解质押存储数据类型
interface UnstakeStorageData {
  block: number;
  timestamp: number;
  amount: string;
  hash: string;
}

// 🆕 池子信息类型定义
interface PoolInfo {
  lpToken: string;              // LP代币地址
  allocPoint: bigint;           // 分配点数
  lastRewardBlock: bigint;      // 最后奖励区块
  accMetaNodePerShare: bigint;  // 累积每股奖励
  depositFeeBP: bigint;         // 存款手续费基点
  minDepositAmount: bigint;     // 最小存款金额
  unstakeLockedBlocks: bigint;  // 解质押锁定区块数
}

// 🆕 用户信息类型定义
interface UserInfo {
  amount: bigint;           // 质押金额
  rewardDebt: bigint;       // 奖励债务
  unstakeBlock: bigint;     // 解质押区块号
}

// 🆕 提取金额信息类型定义
interface WithdrawAmountInfo {
  requestAmount: bigint;
  pendingWithdrawAmount: bigint;
}

// 🔧 修正事件日志类型定义 - 使用正确的参数名称
interface RequestUnstakeEventLog {
  blockNumber: bigint;
  transactionHash: string;
  args: {
    user: Address;
    poolId: bigint;  // 🔧 修正：使用 poolId 而不是 pid
    amount: bigint;
  };
}

// 🆕 交易结果类型定义
interface TransactionResult {
  hash: WriteContractReturnType;
  receipt: WaitForTransactionReceiptReturnType;
}

// 🆕 本地存储工具函数
const unstakeStorageUtils = {
  // 生成存储键
  getKey: (address: string, poolId: number): string => `unstake_${address}_${poolId}`,
  
  // 保存解质押数据
  save: (address: string, poolId: number, data: UnstakeStorageData): void => {
    const key = unstakeStorageUtils.getKey(address, poolId);
    try {
      localStorage.setItem(key, JSON.stringify(data));
      console.log('💾 保存解质押数据:', { key, data });
    } catch (error) {
      console.error('❌ 保存解质押数据失败:', error);
    }
  },
  
  // 获取解质押数据
  get: (address: string, poolId: number): UnstakeStorageData | null => {
    const key = unstakeStorageUtils.getKey(address, poolId);
    try {
      const data = localStorage.getItem(key);
      if (!data) return null;
      
      try {
        return JSON.parse(data) as UnstakeStorageData;
      } catch {
        // 兼容旧格式（只有区块号）
        return {
          block: parseInt(data),
          timestamp: 0,
          amount: '0',
          hash: 'legacy'
        };
      }
    } catch (error) {
      console.error('❌ 获取解质押数据失败:', error);
      return null;
    }
  },
  
  // 删除解质押数据
  remove: (address: string, poolId: number): void => {
    const key = unstakeStorageUtils.getKey(address, poolId);
    try {
      localStorage.removeItem(key);
      console.log('🗑️ 删除解质押数据:', key);
    } catch (error) {
      console.error('❌ 删除解质押数据失败:', error);
    }
  },
  
  // 获取所有解质押数据
  getAll: (address: string): Array<{ poolId: number; data: UnstakeStorageData | null }> => {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(`unstake_${address}_`)
      );
      
      return keys.map(key => {
        const poolId = parseInt(key.split('_')[2]);
        const data = localStorage.getItem(key);
        return {
          poolId,
          data: data ? JSON.parse(data) as UnstakeStorageData : null
        };
      });
    } catch (error) {
      console.error('❌ 获取所有解质押数据失败:', error);
      return [];
    }
  },
  
  // 清除所有解质押数据
  clearAll: (address: string): void => {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(`unstake_${address}_`)
      );
      
      keys.forEach(key => localStorage.removeItem(key));
      console.log('🗑️ 清除所有解质押数据:', keys.length);
    } catch (error) {
      console.error('❌ 清除所有解质押数据失败:', error);
    }
  }
};

// 🔧 修正分批查询事件日志的工具函数
const queryLogsInBatches = async (
  client:PublicClient,
  contractAddress: string,
  eventAbi: {
    type: 'event';
    name: string;
    inputs: Array<{
      name: string;
      type: string;
      indexed: boolean;
    }>;
  },
  args: {
    user: Address;
    poolId: bigint;  // 🔧 修正：使用 poolId 而不是 pid
  },
  fromBlock: bigint,
  toBlock: bigint | 'latest' = 'latest',
  batchSize: number = 3000
): Promise<RequestUnstakeEventLog[]> => {
  const logs: RequestUnstakeEventLog[] = [];
  let currentFromBlock = fromBlock;
  
  // 获取最新区块号
  const latestBlock = toBlock === 'latest' 
    ? await client.getBlockNumber() 
    : BigInt(toBlock);

  console.log(`📊 开始分批查询事件日志 ${eventAbi.name}:`);
  console.log(`- 起始区块: ${currentFromBlock}`);
  console.log(`- 结束区块: ${latestBlock}`);
  console.log(`- 批次大小: ${batchSize} 块`);

  while (currentFromBlock <= latestBlock) {
    const currentToBlock = currentFromBlock + BigInt(batchSize - 1) > latestBlock 
      ? latestBlock 
      : currentFromBlock + BigInt(batchSize - 1);

    try {
      console.log(`🔍 查询区块范围: ${currentFromBlock} - ${currentToBlock}`);
      
      const batchLogs = await client.getLogs({
        address: contractAddress as Address,
        event: eventAbi,
        args,
        fromBlock: currentFromBlock,
        toBlock: currentToBlock,
      }) as unknown as RequestUnstakeEventLog[];

      logs.push(...batchLogs);
      console.log(`✅ 本批次找到 ${batchLogs.length} 个 ${eventAbi.name} 事件`);
      
      // 添加小延迟避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error(`❌ 查询区块 ${currentFromBlock}-${currentToBlock} 失败:`, errorMessage);
      
      // 如果批次仍然太大，进一步减小批次
      if (errorMessage.includes('ranges over') && batchSize > 1000) {
        console.log(`🔄 批次过大，减小到 ${Math.floor(batchSize / 2)} 块重试`);
        return queryLogsInBatches(
          client, 
          contractAddress, 
          eventAbi,
          args,
          fromBlock, 
          toBlock, 
          Math.floor(batchSize / 2)
        );
      }
      
      // 如果是其他错误，跳过这个批次
      console.log(`⚠️ 跳过失败的批次，继续下一批次`);
    }

    currentFromBlock = currentToBlock + 1n;
  }

  console.log(`🎉 总共找到 ${logs.length} 个 ${eventAbi.name} 事件日志`);
  return logs;
};

export const useStakingContract = () => {
  const { address, isConnected, balance, provider } = useWallet();
  const {publicClient,chain} = usePublicClient()
  // 基础状态
  const [stakedAmount, setStakedAmount] = useState<string>('0');
  const [pendingRewards, setPendingRewards] = useState<string>('0');
  const [totalStaked, setTotalStaked] = useState<string>('0');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [poolId, setPoolId] = useState<number>(0);
  const [minStakeAmount, setMinStakeAmount] = useState<string>('0');
  
  // 提取相关状态
  const [requestAmount, setRequestAmount] = useState<string>('0');
  const [pendingWithdrawAmount, setPendingWithdrawAmount] = useState<string>('0');
  const [unstakeLockedBlocks, setUnstakeLockedBlocks] = useState<number>(0);
  const [withdrawPaused, setWithdrawPaused] = useState<boolean>(false);

  // 🆕 冷却信息状态
  const [cooldownInfo, setCooldownInfo] = useState<CooldownInfo>({
    unstakeTime: 0,
    unlockTime: 0,
    remainingSeconds: 0,
    remainingBlocks: 0,
    isReady: false,
    currentBlock: 0
  });
  

  // 创建钱包客户端
  const getWalletClient = useCallback(() => {
    if (!provider || !address) {
      throw new Error('钱包未连接');
    }
    
    return createWalletClient({
      chain,
      transport: custom(provider),
      account: address as Address
    });
  }, [provider, address,chain,publicClient]);

  // 获取质押余额
  const fetchStakedAmount = useCallback(async (): Promise<void> => {
    if (!isConnected || !address) return;
    
    try {
      console.log('🔍 获取质押余额...');
      const result = await publicClient.readContract({
        address: PROXY_CONTRACT_ADDRESS,
        abi: implementationABI.abi,
        functionName: 'stakingBalance',
        args: [BigInt(poolId), address as Address]
      }) as bigint;
      
      const formatted = formatEther(result);
      setStakedAmount(formatted);
      console.log('✅ 质押余额:', formatted, 'ETH');
    } catch (err) {
      setStakedAmount('0');
      console.error('❌ 获取质押余额失败:', err);
    }
  }, [address, isConnected, poolId,publicClient]);

  // 获取待领取奖励
  const fetchPendingRewards = useCallback(async (): Promise<void> => {
    if (!isConnected || !address) return;
    
    try {
      console.log('🔍 获取待领取奖励...');
      const result = await publicClient.readContract({
        address: PROXY_CONTRACT_ADDRESS,
        abi: implementationABI.abi,
        functionName: 'pendingMetaNode',
        args: [BigInt(poolId), address as Address]
      }) as bigint;
      
      const formatted = formatEther(result);
      setPendingRewards(formatted);
      console.log('✅ 待领取奖励:', formatted, 'MetaNode');
    } catch (err) {
      setPendingRewards('0');

      console.error('❌ 获取奖励失败:', err);
    }
  }, [address, isConnected, poolId,publicClient]);

  // 获取总质押量
  const fetchTotalStaked = useCallback(async (): Promise<void> => {
    try {
      console.log('🔍 获取总质押量...');
      const result = await publicClient.readContract({
  address: PROXY_CONTRACT_ADDRESS,
  abi: implementationABI.abi,
  functionName: 'pool',
  args: [BigInt(poolId)]
}) as [string, bigint, bigint, bigint, bigint, bigint, bigint];

      
      const formatted = formatEther(result[4]); // stTokenAmount
      setTotalStaked(formatted);
      console.log('✅ 总质押量:', formatted, 'ETH');
    } catch (err) {
      console.error('❌ 获取总质押量失败:', err);
      setTotalStaked('0');
    }
  }, [poolId,publicClient]);

  // 获取最小质押金额和锁定区块数
  const fetchPoolInfo = useCallback(async (): Promise<void> => {
    try {
      console.log('🔍 获取池子信息...');
      
      const result = await publicClient.readContract({
        address: PROXY_CONTRACT_ADDRESS,
        abi: implementationABI.abi,
        functionName: 'pool',
        args: [BigInt(poolId)]
      })  as [string, bigint, bigint, bigint, bigint, bigint, bigint];
      
      const minAmount = formatEther(result[5]); // minDepositAmount
      const lockedBlocks = Number(result[6]); // unstakeLockedBlocks
      
      setMinStakeAmount(minAmount);
      setUnstakeLockedBlocks(lockedBlocks);
      
      console.log('✅ 最小质押金额:', minAmount, 'ETH');
      console.log('✅ 解质押锁定区块数:', lockedBlocks);
    } catch (err) {
      console.error('❌ 获取池子信息失败:', err);
      setMinStakeAmount('0');
      setUnstakeLockedBlocks(0);
    }
  }, [poolId,publicClient]);

  // 获取提取信息
  const fetchWithdrawInfo = useCallback(async (): Promise<void> => {
    if (!isConnected || !address) return;
    
    try {
      console.log('🔍 获取提取信息...');
      
      // 获取提取金额信息
      const withdrawResult = await publicClient.readContract({
        address: PROXY_CONTRACT_ADDRESS,
        abi: implementationABI.abi,
        functionName: 'withdrawAmount',
        args: [BigInt(poolId), address as Address]
      }) as [bigint, bigint, bigint, bigint, bigint, bigint, bigint];
      
      const requestAmountFormatted = formatEther(withdrawResult[0]);
      const pendingWithdrawAmountFormatted = formatEther(withdrawResult[1]);
      
      setRequestAmount(requestAmountFormatted);
      setPendingWithdrawAmount(pendingWithdrawAmountFormatted);
      
      // 获取提取暂停状态
      const pausedResult = await publicClient.readContract({
        address: PROXY_CONTRACT_ADDRESS,
        abi: implementationABI.abi,
        functionName: 'withdrawPaused'
      }) as boolean;
      
      setWithdrawPaused(pausedResult);
      
      console.log('✅ 请求提取金额:', requestAmountFormatted, 'ETH');
      console.log('✅ 待提取金额:', pendingWithdrawAmountFormatted, 'ETH');
      console.log('✅ 提取暂停状态:', pausedResult);
      
    } catch (err) {
      console.error('❌ 获取提取信息失败:', err);
      setRequestAmount('0');
      setPendingWithdrawAmount('0');
      setWithdrawPaused(false);
    }
  }, [address, isConnected, poolId,publicClient]);

  // 🔧 获取冷却信息 - 移除对 refreshData 的依赖
 // 🔧 获取冷却信息 - 添加详细调试
const fetchCooldownInfo = useCallback(async (): Promise<void> => {
  if (!isConnected || !address) {
    setCooldownInfo({
      unstakeTime: 0,
      unlockTime: 0,
      remainingSeconds: 0,
      remainingBlocks: 0,
      isReady: false,
      currentBlock: 0
    });
    return;
  }
  
  try {
    console.log('🔍 获取冷却信息...');
    
    // 获取当前区块号
    const currentBlock = await publicClient.getBlockNumber();
    const currentBlockNum = Number(currentBlock);
    
    // 🔧 添加当前区块验证
    console.log('📦 当前区块号:', currentBlockNum);
    console.log('📦 当前区块类型:', typeof currentBlockNum);
    console.log('📦 unstakeLockedBlocks:', unstakeLockedBlocks);
    console.log('📦 unstakeLockedBlocks类型:', typeof unstakeLockedBlocks);
    
    let unstakeBlock = 0;
    let unstakeTimestamp = 0;
    
    // 方法1: 优先从本地存储获取
    const localData = unstakeStorageUtils.get(address, poolId);
    if (localData && localData.block > 0) {
      unstakeBlock = localData.block;
      unstakeTimestamp = localData.timestamp || 0;
      
      // 🔧 添加本地数据验证
      console.log('✅ 从本地存储获取解质押数据:', { 
        unstakeBlock, 
        unstakeTimestamp,
        blockType: typeof unstakeBlock,
        timestampType: typeof unstakeTimestamp
      });
      
      // 🔧 验证数据合理性
      if (unstakeBlock > currentBlockNum + 1000000) {
        console.error('❌ 检测到异常的本地解质押区块号:', unstakeBlock);
        console.error('❌ 当前区块号:', currentBlockNum);
        console.error('❌ 清除异常的本地数据');
        unstakeStorageUtils.remove(address, poolId);
        unstakeBlock = 0;
        unstakeTimestamp = 0;
      }
    }
    
    // 方法2: 如果本地没有数据，从事件日志获取
    if (unstakeBlock === 0) {
      try {
        console.log('📝 本地无数据，从事件日志获取...');
        
        const requestUnstakeEventAbi = {
          type: 'event' as const,
          name: 'RequestUnstake',
          inputs: [
            { name: 'user', type: 'address', indexed: true },
            { name: 'poolId', type: 'uint256', indexed: true },
            { name: 'amount', type: 'uint256', indexed: false }
          ]
        };
        
        // 使用分批查询获取事件日志
        const fromBlock = BigInt(Math.max(0, currentBlockNum - 50000));
        
        const logs = await queryLogsInBatches(
          publicClient,
          PROXY_CONTRACT_ADDRESS,
          requestUnstakeEventAbi,
          {
            user: address as Address,
            poolId: BigInt(poolId)
          },
          fromBlock,
          'latest',
          2000
        );
        
        if (logs.length > 0) {
          const latestLog = logs[logs.length - 1];
          unstakeBlock = Number(latestLog.blockNumber);
          
          // 🔧 添加事件日志数据验证
          console.log('📝 事件日志原始数据:', {
            blockNumber: latestLog.blockNumber,
            blockNumberType: typeof latestLog.blockNumber,
            blockNumberString: latestLog.blockNumber.toString()
          });
          
          // 🔧 验证区块号合理性
          if (unstakeBlock > currentBlockNum + 1000000 || unstakeBlock < 0) {
            console.error('❌ 检测到异常的事件日志区块号:', unstakeBlock);
            console.error('❌ 当前区块号:', currentBlockNum);
            unstakeBlock = 0;
          } else {
            // 获取区块时间戳
            const blockData = await publicClient.getBlock({
              blockNumber: BigInt(unstakeBlock)
            }) as Block;
            unstakeTimestamp = Number(blockData.timestamp);
            
            console.log('✅ 从RequestUnstake事件日志获取解质押区块:', unstakeBlock);
            console.log('✅ 解质押时间戳:', unstakeTimestamp);
            
            // 保存到本地存储
            const unstakeData: UnstakeStorageData = {
              block: unstakeBlock,
              timestamp: unstakeTimestamp,
              amount: formatEther(latestLog.args.amount),
              hash: latestLog.transactionHash
            };
            unstakeStorageUtils.save(address, poolId, unstakeData);
          }
        } else {
          console.log('📝 没有找到RequestUnstake事件日志');
        }
      } catch (eventError) {
        console.log('❌ 获取RequestUnstake事件日志失败:', eventError);
      }
    }
    
    // 计算冷却信息
    if (unstakeBlock > 0 && unstakeLockedBlocks > 0) {
      const unlockBlock = unstakeBlock + unstakeLockedBlocks;
      const remainingBlocks = Math.max(0, unlockBlock - currentBlockNum);
      
      // 🔧 添加计算过程调试
      console.log('🧮 冷却计算过程:', {
        unstakeBlock,
        unstakeLockedBlocks,
        currentBlockNum,
        unlockBlock,
        remainingBlocks,
        '计算公式': `${unstakeBlock} + ${unstakeLockedBlocks} - ${currentBlockNum} = ${remainingBlocks}`
      });
      
      // 🔧 添加异常检测
      if (remainingBlocks > 1000000) {
        console.error('❌ 检测到异常的剩余区块数:', remainingBlocks);
        console.error('❌ 强制重置为安全状态');
        
        // 清除可能有问题的本地数据
        unstakeStorageUtils.remove(address, poolId);
        
        setCooldownInfo({
          unstakeTime: 0,
          unlockTime: 0,
          remainingSeconds: 0,
          remainingBlocks: 0,
          isReady: true,
          currentBlock: currentBlockNum
        });
        return;
      }
      
      // 估算剩余时间（Sepolia 测试网约12秒一个区块）
      const blockTime = 12;
      const remainingSeconds = remainingBlocks * blockTime;
      
      // 计算解锁时间戳
      let unlockTimestamp = 0;
      if (unstakeTimestamp > 0) {
        unlockTimestamp = unstakeTimestamp + (unstakeLockedBlocks * blockTime);
      }
      
      const newCooldownInfo: CooldownInfo = {
        unstakeTime: unstakeTimestamp,
        unlockTime: unlockTimestamp,
        remainingSeconds,
        remainingBlocks,
        isReady: remainingBlocks === 0,
        currentBlock: currentBlockNum
      };
      
      setCooldownInfo(newCooldownInfo);
      
      console.log('✅ 冷却信息更新:', {
        unstakeBlock,
        currentBlock: currentBlockNum,
        unlockBlock,
        remainingBlocks,
        remainingSeconds,
        isReady: remainingBlocks === 0,
        unstakeTimestamp,
        unlockTimestamp
      });
    } else {
      // 没有解质押记录或锁定区块数为0
      setCooldownInfo({
        unstakeTime: 0,
        unlockTime: 0,
        remainingSeconds: 0,
        remainingBlocks: 0,
        isReady: true,
        currentBlock: currentBlockNum
      });
      
      console.log('✅ 没有冷却限制或已解锁');
    }
    
  } catch (err) {
    console.error('❌ 获取冷却信息失败:', err);
    setCooldownInfo({
      unstakeTime: 0,
      unlockTime: 0,
      remainingSeconds: 0,
      remainingBlocks: 0,
      isReady: false,
      currentBlock: 0
    });
  }
}, [address, isConnected, poolId, unstakeLockedBlocks,publicClient]);
 
  // 🔧 刷新数据方法 - 现在可以安全地使用所有 fetch 函数
  const refreshData = useCallback(async (): Promise<void> => {
    if (!isConnected || !address) {
      console.log('⚠️ 钱包未连接，跳过数据刷新');
      return;
    }
    
    console.log('🔄 开始刷新所有数据...',chain.id,chain.name);
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchStakedAmount(),
        fetchPendingRewards(),
        fetchTotalStaked(),
        fetchPoolInfo(),
        fetchWithdrawInfo(),
        fetchCooldownInfo()
      ]);
      console.log('✅ 数据刷新完成');
    } catch (error) {
      console.error('❌ 刷新数据失败:', error);
      setError('刷新数据失败');
    } finally {
      setLoading(false);
    }
  }, [
    isConnected, 
    address, 
    chain.id,
    chain.name,
    fetchStakedAmount, 
    fetchPendingRewards, 
    fetchTotalStaked, 
    fetchPoolInfo,
    fetchWithdrawInfo,
    fetchCooldownInfo
  ]);

  // 质押ETH
  const stakeETH = useCallback(async (amount: string): Promise<TransactionResult> => {
    if (!isConnected || !address || !provider) {
      const errorMsg = '钱包未连接';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
    
    try {
      setLoading(true);
      setError(null);
      // console.log('🚀 开始质押:', amount, 'ETH');
      
      // 基础检查
      const amountNum = parseFloat(amount);
      const minStakeNum = parseFloat(minStakeAmount);
      const balanceNum = balance ? parseFloat(balance) : 0;
      
      if (amountNum < minStakeNum) {
        throw new Error(`最小质押金额为 ${minStakeAmount} ETH`);
      }
      
      if (balanceNum < amountNum) {
        throw new Error('余额不足');
      }
      
      const walletClient = getWalletClient();
      const valueInWei = parseEther(amount);
      
      // console.log('💰 质押金额 (Wei):', valueInWei.toString());
      // console.log('🏊 池子ID:', poolId);
      
      // 发送交易
      const hash = await walletClient.writeContract({
        address: PROXY_CONTRACT_ADDRESS,
        abi: implementationABI.abi,
        functionName: 'depositETH',
        args: [],
        value: valueInWei,
      });
      
      // console.log('📝 交易哈希:', hash);
      
      // 等待确认
      // console.log('⏳ 等待交易确认...');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      // console.log('✅ 交易确认:', receipt.status);
      
      // 刷新数据
      console.log('🔄 刷新数据...');
      await refreshData();
      
      return { hash, receipt };
      
    } catch (err) {
      console.error('❌ 质押失败:', err);
      const errorMsg = err instanceof Error ? err.message : '质押失败';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [
    address, 
    isConnected, 
    provider, 
    balance, 
    poolId, 
    minStakeAmount, 
    getWalletClient,
    refreshData // 现在可以安全使用
  ]);

  // 🔧 请求解质押方法 - 现在可以安全使用 refreshData 和 fetchCooldownInfo
  const requestUnstake = useCallback(async (amount: string): Promise<TransactionResult> => {
    if (!isConnected || !address || !provider) {
      const errorMsg = '钱包未连接';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
    
    try {
      setLoading(true);
      setError(null);
      console.log('🚀 开始请求解质押:', amount, 'ETH');
      
      // 基础检查
      const amountNum = parseFloat(amount);
      const stakedNum = parseFloat(stakedAmount);
      
      if (amountNum <= 0) {
        throw new Error('解质押金额必须大于0');
      }
      
      if (amountNum > stakedNum) {
        throw new Error('解质押金额不能超过已质押金额');
      }
      
      const walletClient = getWalletClient();
      const amountInWei = parseEther(amount);
      
      console.log('💰 解质押金额 (Wei):', amountInWei.toString());
      console.log('🏊 池子ID:', poolId);
      console.log('🔒 锁定区块数:', unstakeLockedBlocks);
      
      // 发送交易
      const hash = await walletClient.writeContract({
        address: PROXY_CONTRACT_ADDRESS,
        abi: implementationABI.abi,
        functionName: 'unstake',
        args: [BigInt(poolId), amountInWei],
      });
      
      console.log('📝 交易哈希:', hash);
      
      // 等待确认
      console.log('⏳ 等待交易确认...');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('✅ 交易确认:', receipt.status);
      
      // 保存解质押数据到本地存储
      const unstakeBlock = Number(receipt.blockNumber);
      const blockData = await publicClient.getBlock({
        blockNumber: receipt.blockNumber
      }) as Block;
      const unstakeTimestamp = Number(blockData.timestamp);
      
      const unstakeData: UnstakeStorageData = {
        block: unstakeBlock,
        timestamp: unstakeTimestamp,
        amount: amount,
        hash: hash
      };
      
      unstakeStorageUtils.save(address, poolId, unstakeData);
      console.log('💾 已保存解质押数据到本地存储:', unstakeData);
      
      // 刷新数据
      console.log('🔄 刷新数据...');
      await Promise.all([
        refreshData(),
        fetchCooldownInfo()
      ]);
      
      return { hash, receipt };
      
    } catch (err) {
      console.error('❌ 请求解质押失败:', err);
      const errorMsg = err instanceof Error ? err.message : '请求解质押失败';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [
    address, 
    isConnected, 
    provider, 
    poolId, 
    stakedAmount,
    unstakeLockedBlocks,
    getWalletClient,
    refreshData,
    fetchCooldownInfo
  ]);

  // 🔧 提取ETH方法 - 现在可以安全使用 refreshData 和 fetchCooldownInfo
  const withdrawETH = useCallback(async (): Promise<TransactionResult> => {
    if (!isConnected || !address || !provider) {
      const errorMsg = '钱包未连接';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
    
    try {
      setLoading(true);
      setError(null);
      console.log('🚀 开始提取ETH');
      
      // 基础检查
      const pendingWithdrawNum = parseFloat(pendingWithdrawAmount);
      
      if (pendingWithdrawNum <= 0) {
        throw new Error('没有可提取的ETH');
      }
      
      if (withdrawPaused) {
        throw new Error('提取功能已暂停');
      }
      
      // 检查冷却时间
      if (!cooldownInfo.isReady && cooldownInfo.remainingBlocks > 0) {
        throw new Error(`还需要等待 ${cooldownInfo.remainingBlocks} 个区块才能提取`);
      }
      
      const walletClient = getWalletClient();
      
      console.log('🏊 池子ID:', poolId);
      console.log('💰 可提取金额:', pendingWithdrawAmount, 'ETH');
      
      // 发送交易
      const hash = await walletClient.writeContract({
        address: PROXY_CONTRACT_ADDRESS,
        abi: implementationABI.abi,
        functionName: 'withdraw',
        args: [BigInt(poolId)],
      });
      
      console.log('📝 交易哈希:', hash);
      
      // 等待确认
      console.log('⏳ 等待交易确认...');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('✅ 交易确认:', receipt.status);
      
      // 清除本地存储的解质押记录
      unstakeStorageUtils.remove(address, poolId);
      console.log('🗑️ 已清除本地解质押数据');
      
      // 刷新数据
      console.log('🔄 刷新数据...');
      await Promise.all([
        refreshData(),
        fetchCooldownInfo()
      ]);
      
      return { hash, receipt };
      
    } catch (err) {
      console.error('❌ 提取ETH失败:', err);
      const errorMsg = err instanceof Error ? err.message : '提取ETH失败';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [
    address, 
    isConnected, 
    provider, 
    poolId, 
    pendingWithdrawAmount,
    withdrawPaused,
    cooldownInfo,
    getWalletClient,
    refreshData,
    fetchCooldownInfo,
    publicClient
  ]);

  // 领取奖励
  const claimRewards = useCallback(async (): Promise<TransactionResult> => {
    if (!isConnected || !address || !provider) {
      const errorMsg = '钱包未连接';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
    
    try {
      setLoading(true);
      setError(null);
      console.log('🚀 开始领取奖励');
      
      const pendingNum = parseFloat(pendingRewards);
      if (pendingNum <= 0) {
        throw new Error('没有可领取的奖励');
      }
      
      const walletClient = getWalletClient();
      
      console.log('🏊 池子ID:', poolId);
      console.log('🎁 奖励金额:', pendingRewards, 'MetaNode');
      
      const hash = await walletClient.writeContract({
        address: PROXY_CONTRACT_ADDRESS,
        abi: implementationABI.abi,
        functionName: 'claim',
        args: [BigInt(poolId)],
      });
      
      console.log('📝 交易哈希:', hash);
      
      console.log('⏳ 等待交易确认...');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('✅ 交易确认:', receipt.status);
      
      // 刷新奖励数据
      await fetchPendingRewards();
      
      return { hash, receipt };
      
    } catch (err) {
      console.error('❌ 领取奖励失败:', err);
      const errorMsg = err instanceof Error ? err.message : '领取奖励失败';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [
    address, 
    isConnected, 
    provider, 
    poolId, 
    pendingRewards, 
    getWalletClient, 
    fetchPendingRewards,
    publicClient
  ]);

  // 调试函数
  const debugContract = useCallback(async (): Promise<void> => {
    try {
      console.log('=== 🔍 合约调试信息 ===');
      console.log('合约地址:', PROXY_CONTRACT_ADDRESS);
      console.log('网络:', chain.name);
      console.log('当前池子:', poolId);
      console.log('用户地址:', address);
      console.log('连接状态:', isConnected);
      console.log('质押余额:', stakedAmount, 'ETH');
      console.log('待领取奖励:', pendingRewards, 'MetaNode');
      console.log('总质押量:', totalStaked, 'ETH');
      console.log('最小质押金额:', minStakeAmount, 'ETH');
      console.log('解质押锁定区块数:', unstakeLockedBlocks);
      console.log('请求提取金额:', requestAmount, 'ETH');
      console.log('待提取金额:', pendingWithdrawAmount, 'ETH');
      console.log('提取暂停状态:', withdrawPaused);
      console.log('钱包余额:', balance, 'ETH');
      console.log('冷却信息:', cooldownInfo);
      
      // 获取当前区块
      const currentBlock = await publicClient.getBlockNumber();
      console.log('当前区块:', currentBlock.toString());
      
      // 获取每区块奖励
      try {
        const metaNodePerBlock = await publicClient.readContract({
          address: PROXY_CONTRACT_ADDRESS,
          abi: implementationABI.abi,
          functionName: 'MetaNodePerBlock',
        }) as bigint;
        console.log('每区块奖励:', formatEther(metaNodePerBlock), 'MetaNode');
      } catch (err) {
        console.log('获取每区块奖励失败:', err);
      }
      
      // 获取池子信息
      try {
        const poolInfo = await publicClient.readContract({
          address: PROXY_CONTRACT_ADDRESS,
          abi: implementationABI.abi,
          functionName: 'pool',
          args: [BigInt(poolId)]
        })  as [string, bigint, bigint, bigint, bigint, bigint, bigint];
        console.log('池子信息:', poolInfo);
      } catch (err) {
        console.log('获取池子信息失败:', err);
      }
      
      // 检查本地存储的解质押数据
      if (address) {
        const localData = unstakeStorageUtils.get(address, poolId);
        if (localData) {
          console.log('本地解质押数据:', localData);
        } else {
          console.log('没有本地解质押数据');
        }
        
        // 显示所有解质押数据
        const allData = unstakeStorageUtils.getAll(address);
        if (allData.length > 0) {
          console.log('所有解质押数据:', allData);
        }
      }
      
      console.log('=== 🔍 调试信息结束 ===');
      
    } catch (err) {
      console.error('❌ 调试失败:', err);
    }
  }, [
    poolId, 
    address, 
    isConnected, 
    stakedAmount, 
    pendingRewards, 
    totalStaked, 
    minStakeAmount,
    unstakeLockedBlocks,
    requestAmount,
    pendingWithdrawAmount,
    withdrawPaused,
    balance,
    cooldownInfo,
    chain.name,
    publicClient
  ]);

  // 冷却相关工具方法
  const clearLocalUnstakeData = useCallback((): void => {
    if (address) {
      unstakeStorageUtils.remove(address, poolId);
      console.log('🗑️ 已清除本地解质押数据');
      // 重新获取冷却信息
      fetchCooldownInfo();
    }
  }, [address, poolId, fetchCooldownInfo]);

  const setManualUnstakeData = useCallback((blockNumber: number, timestamp?: number): void => {
    

    if (address) {
      const unstakeData: UnstakeStorageData = {
        block: blockNumber,
        timestamp: timestamp || Math.floor(Date.now() / 1000),
        amount: '0',
        hash: 'manual'
      };
      unstakeStorageUtils.save(address, poolId, unstakeData);
      console.log('📝 手动设置解质押数据:', unstakeData);
      // 重新获取冷却信息
      fetchCooldownInfo();
    }
  }, [address, poolId, fetchCooldownInfo]);

  const clearAllUnstakeData = useCallback((): void => {
    if (address) {
      unstakeStorageUtils.clearAll(address);
      console.log('🗑️ 已清除所有解质押数据');
      // 重新获取冷却信息
      fetchCooldownInfo();
    }
  }, [address, fetchCooldownInfo]);

  // 初始化数据
  useEffect(() => {
    if (isConnected && address) {
      console.log('🚀 初始化合约数据...');
      refreshData();
    } else {
      console.log('⚠️ 钱包未连接，重置数据');
      setStakedAmount('0');
      setPendingRewards('0');
      setTotalStaked('0');
      setMinStakeAmount('0');
      setUnstakeLockedBlocks(0);
      setRequestAmount('0');
      setPendingWithdrawAmount('0');
      setWithdrawPaused(false);
      setCooldownInfo({
        unstakeTime: 0,
        unlockTime: 0,
        remainingSeconds: 0,
        remainingBlocks: 0,
        isReady: false,
        currentBlock: 0
      });
      setError(null);
    }
  }, [isConnected, address, poolId, refreshData]);

  // 定时刷新奖励（每30秒）
  useEffect(() => {
    if (!isConnected || !address) return;
    
    console.log('⏰ 启动定时刷新奖励');
    const interval = setInterval(() => {
      console.log('⏰ 定时刷新奖励...');
      fetchPendingRewards();
    }, 30000);
    
    return () => {
      console.log('⏰ 停止定时刷新');
      clearInterval(interval);
    };
  }, [isConnected, address, fetchPendingRewards]);

  // 定时更新冷却信息
  useEffect(() => {
    if (!isConnected || !address || cooldownInfo.remainingSeconds <= 0) return;
    
    console.log('⏰ 启动冷却信息定时更新');
    const interval = setInterval(() => {
      console.log('⏰ 更新冷却信息...');
      fetchCooldownInfo();
    }, 10000); // 每10秒更新一次
    
    return () => {
      console.log('⏰ 停止冷却信息定时更新');
      clearInterval(interval);
    };
  }, [isConnected, address, cooldownInfo.remainingSeconds, fetchCooldownInfo]);

  // 监听区块变化
  // 监听区块变化
useEffect(() => {
  if (!isConnected || !address || cooldownInfo.remainingBlocks <= 0) return;
  
  console.log('👂 开始监听区块变化');
  
  const unwatch = publicClient.watchBlockNumber({
    onBlockNumber: (blockNumber: bigint) => {
      console.log('📦 新区块:', blockNumber);
      // 更新冷却信息中的当前区块和剩余区块
      setCooldownInfo(prev => {
        if (prev.remainingBlocks <= 0) return prev;
        
        const newCurrentBlock = Number(blockNumber);
        
        // 🔧 修复：从本地存储获取正确的解质押区块号
        const localData = unstakeStorageUtils.get(address, poolId);
        if (!localData || !localData.block) {
          console.log('⚠️ 没有本地解质押数据，停止区块监听更新');
          return prev;
        }
        
        const unstakeBlock = localData.block;
        const unlockBlock = unstakeBlock + unstakeLockedBlocks;
        const newRemainingBlocks = Math.max(0, unlockBlock - newCurrentBlock);
        const newRemainingSeconds = newRemainingBlocks * 12;
        
        // 🔧 添加数据验证
        if (newRemainingBlocks > 1000000) {
          console.error('❌ 区块监听中检测到异常数据，清除本地存储');
          unstakeStorageUtils.remove(address, poolId);
          return {
            ...prev,
            remainingBlocks: 0,
            remainingSeconds: 0,
            isReady: true,
            currentBlock: newCurrentBlock
          };
        }
        
        // console.log('📦 区块更新:', {
        //   unstakeBlock,
        //   currentBlock: newCurrentBlock,
        //   unlockBlock,
        //   remainingBlocks: newRemainingBlocks
        // });
        
        return {
          ...prev,
          currentBlock: newCurrentBlock,
          remainingBlocks: newRemainingBlocks,
          remainingSeconds: newRemainingSeconds,
          isReady: newRemainingBlocks === 0
        };
      });
    },
    onError: (error: Error) => {
      console.error('❌ 监听区块失败:', error);
    }
  });
  
  return () => {
    console.log('👂 停止监听区块变化');
    unwatch();
  };
}, [isConnected, address, cooldownInfo.remainingBlocks, unstakeLockedBlocks, poolId,publicClient]);

console.log("chain====chain====",chain)
  return {
    // 状态数据
    stakedAmount,
    pendingRewards,
    totalStaked,
    minStakeAmount,
    loading,
    error,
    poolId,
    
    // 提取相关状态
    requestAmount,
    pendingWithdrawAmount,
    unstakeLockedBlocks,
    withdrawPaused,
    
    // 冷却相关状态
    cooldownInfo,
    
    // 操作方法
    stakeETH,
    claimRewards,
    refreshData,
    setPoolId,
    
    // 提取操作方法
    requestUnstake,
    withdrawETH,
    
    // 冷却相关方法
    fetchCooldownInfo,
    clearLocalUnstakeData,
    setManualUnstakeData,
    clearAllUnstakeData,
    
    // 调试方法
    debugContract,
    
    // 合约信息
    contractAddress: PROXY_CONTRACT_ADDRESS,
    networkName: chain.name,
    poolCount: 1,
    maxStakeAmount: "1000",
    // 账户信息
    balance,
    chain,
    publicClient

  };
};

// 🆕 冷却计时器 Hook
export const useCooldownTimer = (initialSeconds: number, onComplete?: () => void): number => {
  const [timeLeft, setTimeLeft] = useState<number>(initialSeconds);

  useEffect(() => {
    setTimeLeft(initialSeconds);
    
    if (initialSeconds <= 0) {
      if (onComplete) onComplete();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = Math.max(0, prev - 1);
        if (newTime === 0 && onComplete) {
          console.log('⏰ 冷却时间结束');
          onComplete();
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [initialSeconds, onComplete]);

  return timeLeft;
};

// 🆕 格式化时间显示工具函数
export const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return 'Ready!';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

// 🆕 格式化区块显示工具函数
export const formatBlocksRemaining = (blocks: number): string => {
  if (blocks <= 0) return 'Ready!';
  
  if (blocks > 1000) {
    return `${(blocks / 1000).toFixed(1)}k blocks`;
  }
  return `${blocks} blocks`;
};

// 🆕 估算时间工具函数
export const estimateTimeFromBlocks = (blocks: number, blockTime: number = 12): string => {
  const seconds = blocks * blockTime;
  return formatTimeRemaining(seconds);
};






export { unstakeStorageUtils };

