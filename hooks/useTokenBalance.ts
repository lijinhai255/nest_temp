"use client";

import { useState, useEffect } from 'react';
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

export function useTokenBalance(tokenAddress?: Address) {
  const { address: userAddress, isConnected } = useWallet();
  const publicClient = usePublicClient();
  
  const [balance, setBalance] = useState("0");
  const [symbol, setSymbol] = useState("");
  const [decimals, setDecimals] = useState(18);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    let isMounted = true;
    
    const fetchBalance = async () => {
      if (!tokenAddress || !userAddress || !isConnected || !publicClient) {
        setBalance("0");
        setError(isConnected ? null : "钱包未连接");
        return;
      }
      
      setIsLoading(true);
      
      try {
        // 并行获取代币信息
        const [balanceResult, decimalsResult, symbolResult] = await Promise.all([
          // 获取余额
          publicClient.readContract({
            address: tokenAddress,
            abi: erc20ABI,
            functionName: "balanceOf",
            args: [userAddress as `0x${string}`]
          }),
          // 获取小数位数
          publicClient.readContract({
            address: tokenAddress,
            abi: erc20ABI,
            functionName: "decimals"
          }),
          // 获取代币符号
          publicClient.readContract({
            address: tokenAddress,
            abi: erc20ABI,
            functionName: "symbol"
          })
        ]);
        
        // 格式化余额
        const decimalsValue = Number(decimalsResult);
        const formattedBalance = formatUnits(balanceResult as bigint, decimalsValue);
        const symbolValue = symbolResult as string;
        
        if (isMounted) {
          setBalance(formattedBalance);
          setSymbol(symbolValue);
          setDecimals(decimalsValue);
          setError(null);
        }
      } catch (err) {
        console.error(`获取代币 ${tokenAddress} 余额失败:`, err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "获取余额失败");
          setBalance("0");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchBalance();
    
    // 设置定时刷新
    const intervalId = setInterval(fetchBalance, 30000); // 每30秒刷新一次
    
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [tokenAddress, userAddress, isConnected, publicClient]);
  
  // 手动刷新方法
  const refetch = async () => {
    if (!tokenAddress || !userAddress || !isConnected || !publicClient) return;
    
    setIsLoading(true);
    
    try {
      // 并行获取代币信息
      const [balanceResult, decimalsResult, symbolResult] = await Promise.all([
        // 获取余额
        publicClient.readContract({
          address: tokenAddress,
          abi: erc20ABI,
          functionName: "balanceOf",
          args: [userAddress as `0x${string}`]
        }),
        // 获取小数位数
        publicClient.readContract({
          address: tokenAddress,
          abi: erc20ABI,
          functionName: "decimals"
        }),
        // 获取代币符号
        publicClient.readContract({
          address: tokenAddress,
          abi: erc20ABI,
          functionName: "symbol"
        })
      ]);
      
      // 格式化余额
      const decimalsValue = Number(decimalsResult);
      const formattedBalance = formatUnits(balanceResult as bigint, decimalsValue);
      const symbolValue = symbolResult as string;
      
      setBalance(formattedBalance);
      setSymbol(symbolValue);
      setDecimals(decimalsValue);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取余额失败");
      setBalance("0");
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    balance,
    symbol,
    decimals,
    isLoading,
    error,
    refetch
  };
}