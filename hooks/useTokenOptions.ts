// hooks/useTokenOptions.ts
import { useMemo, useEffect, useState } from 'react';
import { Address } from 'viem';
import { 
  getTokenInfo, 
  getFormattedAddress, 
  getTokenDisplayName,
  getTokenIcon,
  getTokenColor
} from '@/utils/tokenUtils';
import usePoolManagerWithClients from './usePoolManagerWithClients';
import { useTokenBalance } from './newUseTokenBalance'; // 改为使用批量查询

// 直接在文件中定义类型
export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  isNative: boolean;
  displayName: string;
  formattedAddress: string;
  icon: string;
  color: string;
  balance: string;
  usdValue: string;
  availablePairs: string[];
  totalLiquidity: string;
  poolCount: number;
}

export interface TokenOptionsResult {
  inTokens: Token[];
  outTokens: Token[];
  allTokens: Token[];
  isLoading: boolean;
  error: string | null;
  refetchBalances: () => void;
}

export const useTokenOptions = (): TokenOptionsResult => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 获取交易对数据
  const { pairs, fetchPairs, isLoading: pairsLoading } = usePoolManagerWithClients();
  
  console.log("🔄 useTokenOptions - 交易对数据:", pairs);
  console.log("📊 交易对数量:", pairs?.length || 0);
  console.log("🔄 数据加载状态:", pairsLoading);

  // 在组件挂载时获取交易对数据
  useEffect(() => {
    if (!pairs || pairs.length === 0) {
      console.log("🔄 开始获取交易对数据...");
      fetchPairs();
    }
  }, []); // 只在组件挂载时执行一次

  // 基础代币选项（不含余额）
  const baseTokenOptions = useMemo(() => {
    console.log("🚀 开始提取代币选项...");
    console.log("📊 当前交易对数据:", pairs);

    if (!pairs || pairs.length === 0) {
      console.warn("⚠️ 没有交易对数据");
      return [];
    }

    try {
      const tokenMap = new Map<string, Omit<Token, 'balance'>>();

      // 遍历所有交易对
      pairs.forEach((pair, index) => {
        // 生成交易对ID（基于token地址）
        const pairId = `${pair.token0}-${pair.token1}`;
        
        console.log(`🔍 处理交易对 ${index + 1}/${pairs.length}:`, {
          pairId,
          token0: pair.token0,
          token1: pair.token1
        });
        
        if (!pair.token0 || !pair.token1) {
          console.warn(`⚠️ 交易对 ${pairId} 代币地址不完整，跳过`);
          return;
        }

        // 处理 token0 和 token1
        [pair.token0, pair.token1].forEach(tokenAddress => {
          processBaseToken(tokenMap, {
            address: tokenAddress,
            pairId: pairId
          });
        });
      });

      // 转换为数组并排序
      const baseTokens = Array.from(tokenMap.values()).sort(baseTokenSorter);

      console.log("✅ 基础代币提取完成！");
      console.log(`📈 统计结果: ${baseTokens.length} 个唯一代币`);
      
      return baseTokens;

    } catch (err) {
      console.error("❌ 提取代币选项时出错:", err);
      setError(err instanceof Error ? err.message : '未知错误');
      return [];
    }
  }, [pairs]);

  // 提取所有代币地址
  const tokenAddresses = useMemo(() => {
    return baseTokenOptions.map(token => token.address as Address);
  }, [baseTokenOptions]);

  // 使用 useTokenBalance 获取所有代币余额
  const { 
    balances, 
    isLoading: balancesLoading, 
    refetch: refetchBalances,
    getBalance 
  } = useTokenBalance(tokenAddresses);

  // 合并基础代币信息和余额信息
  const tokensWithBalances = useMemo((): Token[] => {
    console.log("💰 合并代币余额信息...");
    console.log("📊 余额数据:", balances);

    return baseTokenOptions.map(baseToken => {
      const balanceInfo = getBalance(baseToken.address as Address);
      
      const tokenWithBalance: Token = {
        ...baseToken,
        balance: balanceInfo.balance,
        // 如果余额服务返回了更准确的 symbol 和 decimals，使用它们
        symbol: balanceInfo.symbol !== "Unknown" ? balanceInfo.symbol : baseToken.symbol,
        decimals: balanceInfo.decimals || baseToken.decimals
      };

      return tokenWithBalance;
    }).sort(tokenSorter); // 重新排序，考虑余额
  }, [baseTokenOptions, balances, getBalance]);

  // 更新加载状态
  useEffect(() => {
    const loading = pairsLoading || balancesLoading || (!pairs || pairs.length === 0);
    setIsLoading(loading);
    
    if (!loading) {
      setError(null);
    }
    
    console.log("📊 useTokenOptions 状态更新:", {
      pairsLoading,
      balancesLoading,
      pairsCount: pairs?.length || 0,
      tokensCount: tokensWithBalances.length,
      finalLoading: loading
    });
  }, [pairsLoading, balancesLoading, pairs, tokensWithBalances.length]);

  return { 
    inTokens: tokensWithBalances,
    outTokens: tokensWithBalances,
    allTokens: tokensWithBalances,
    isLoading, 
    error,
    refetchBalances
  };
};

// 处理单个基础代币 - 不含余额
function processBaseToken(
  tokenMap: Map<string, Omit<Token, 'balance'>>, 
  params: { address: string; pairId: string }
) {
  const { address, pairId } = params;

  if (!tokenMap.has(address)) {
    const tokenInfo = getTokenInfo(address as Address);
    
    const token: Omit<Token, 'balance'> = {
      address,
      symbol: tokenInfo.symbol,
      name: tokenInfo.name,
      decimals: tokenInfo.decimals,
      isNative: tokenInfo.isNative,
      displayName: getTokenDisplayName(address),
      formattedAddress: getFormattedAddress(address),
      icon: getTokenIcon(address),
      color: getTokenColor(address),
      usdValue: "0", // 需要从价格API获取
      availablePairs: [],
      totalLiquidity: "0", // 暂时设为0，后续可以通过其他方式获取
      poolCount: 0 // 暂时设为0，后续可以通过其他方式获取
    };
    
    tokenMap.set(address, token);
    console.log(`  ➕ 新增代币: ${token.symbol} (${address.substring(0, 8)}...)`);
  }

  const token = tokenMap.get(address)!;
  
  // 添加交易对ID到可用交易对列表
  if (!token.availablePairs.includes(pairId)) {
    token.availablePairs.push(pairId);
    token.poolCount += 1; // 简单计数
  }
  
  console.log(`  📊 更新代币 ${token.symbol}: 交易对数量 ${token.availablePairs.length}`);
}

// 基础代币排序函数 - 不考虑余额
function baseTokenSorter(a: Omit<Token, 'balance'>, b: Omit<Token, 'balance'>): number {
  // 1. 原生代币优先
  if (a.isNative !== b.isNative) return a.isNative ? -1 : 1;
  
  // 2. 按可用交易对数量排序
  if (a.availablePairs.length !== b.availablePairs.length) {
    return b.availablePairs.length - a.availablePairs.length;
  }
  
  // 3. 按符号字母顺序排序
  return a.symbol.localeCompare(b.symbol);
}

// 完整代币排序函数 - 考虑余额
function tokenSorter(a: Token, b: Token): number {
  // 1. 原生代币优先
  if (a.isNative !== b.isNative) return a.isNative ? -1 : 1;
  
  // 2. 有余额的代币优先
  const aHasBalance = parseFloat(a.balance) > 0;
  const bHasBalance = parseFloat(b.balance) > 0;
  if (aHasBalance !== bHasBalance) return aHasBalance ? -1 : 1;
  
  // 3. 按余额大小排序（如果都有余额）
  if (aHasBalance && bHasBalance) {
    const aBalance = parseFloat(a.balance);
    const bBalance = parseFloat(b.balance);
    if (aBalance !== bBalance) return bBalance - aBalance;
  }
  
  // 4. 按可用交易对数量排序
  if (a.availablePairs.length !== b.availablePairs.length) {
    return b.availablePairs.length - a.availablePairs.length;
  }
  
  // 5. 按符号字母顺序排序
  return a.symbol.localeCompare(b.symbol);
}
