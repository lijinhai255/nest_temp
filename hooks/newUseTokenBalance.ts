// hooks/useTokenBalance.ts
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Address, formatUnits } from 'viem';
import { usePublicClient } from 'wagmi';
import { useWallet } from '@/provider';

// ERC20 代币 ABI
const erc20ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  }
] as const;

// 原生代币地址常量 - 修复这里！
const NATIVE_TOKEN_ADDRESSES = [
  "0x0000000000000000000000000000000000000000",
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // 添加这个地址
] as const;

// 检查是否为原生代币的函数
const isNativeToken = (address: string): boolean => {
  const normalizedAddress = address.toLowerCase();
  return NATIVE_TOKEN_ADDRESSES.some(
    nativeAddr => nativeAddr.toLowerCase() === normalizedAddress
  );
};

// 批量余额查询结果类型
export interface TokenBalanceInfo {
  balance: string;
  symbol: string;
  decimals: number;
  isNative?: boolean;
  error?: string;
}

export function useTokenBalance(tokenAddresses: Address[]) {
  const { address: userAddress, isConnected } = useWallet();
  const publicClient = usePublicClient();
  
  const [balances, setBalances] = useState<Map<Address, TokenBalanceInfo>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 去重并过滤有效地址
  const uniqueAddresses = useMemo(() => {
    return Array.from(new Set(tokenAddresses.filter(addr => addr && addr.length === 42)));
  }, [tokenAddresses]);

  // 批量获取代币信息的函数
  const fetchTokenBalances = useCallback(async () => {
    if (!userAddress || !isConnected || !publicClient || uniqueAddresses.length === 0) {
      console.log("🚫 跳过余额查询:", {
        userAddress: !!userAddress,
        isConnected,
        publicClient: !!publicClient,
        addressCount: uniqueAddresses.length
      });
      
      if (!isConnected) {
        setError("钱包未连接");
      }
      return;
    }

    console.log("🔄 开始批量获取代币余额...", {
      用户地址: userAddress,
      代币数量: uniqueAddresses.length,
      代币地址: uniqueAddresses.map(addr => ({
        地址: `${addr.substring(0, 8)}...`,
        是否原生: isNativeToken(addr)
      }))
    });

    setIsLoading(true);
    setError(null);

    try {
      const newBalances = new Map<Address, TokenBalanceInfo>();

      // 分批处理，避免一次性查询太多
      const batchSize = 10;
      const batches = [];
      
      for (let i = 0; i < uniqueAddresses.length; i += batchSize) {
        batches.push(uniqueAddresses.slice(i, i + batchSize));
      }

      console.log(`📦 分为 ${batches.length} 批次处理，每批 ${batchSize} 个代币`);

      // 处理每个批次
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`🔄 处理第 ${batchIndex + 1}/${batches.length} 批次...`);

        // 并行处理当前批次的所有代币
        const batchPromises = batch.map(async (tokenAddress) => {
          try {
            // 检查是否为原生代币 - 修复判断逻辑
            const isNative = isNativeToken(tokenAddress);
            
            console.log(`🔍 处理代币 ${tokenAddress}:`, { isNative });
            
            if (isNative) {
              // 获取原生代币余额
              console.log(`⟠ 获取原生代币余额: ${tokenAddress}`);
              const nativeBalance = await publicClient.getBalance({
                address: userAddress as `0x${string}`
              });
              
              return {
                address: tokenAddress,
                balanceInfo: {
                  balance: formatUnits(nativeBalance, 18),
                  symbol: "ETH", // 或根据网络设置
                  decimals: 18,
                  isNative: true
                }
              };
            } else {
              // 并行获取ERC20代币信息
              console.log(`🪙 获取ERC20代币信息: ${tokenAddress}`);
              const [balanceResult, decimalsResult, symbolResult] = await Promise.all([
                publicClient.readContract({
                  address: tokenAddress as `0x${string}`,
                  abi: erc20ABI,
                  functionName: "balanceOf",
                  args: [userAddress as `0x${string}`]
                }),
                publicClient.readContract({
                  address: tokenAddress as `0x${string}`,
                  abi: erc20ABI,
                  functionName: "decimals"
                }),
                publicClient.readContract({
                  address: tokenAddress as `0x${string}`,
                  abi: erc20ABI,
                  functionName: "symbol"
                })
              ]);

              const decimalsValue = Number(decimalsResult);
              const formattedBalance = formatUnits(balanceResult as bigint, decimalsValue);
              const symbolValue = symbolResult as string;

              return {
                address: tokenAddress,
                balanceInfo: {
                  balance: formattedBalance,
                  symbol: symbolValue,
                  decimals: decimalsValue,
                  isNative: false
                }
              };
            }
          } catch (err) {
            console.error(`❌ 获取代币 ${tokenAddress} 余额失败:`, err);
            return {
              address: tokenAddress,
              balanceInfo: {
                balance: "0",
                symbol: "Unknown",
                decimals: 18,
                isNative: false,
                error: err instanceof Error ? err.message : "获取余额失败"
              }
            };
          }
        });

        // 等待当前批次完成
        const batchResults = await Promise.all(batchPromises);
        
        // 更新结果
        batchResults.forEach(({ address, balanceInfo }) => {
          newBalances.set(address, balanceInfo);
        });

        console.log(`✅ 第 ${batchIndex + 1} 批次完成，成功获取 ${batchResults.length} 个代币余额`);

        // 批次间稍微延迟，避免请求过于频繁
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log("✅ 所有批次处理完成！");
      console.log("📊 余额统计:", {
        总代币数: newBalances.size,
        有余额代币: Array.from(newBalances.values()).filter(b => parseFloat(b.balance) > 0).length,
        错误数量: Array.from(newBalances.values()).filter(b => b.error).length,
        原生代币数量: Array.from(newBalances.values()).filter(b => b.isNative).length
      });

      setBalances(newBalances);
      setError(null);

    } catch (err) {
      console.error("❌ 批量获取余额失败:", err);
      setError(err instanceof Error ? err.message : "批量获取余额失败");
    } finally {
      setIsLoading(false);
    }
  }, [uniqueAddresses, userAddress, isConnected, publicClient]);

  // 自动获取余额
  useEffect(() => {
    fetchTokenBalances();
    
    // 设置定时刷新 - 每60秒刷新一次（批量查询频率可以低一些）
    const intervalId = setInterval(fetchTokenBalances, 60000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [fetchTokenBalances]);

  // 手动刷新方法
  const refetch = useCallback(() => {
    console.log("🔄 手动刷新代币余额...");
    fetchTokenBalances();
  }, [fetchTokenBalances]);

  // 获取单个代币余额的便捷方法
  const getBalance = useCallback((tokenAddress: Address): TokenBalanceInfo => {
    return balances.get(tokenAddress) || {
      balance: "0",
      symbol: "Unknown",
      decimals: 18,
      isNative: false
    };
  }, [balances]);

  // 获取有余额的代币列表
  const tokensWithBalance = useMemo(() => {
    return Array.from(balances.entries())
      .filter(([_, info]) => parseFloat(info.balance) > 0)
      .map(([address, info]) => ({ address, ...info }));
  }, [balances]);

  return {
    balances,
    isLoading,
    error,
    refetch,
    getBalance,
    tokensWithBalance,
    // 统计信息
    totalTokens: balances.size,
    tokensWithBalanceCount: tokensWithBalance.length,
    errorCount: Array.from(balances.values()).filter(b => b.error).length
  };
}
