// hooks/useSwapQuote.ts - 完整修正版
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { parseUnits, formatUnits } from 'viem';

// 价格计算相关导入（使用修正版本）
import { 
  calculateSwapOutput, 
  findBestTradingPool,
  findMultiHopPath,
  calculateMultiHopSwap,
  calculatePriceFromSqrtPriceX96,
  formatSwapResult,
  formatPrice,
  estimateGasCost,
  calculateOutputWithFallbackRate,
  getExchangeRate,
  type PoolInfo,
  type Token,
  type SwapResult,
  type PriceInfo
} from '../utils/priceCalculations';

// 流动性计算相关导入
import {
  validateLiquiditySufficiency,
  assessLiquidityHealth,
  calculatePriceImpactV3
} from '../utils/liquidityCalculations';

import { usePoolManagerWithClients } from './usePoolManagerWithClients';

// ========== 接口定义 ==========

// 流动性健康度信息
interface LiquidityHealthInfo {
  healthScore: number;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  recommendations: string[];
  metrics: {
    liquidityAmount: string;
    priceRange: string;
    utilization: number;
    tickSpacing: number;
  };
}

// 流动性验证信息
interface LiquidityValidationInfo {
  isSufficient: boolean;
  maxTradeSize: bigint;
  availableLiquidity: bigint;
  priceImpact: number;
  reason?: string;
}

// 价格范围信息
interface PriceRangeInfo {
  currentPrice: number;
  lowerPrice: number;
  upperPrice: number;
  isInRange: boolean;
  utilization: number;
}

// 扩展的报价结果接口
interface SwapQuoteResult {
  // 基础信息
  inputAmount: string;
  outputAmount: string;
  outputAmountFormatted: string;
  
  // 价格信息
  currentPrice: number;
  currentPriceFormatted: string;
  effectivePrice: number;
  effectivePriceFormatted: string;
  
  // 交易影响（原版和V3版本）
  priceImpact: number;
  priceImpactFormatted: string;
  priceImpactV3: number;
  priceImpactV3Formatted: string;
  
  // 费用信息
  feeAmount: bigint;
  feeAmountFormatted: string;
  totalFees: bigint;
  
  // Gas 信息
  gasEstimate: number;
  gasEstimateFormatted: string;
  
  // 池子信息
  poolUsed: PoolInfo | null;
  tradingPath: PoolInfo[];
  isMultiHop: boolean;
  
  // 流动性信息
  liquidityFormatted: string;
  liquidityHealth?: LiquidityHealthInfo;
  liquidityValidation?: LiquidityValidationInfo;
  priceRange?: PriceRangeInfo;
  liquidityStatus: 'sufficient' | 'insufficient' | 'critical' | 'unknown';
  
  // 交易建议
  tradingRecommendations: string[];
  
  // 状态
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
  
  // 路径详情（多跳交易）
  pathDetails?: SwapResult[];
}

// Hook 配置选项
interface UseSwapQuoteOptions {
  autoRefreshInterval?: number;
  debounceDelay?: number;
  enableMultiHop?: boolean;
  intermediateTokens?: string[];
  maxSlippage?: number;
  enableAutoRefresh?: boolean;
  enableLiquidityAnalysis?: boolean;
  liquidityHealthThreshold?: number;
}

// 默认配置
const DEFAULT_OPTIONS: Required<UseSwapQuoteOptions> = {
  autoRefreshInterval: 10000,
  debounceDelay: 500,
  enableMultiHop: true,
  intermediateTokens: [
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    '0xA0b86a33E6441B8dB4B2f6b8e7e0b9e0d1234567', // USDC
    '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
  ],
  maxSlippage: 1.0,
  enableAutoRefresh: false,
  enableLiquidityAnalysis: true,
  liquidityHealthThreshold: 60,
};

// ========== 主要 Hook ==========

export const useSwapQuote = (options: UseSwapQuoteOptions = {}) => {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const { 
    poolsInfo, 
    isLoading: poolsLoading, 
    error: poolsError,
    fetchAllPools 
  } = usePoolManagerWithClients();
  
  // ========== 状态管理 ==========
  const [quote, setQuote] = useState<SwapQuoteResult | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationAttempted, setInitializationAttempted] = useState(false);
  
  // Refs
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastQuoteParamsRef = useRef<{
    tokenIn: Token;
    tokenOut: Token;
    amountIn: string;
  } | null>(null);

  // ========== 初始化逻辑 ==========
  useEffect(() => {
    const initializePools = async () => {
      if (initializationAttempted) return;
      
      if (poolsInfo.length > 0 || poolsLoading) {
        setIsInitialized(true);
        return;
      }
      
      console.log('🚀 useSwapQuote 初始化：开始获取池子数据');
      setInitializationAttempted(true);
      
      try {
        await fetchAllPools();
        setIsInitialized(true);
        console.log('✅ useSwapQuote 初始化：池子数据获取成功');
      } catch (error) {
        console.error('❌ useSwapQuote 初始化：池子数据获取失败', error);
        setLastError(error as Error);
        setIsInitialized(false);
      }
    };

    initializePools();
  }, [fetchAllPools, poolsInfo.length, poolsLoading, initializationAttempted]);

  useEffect(() => {
    if (poolsInfo.length > 0 && !isInitialized) {
      setIsInitialized(true);
      console.log('✅ 池子数据已可用，标记为已初始化');
    }
  }, [poolsInfo.length, isInitialized]);

  // ========== 计算状态 ==========
  const isReady = useMemo(() => {
    const conditions = {
      hasPoolsData: poolsInfo && poolsInfo.length > 0,
      notLoading: !poolsLoading,
      noError: !poolsError,
      isInitialized: isInitialized
    };
    
    const ready = conditions.hasPoolsData && conditions.notLoading && conditions.noError;
    
    console.log('🔍 useSwapQuote isReady 详细检查:', {
      ...conditions,
      poolsInfoLength: poolsInfo?.length || 0,
      poolsError: poolsError || null,
      最终结果: ready
    });
    
    return ready;
  }, [poolsLoading, poolsInfo, poolsError, isInitialized]);

  // ========== 工具函数 ==========
  const clearTimers = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (autoRefreshTimerRef.current) {
      clearTimeout(autoRefreshTimerRef.current);
    }
  }, []);

  const setupAutoRefresh = useCallback(() => {
    if (!config.enableAutoRefresh || !lastQuoteParamsRef.current) return;
    
    clearTimers();
    autoRefreshTimerRef.current = setTimeout(() => {
      if (lastQuoteParamsRef.current) {
        const { tokenIn, tokenOut, amountIn } = lastQuoteParamsRef.current;
        getQuote(tokenIn, tokenOut, amountIn, true);
      }
    }, config.autoRefreshInterval);
  }, [config.enableAutoRefresh, config.autoRefreshInterval]);

  // ========== 缺失的函数实现 ==========

  // 获取指定代币对的池子
  const getPoolsForPair = useCallback((tokenInAddress: string, tokenOutAddress: string): PoolInfo[] => {
    console.log('🔍 获取池子对:', { tokenInAddress, tokenOutAddress, totalPools: poolsInfo.length });
    
    if (!poolsInfo || poolsInfo.length === 0) {
      console.warn('⚠️ 没有可用的池子数据');
      return [];
    }

    const tokenInLower = tokenInAddress.toLowerCase();
    const tokenOutLower = tokenOutAddress.toLowerCase();
    
    const matchingPools = poolsInfo.filter(pool =>
      (pool.token0.toLowerCase() === tokenInLower && pool.token1.toLowerCase() === tokenOutLower) ||
      (pool.token1.toLowerCase() === tokenInLower && pool.token0.toLowerCase() === tokenOutLower)
    ).map(pool => ({
      ...pool,
      liquidity: typeof pool.liquidity === 'string' ? BigInt(pool.liquidity) : pool.liquidity,
      sqrtPriceX96: typeof pool.sqrtPriceX96 === 'string' ? BigInt(pool.sqrtPriceX96) : pool.sqrtPriceX96
    }));

    console.log(`✅ 找到 ${matchingPools.length} 个匹配的池子`);
    return matchingPools;
  }, [poolsInfo]);

  // 选择最佳池子进行交换
  const selectBestPoolForSwap = useCallback((pools: PoolInfo[], amountIn: bigint): PoolInfo | null => {
    console.log('🏆 选择最佳池子:', { poolsCount: pools.length, amountIn: amountIn.toString() });
    
    if (!pools || pools.length === 0) {
      console.warn('⚠️ 没有池子可供选择');
      return null;
    }

    if (pools.length === 1) {
      console.log('✅ 只有一个池子，直接选择');
      return pools[0];
    }

    // 选择流动性最高的池子
    const bestPool = pools.reduce((best, current) => {
      const bestLiquidity = Number(best.liquidity);
      const currentLiquidity = Number(current.liquidity);
      
      console.log('🔍 比较池子:', {
        best: { address: best.pool.slice(0, 10) + '...', liquidity: bestLiquidity },
        current: { address: current.pool.slice(0, 10) + '...', liquidity: currentLiquidity }
      });
      
      if (currentLiquidity > bestLiquidity) {
        return current;
      } else if (currentLiquidity === bestLiquidity && current.fee < best.fee) {
        // 流动性相同时选择手续费更低的
        return current;
      }
      return best;
    });

    console.log('✅ 选择的最佳池子:', {
      address: bestPool.pool.slice(0, 10) + '...',
      liquidity: Number(bestPool.liquidity),
      fee: bestPool.fee
    });

    return bestPool;
  }, []);

  // 计算输出金额
  // 计算输出金额
const calculateOutputAmount = useCallback(async (
  amountIn: bigint,
  pool: PoolInfo,
  tokenIn: Token,
  tokenOut: Token
): Promise<bigint> => {
  console.log('🧮 计算输出金额:', {
    amountIn: amountIn.toString(),
    poolAddress: pool.pool.slice(0, 10) + '...',
    poolLiquidity: pool.liquidity.toString(),
    poolFee: pool.fee,
    tokenIn: tokenIn.symbol,
    tokenOut: tokenOut.symbol
  });

  try {
    // 正确判断交易方向
    const isToken0ToToken1 = pool.token0.toLowerCase() === tokenIn.address.toLowerCase();
    console.log('交易方向:', isToken0ToToken1 ? 'token0 -> token1' : 'token1 -> token0');

    // 方法1: 使用 priceCalculations 中的函数
    if (typeof calculateSwapOutput === 'function') {
      console.log('使用 calculateSwapOutput 函数计算');
      
      const swapResult = calculateSwapOutput(
        amountIn,
        pool.sqrtPriceX96,
        pool.liquidity,
        pool.fee,
        isToken0ToToken1, // 使用正确的交易方向
        tokenIn.decimals,
        tokenOut.decimals
      );
      
      // 安全检查返回值
      if (swapResult && typeof swapResult === 'object' && 'amountOut' in swapResult && swapResult.amountOut > 0n) {
        console.log('✅ 使用 Uniswap V3 公式计算成功:', swapResult.amountOut.toString());
        return swapResult.amountOut;
      } else {
        console.warn('⚠️ calculateSwapOutput 返回无效结果:', swapResult);
      }
    } else {
      console.warn('⚠️ calculateSwapOutput 函数不可用');
    }

    // 方法2: 使用 fallback 汇率
    console.log('⚠️ V3 计算结果为0或无效，使用 fallback 汇率');
    if (typeof calculateOutputWithFallbackRate === 'function') {
      const amountInFormatted = formatUnits(amountIn, tokenIn.decimals);
      const fallbackOutput = calculateOutputWithFallbackRate(tokenIn, tokenOut, amountInFormatted);
      
      if (fallbackOutput && fallbackOutput > 0n) {
        console.log('✅ 使用 fallback 汇率计算成功:', fallbackOutput.toString());
        return fallbackOutput;
      } else {
        console.warn('⚠️ fallback 汇率计算失败:', fallbackOutput);
      }
    } else {
      console.warn('⚠️ calculateOutputWithFallbackRate 函数不可用');
    }

    // 方法3: 最后的 fallback - 简单的1:1兑换（考虑手续费）
    console.log('⚠️ 所有计算方法失败，使用1:1兑换');
    const feeMultiplier = 1000000 - pool.fee;
    const outputAmount = (amountIn * BigInt(feeMultiplier)) / 1000000n;
    
    console.log('✅ 使用1:1兑换（扣除手续费）:', outputAmount.toString());
    return outputAmount;

  } catch (error) {
    console.error('❌ 输出金额计算失败:', error);
    // 最终 fallback：直接返回输入金额的一部分（扣除默认手续费）
    const defaultFeeMultiplier = 997000; // 0.3% 默认费率
    return (amountIn * BigInt(defaultFeeMultiplier)) / 1000000n;
  }
}, []);

  // ========== 核心计算函数 ==========

  const calculateQuote = useCallback(async (
    tokenIn: Token,
    tokenOut: Token, 
    amountIn: string,
    isRefresh: boolean = false
  ): Promise<SwapQuoteResult> => {
    console.log('🔄 开始计算报价:', { 
      tokenIn: tokenIn.symbol, 
      tokenOut: tokenOut.symbol, 
      amountIn,
      isRefresh
    });

    try {
      // 1. 解析输入金额
      const amountInBigInt = parseUnits(amountIn, tokenIn.decimals);
      console.log('💰 输入金额 (BigInt):', amountInBigInt.toString());

      // 2. 获取池子信息
      const pools = getPoolsForPair(tokenIn.address, tokenOut.address);
      
      if (!pools || pools.length === 0) {
        throw new Error('未找到可用的流动性池');
      }

      console.log(`🏊‍♂️ 找到 ${pools.length} 个池子`);

      // 3. 选择最佳池子
      const bestPool = selectBestPoolForSwap(pools, amountInBigInt);
      
      if (!bestPool) {
        throw new Error('无法选择合适的池子');
      }

      console.log('🏆 选择的最佳池子:', bestPool.pool.slice(0, 10) + '...');

      // 4. 计算输出金额
      const outputAmount = await calculateOutputAmount(
        amountInBigInt,
        bestPool,
        tokenIn,
        tokenOut
      );

      console.log('📊 计算结果:', {
        输入金额: amountIn,
        输出金额BigInt: outputAmount.toString(),
        输出金额格式化: formatUnits(outputAmount, tokenOut.decimals)
      });

      // 5. 格式化输出金额
      const outputAmountFormatted = formatUnits(outputAmount, tokenOut.decimals);
      const outputAmountNumber = parseFloat(outputAmountFormatted);

      // 6. 计算价格
      const inputAmountNumber = parseFloat(amountIn);
      const currentPrice = inputAmountNumber > 0 ? outputAmountNumber / inputAmountNumber : 0;
      const effectivePrice = currentPrice;

      // 7. 计算价格影响
      const zeroForOne = bestPool.token0.toLowerCase() === tokenIn.address.toLowerCase();
      const priceImpact = calculatePriceImpactV3 ?
        calculatePriceImpactV3(amountInBigInt, bestPool.liquidity, zeroForOne) : 0;

      // 8. 计算手续费
      const feeAmount = (amountInBigInt * BigInt(bestPool.fee)) / BigInt(1000000);

      // 9. 估算 Gas
      const gasEstimate = estimateGasCost('single', 1);

      // 10. 流动性分析
      let liquidityValidation: LiquidityValidationInfo | undefined;
      let liquidityHealth: LiquidityHealthInfo | undefined;
      let liquidityStatus: 'sufficient' | 'insufficient' | 'critical' | 'unknown' = 'unknown';

      if (config.enableLiquidityAnalysis && validateLiquiditySufficiency) {
        try {
          liquidityValidation = validateLiquiditySufficiency(
            bestPool,
            amountInBigInt,
            zeroForOne,
            tokenIn.decimals,
            tokenOut.decimals
          );
          
          liquidityStatus = liquidityValidation.isSufficient ? 'sufficient' : 'insufficient';
          
          if (assessLiquidityHealth) {
            liquidityHealth = assessLiquidityHealth(
              bestPool,
              tokenIn.decimals,
              tokenOut.decimals
            );
          }
        } catch (error) {
          console.warn('⚠️ 流动性分析失败:', error);
        }
      }

      // 11. 生成交易建议
      const tradingRecommendations: string[] = [];
      
      if (priceImpact > 5) {
        tradingRecommendations.push('⚠️ 价格影响较大，建议分批交易');
      }
      
      if (liquidityStatus === 'insufficient') {
        tradingRecommendations.push('💧 流动性不足，可能存在滑点风险');
      }
      
      if (Number(bestPool.liquidity) < 100000) {
        tradingRecommendations.push('🔍 池子流动性较低，建议谨慎交易');
      }

      console.log('💹 价格计算:', {
        输入数量: inputAmountNumber,
        输出数量: outputAmountNumber,
        当前价格: currentPrice,
        有效价格: effectivePrice,
        价格影响: priceImpact,
        流动性状态: liquidityStatus
      });

      // 12. 构建结果
      const result: SwapQuoteResult = {
        inputAmount: amountIn,
        outputAmount: outputAmountFormatted,
        outputAmountFormatted,
        currentPrice,
        currentPriceFormatted: formatPrice(currentPrice, tokenIn.symbol, tokenOut.symbol),
        effectivePrice,
        effectivePriceFormatted: formatPrice(effectivePrice, tokenIn.symbol, tokenOut.symbol),
        priceImpact,
        priceImpactFormatted: `${priceImpact.toFixed(2)}%`,
        priceImpactV3: priceImpact,
        priceImpactV3Formatted: `${priceImpact.toFixed(2)}%`,
        feeAmount,
        feeAmountFormatted: formatUnits(feeAmount, tokenIn.decimals),
        totalFees: feeAmount,
        gasEstimate: gasEstimate.gasLimit,
        gasEstimateFormatted: gasEstimate.gasLimitString,
        poolUsed: bestPool,
        tradingPath: [bestPool],
        isMultiHop: false,
        liquidityFormatted: formatUnits(bestPool.liquidity, 18),
        liquidityValidation,
        liquidityHealth,
        liquidityStatus,
        tradingRecommendations,
        isLoading: false,
        error: null,
        lastUpdated: Date.now()
      };

      return result;

    } catch (error) {
      console.error('❌ 报价计算失败:', error);
      
      const errorMessage = error instanceof Error ? error.message : '计算报价失败';
      
      return {
        inputAmount: amountIn,
        outputAmount: '0',
        outputAmountFormatted: '计算失败',
        currentPrice: 0,
        currentPriceFormatted: errorMessage,
        effectivePrice: 0,
        effectivePriceFormatted: errorMessage,
        priceImpact: 0,
        priceImpactFormatted: '无法计算',
        priceImpactV3: 0,
        priceImpactV3Formatted: '无法计算',
        feeAmount: 0n,
        feeAmountFormatted: '无法计算',
        totalFees: 0n,
        gasEstimate: 0,
        gasEstimateFormatted: '无法估算',
        poolUsed: null,
        tradingPath: [],
        isMultiHop: false,
        liquidityFormatted: '无法获取',
        liquidityStatus: 'unknown',
        tradingRecommendations: [errorMessage],
        isLoading: false,
        error: errorMessage,
        lastUpdated: Date.now()
      };
    }
  }, [getPoolsForPair, selectBestPoolForSwap, calculateOutputAmount, config.enableLiquidityAnalysis]);

  // ========== 获取报价函数 ==========
  const getQuote = useCallback(async (
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string,
    isRefresh: boolean = false
  ): Promise<SwapQuoteResult | null> => {
    console.log('🚀 getQuote 被调用 (修正版):', {
      tokenIn: tokenIn?.symbol,
      tokenOut: tokenOut?.symbol,
      amountIn,
      isRefresh,
      isReady
    });

    // 基础参数验证
    if (!tokenIn || !tokenOut || !amountIn || parseFloat(amountIn) <= 0) {
      console.warn('⚠️ getQuote 参数无效');
      setLastError(new Error('无效的交易参数'));
      return null;
    }

    // 检查系统是否就绪
    if (!isReady) {
      console.log('⏳ 系统未就绪，等待...');
      return null;
    }

    // 清除之前的错误
    setLastError(null);

    // 清除之前的防抖定时器
    if (debounceTimerRef.current) {
      console.log('🧹 清除之前的定时器');
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // 计算延迟时间
    const delay = isRefresh ? 0 : (config?.debounceDelay || 300);
    console.log('⏰ 设置定时器，延迟:', delay);

    // 设置加载状态
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setQuote(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        outputAmountFormatted: '计算中...',
      } as SwapQuoteResult));
    }

    // 返回 Promise 来处理异步结果
    return new Promise((resolve) => {
      debounceTimerRef.current = setTimeout(async () => {
        console.log('🎯 定时器执行开始 (修正版)!');
        try {
          const result = await calculateQuote(tokenIn, tokenOut, amountIn, isRefresh);
          
          setQuote(result);
          setIsRefreshing(false);
          
          // 保存参数用于自动刷新
          lastQuoteParamsRef.current = { tokenIn, tokenOut, amountIn };
          
          // 设置自动刷新
          setupAutoRefresh();
          
          console.log('✅ 报价计算成功 (修正版):', {
            输出金额: result.outputAmountFormatted,
            价格影响原版: result.priceImpactFormatted,
            价格影响V3: result.priceImpactV3Formatted,
            流动性状态: result.liquidityStatus
          });
          
          resolve(result);
        } catch (error) {
          console.error('❌ 报价计算失败 (修正版):', error);
          
          const errorMessage = error instanceof Error ? error.message : '计算报价失败';
          setLastError(error as Error);
          setIsRefreshing(false);
          
          const errorResult: SwapQuoteResult = {
            inputAmount: amountIn,
            outputAmount: '0',
            outputAmountFormatted: '计算失败',
            currentPrice: 0,
            currentPriceFormatted: errorMessage,
            effectivePrice: 0,
            effectivePriceFormatted: errorMessage,
            priceImpact: 0,
            priceImpactFormatted: '无法计算',
            priceImpactV3: 0,
            priceImpactV3Formatted: '无法计算',
            feeAmount: 0n,
            feeAmountFormatted: '无法计算',
            totalFees: 0n,
            gasEstimate: 0,
            gasEstimateFormatted: '无法估算',
            poolUsed: null,
            tradingPath: [],
            isMultiHop: false,
            liquidityFormatted: '无法获取',
            liquidityStatus: 'unknown',
            tradingRecommendations: [errorMessage],
            isLoading: false,
            error: errorMessage,
            lastUpdated: Date.now(),
          };
          
          setQuote(errorResult);
          resolve(errorResult);
        }
      }, delay);
      
      console.log('✅ 定时器已设置，ID:', debounceTimerRef.current);
    });
  }, [isReady, calculateQuote, config?.debounceDelay, setupAutoRefresh]);

  // ========== 其他方法 ==========
  const refreshQuote = useCallback(() => {
    if (lastQuoteParamsRef.current) {
      const { tokenIn, tokenOut, amountIn } = lastQuoteParamsRef.current;
      getQuote(tokenIn, tokenOut, amountIn, true);
    }
  }, [getQuote]);

  const clearQuote = useCallback(() => {
    setQuote(null);
    lastQuoteParamsRef.current = null;
    clearTimers();
  }, [clearTimers]);

  const retryFetchPools = useCallback(async () => {
    console.log('🔄 重试获取池子数据');
    setInitializationAttempted(false);
    setIsInitialized(false);
    setLastError(null);
    
    try {
      await fetchAllPools();
      setIsInitialized(true);
      console.log('✅ 重试获取池子数据成功');
    } catch (error) {
      console.error('❌ 重试获取池子数据失败:', error);
      setLastError(error as Error);
    }
  }, [fetchAllPools]);

  // ========== 工具方法 ==========
  const getPriceImpactLevel = useCallback((priceImpact: number): 'low' | 'medium' | 'high' | 'critical' => {
    if (priceImpact < 0.1) return 'low';
    if (priceImpact < 1) return 'medium';
    if (priceImpact < 5) return 'high';
    return 'critical';
  }, []);

  const shouldWarnUser = useCallback((quote: SwapQuoteResult | null): boolean => {
    if (!quote) return false;
    return quote.priceImpactV3 > config.maxSlippage;
  }, [config.maxSlippage]);

  const getLiquidityStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'sufficient': return 'text-green-600';
      case 'insufficient': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }, []);
  const getHealthScoreColor = useCallback((score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  }, []);

 const canSafelyTrade = useCallback((quote: SwapQuoteResult | null): boolean => {
  if (!quote) return false;
  
  // 如果没有流动性验证信息，只检查价格影响
  if (!quote.liquidityValidation) {
    return quote.priceImpactV3 < config.maxSlippage;
  }
  
  // 如果有流动性验证信息，同时检查流动性和价格影响
  return quote.liquidityValidation.isSufficient === true && 
         quote.priceImpactV3 < config.maxSlippage;
}, [config.maxSlippage]);

  const getLiquidityRecommendations = useCallback((quote: SwapQuoteResult | null): string[] => {
    console.log('🔍 getLiquidityRecommendations 调用:', {
      hasQuote: !!quote,
      tradingRecommendations: quote?.tradingRecommendations,
      type: typeof quote?.tradingRecommendations,
      isArray: Array.isArray(quote?.tradingRecommendations)
    });

    if (!quote) return [];
    
    // 安全地处理 tradingRecommendations
    const baseTradingRecommendations = quote.tradingRecommendations || [];
    const recommendations = Array.isArray(baseTradingRecommendations) 
      ? [...baseTradingRecommendations]
      : [];
    
    // 添加流动性健康度建议
    if (quote.liquidityHealth?.healthScore && quote.liquidityHealth.healthScore < 50) {
      recommendations.push('🔄 考虑等待流动性改善或选择其他交易对');
    }
    
    // 添加价格影响建议
    if (quote.priceImpactV3 > 5) {
      recommendations.push('📊 建议将大额交易分成多个小额交易');
    }
    
    // 添加更多智能建议
    if (quote.priceImpactV3 > 10) {
      recommendations.push('⚠️ 价格影响过大，强烈建议重新考虑交易规模');
    }
    
    if (quote.liquidityStatus === 'insufficient') {
      recommendations.push('💧 当前流动性较低，可能导致较大滑点');
    }
    
    if (quote.gasEstimate > 200000) { // 假设 gas 限制
      recommendations.push('⛽ Gas 费用较高，建议等待网络拥堵缓解');
    }
    
    console.log('✅ 生成建议:', recommendations);
    return recommendations;
  }, []);

  // ========== 高级功能函数 ==========

  // 批量获取多个交易对的报价
  const getBatchQuotes = useCallback(async (
    requests: Array<{
      tokenIn: Token;
      tokenOut: Token;
      amountIn: string;
    }>
  ): Promise<Array<SwapQuoteResult | null>> => {
    console.log('📦 批量获取报价:', requests.length);
    
    const promises = requests.map(({ tokenIn, tokenOut, amountIn }) =>
      calculateQuote(tokenIn, tokenOut, amountIn, false)
    );
    
    try {
      const results = await Promise.allSettled(promises);
      return results.map(result => 
        result.status === 'fulfilled' ? result.value : null
      );
    } catch (error) {
      console.error('❌ 批量报价失败:', error);
      return new Array(requests.length).fill(null);
    }
  }, [calculateQuote]);

  // 获取历史价格趋势（模拟）
  const getPriceTrend = useCallback((
    tokenIn: Token,
    tokenOut: Token,
    timeframe: '1h' | '24h' | '7d' = '24h'
  ): Array<{ timestamp: number; price: number }> => {
    console.log('📈 获取价格趋势:', { tokenIn: tokenIn.symbol, tokenOut: tokenOut.symbol, timeframe });
    
    // 模拟历史价格数据
    const now = Date.now();
    const intervals = timeframe === '1h' ? 12 : timeframe === '24h' ? 24 : 168; // 7天按小时计算
    const intervalMs = timeframe === '1h' ? 5 * 60 * 1000 : 60 * 60 * 1000; // 5分钟或1小时
    
    const basePrice = getExchangeRate(tokenIn.symbol, tokenOut.symbol);
    
    return Array.from({ length: intervals }, (_, i) => {
      const timestamp = now - (intervals - 1 - i) * intervalMs;
      // 添加一些随机波动
      const volatility = 0.02; // 2% 波动
      const randomFactor = 1 + (Math.random() - 0.5) * volatility;
      const price = basePrice * randomFactor;
      
      return { timestamp, price };
    });
  }, []);

  // 计算最佳交易时机
  const getOptimalTradingTime = useCallback((
    quote: SwapQuoteResult | null
  ): {
    recommendation: 'now' | 'wait' | 'split';
    reason: string;
    estimatedSavings?: string;
    suggestedDelay?: number;
  } => {
    if (!quote) {
      return {
        recommendation: 'wait',
        reason: '无法获取报价信息'
      };
    }

    // 基于价格影响的建议
    if (quote.priceImpactV3 > 5) {
      return {
        recommendation: 'split',
        reason: '价格影响过大，建议分批交易',
        estimatedSavings: `约 ${(quote.priceImpactV3 * 0.3).toFixed(2)}%`
      };
    }

    // 基于流动性的建议
    if (quote.liquidityStatus === 'insufficient') {
      return {
        recommendation: 'wait',
        reason: '当前流动性不足，建议等待',
        suggestedDelay: 30 * 60 * 1000 // 30分钟
      };
    }

    // 基于 Gas 费用的建议
    if (quote.gasEstimate > 300000) {
      return {
        recommendation: 'wait',
        reason: 'Gas 费用较高，建议等待网络拥堵缓解',
        suggestedDelay: 60 * 60 * 1000 // 1小时
      };
    }

    return {
      recommendation: 'now',
      reason: '当前是较好的交易时机'
    };
  }, []);

  // 风险评估
  const assessTradeRisk = useCallback((
    quote: SwapQuoteResult | null
  ): {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number; // 0-100
    riskFactors: Array<{
      factor: string;
      impact: 'low' | 'medium' | 'high';
      description: string;
    }>;
    mitigationSuggestions: string[];
  } => {
    if (!quote) {
      return {
        riskLevel: 'critical',
        riskScore: 0,
        riskFactors: [{ factor: '无报价', impact: 'high', description: '无法获取交易报价' }],
        mitigationSuggestions: ['检查网络连接', '重试获取报价']
      };
    }

    let riskScore = 100;
    const riskFactors: Array<{
      factor: string;
      impact: 'low' | 'medium' | 'high';
      description: string;
    }> = [];
    const mitigationSuggestions: string[] = [];

    // 价格影响风险
    if (quote.priceImpactV3 > 1) {
      const impact = quote.priceImpactV3 > 5 ? 'high' : quote.priceImpactV3 > 2 ? 'medium' : 'low';
      riskScore -= quote.priceImpactV3 * 5;
      riskFactors.push({
        factor: '价格影响',
        impact,
        description: `价格影响 ${quote.priceImpactV3.toFixed(2)}%`
      });
      
      if (impact === 'high') {
        mitigationSuggestions.push('分批执行交易以减少价格影响');
      }
    }

    // 流动性风险
    if (quote.liquidityStatus !== 'sufficient') {
      const impact = quote.liquidityStatus === 'critical' ? 'high' : 'medium';
      riskScore -= impact === 'high' ? 30 : 15;
      riskFactors.push({
        factor: '流动性',
        impact,
        description: `流动性状态: ${quote.liquidityStatus}`
      });
      mitigationSuggestions.push('等待流动性改善或选择其他池子');
    }

    // Gas 风险
    if (quote.gasEstimate > 250000) {
      const impact = quote.gasEstimate > 500000 ? 'high' : 'medium';
      riskScore -= impact === 'high' ? 20 : 10;
      riskFactors.push({
        factor: 'Gas 费用',
        impact,
        description: `预估 Gas: ${quote.gasEstimateFormatted}`
      });
      mitigationSuggestions.push('等待网络拥堵缓解以降低 Gas 费用');
    }

    // 多跳交易风险
    if (quote.isMultiHop) {
      riskScore -= 15;
      riskFactors.push({
        factor: '多跳交易',
        impact: 'medium',
        description: '多跳交易增加失败风险'
      });
      mitigationSuggestions.push('考虑寻找直接交易路径');
    }

    // 确定风险等级
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (riskScore >= 80) {
      riskLevel = 'low';
    } else if (riskScore >= 60) {
      riskLevel = 'medium';
    } else if (riskScore >= 40) {
      riskLevel = 'high';
    } else {
      riskLevel = 'critical';
    }

    return {
      riskLevel,
      riskScore: Math.max(0, riskScore),
      riskFactors,
      mitigationSuggestions
    };
  }, []);

  // 交易模拟
  const simulateTrade = useCallback(async (
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string,
    scenarios: Array<{
      name: string;
      priceChange: number; // 价格变化百分比
      liquidityChange: number; // 流动性变化百分比
    }> = [
      { name: '最佳情况', priceChange: 2, liquidityChange: 10 },
      { name: '正常情况', priceChange: 0, liquidityChange: 0 },
      { name: '最坏情况', priceChange: -5, liquidityChange: -20 }
    ]
  ): Promise<Array<{
    scenario: string;
    quote: SwapQuoteResult;
    expectedOutput: string;
    riskAssessment: ReturnType<typeof assessTradeRisk>;
  }>> => {
    console.log('🎭 开始交易模拟');
    
    const results = [];
    
    for (const scenario of scenarios) {
      try {
        // 获取基础报价
        const baseQuote = await calculateQuote(tokenIn, tokenOut, amountIn);
        
        // 模拟价格和流动性变化
        const adjustedOutputAmount = parseFloat(baseQuote.outputAmount) * (1 + scenario.priceChange / 100);
        
        const simulatedQuote: SwapQuoteResult = {
          ...baseQuote,
          outputAmount: adjustedOutputAmount.toFixed(tokenOut.decimals),
          outputAmountFormatted: adjustedOutputAmount.toFixed(tokenOut.decimals),
          currentPrice: baseQuote.currentPrice * (1 + scenario.priceChange / 100),
          effectivePrice: baseQuote.effectivePrice * (1 + scenario.priceChange / 100),
          priceImpactV3: baseQuote.priceImpactV3 * (1 - scenario.liquidityChange / 100),
          liquidityStatus: scenario.liquidityChange < -15 ? 'insufficient' : baseQuote.liquidityStatus
        };
        
        const riskAssessment = assessTradeRisk(simulatedQuote);
        
        results.push({
          scenario: scenario.name,
          quote: simulatedQuote,
          expectedOutput: simulatedQuote.outputAmountFormatted,
          riskAssessment
        });
      } catch (error) {
        console.error(`❌ 模拟 ${scenario.name} 失败:`, error);
      }
    }
    
    return results;
  }, [calculateQuote, assessTradeRisk]);

  // ========== 性能优化 ==========

  // 预加载常用交易对的报价
  const preloadCommonPairs = useCallback(async (
    commonPairs: Array<{ tokenIn: Token; tokenOut: Token }>
  ) => {
    console.log('🚀 预加载常用交易对报价');
    
    const preloadPromises = commonPairs.map(({ tokenIn, tokenOut }) =>
      calculateQuote(tokenIn, tokenOut, '1', false).catch(error => {
        console.warn(`⚠️ 预加载 ${tokenIn.symbol}/${tokenOut.symbol} 失败:`, error);
        return null;
      })
    );
    
    await Promise.allSettled(preloadPromises);
    console.log('✅ 常用交易对预加载完成');
  }, [calculateQuote]);

  // ========== 清理 ==========
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  // ========== 返回值 ==========
  return {
    // 核心状态
    quote,
    isRefreshing,
    isPoolsLoading: poolsLoading,
    hasError: !!lastError || !!poolsError,
    lastError: lastError || poolsError,
    
    // 核心方法
    getQuote,
    refreshQuote,
    clearQuote,
    retryFetchPools,
    
    // 批量和高级功能
    getBatchQuotes,
    getPriceTrend,
    getOptimalTradingTime,
    assessTradeRisk,
    simulateTrade,
    preloadCommonPairs,
    
    // 工具方法
    getPriceImpactLevel: (priceImpact?: number) => 
      getPriceImpactLevel(priceImpact ?? quote?.priceImpactV3 ?? 0),
    shouldWarnUser: () => shouldWarnUser(quote),
    getLiquidityStatusColor: (status?: string) => 
      getLiquidityStatusColor(status ?? quote?.liquidityStatus ?? 'unknown'),
    getHealthScoreColor: (score?: number) => 
      getHealthScoreColor(score ?? quote?.liquidityHealth?.healthScore ?? 0),
    canSafelyTrade: () => canSafelyTrade(quote),
    getLiquidityRecommendations: () => getLiquidityRecommendations(quote),
    
    // 状态检查
    hasLiquidityWarning: quote?.liquidityStatus === 'insufficient' || quote?.liquidityStatus === 'critical',
    liquidityHealthScore: quote?.liquidityHealth?.healthScore ?? 0,
    isLiquidityInRange: quote?.priceRange?.isInRange ?? false,
    
    // 便捷计算
    isQuoteStale: quote ? (Date.now() - quote.lastUpdated) > config.autoRefreshInterval : false,
    tradingRecommendation: quote ? getOptimalTradingTime(quote) : null,
    riskAssessment: quote ? assessTradeRisk(quote) : null,
    
    // 配置和原始数据
    config,
    poolsInfo,
    isReady,
    isInitialized,
    
    // 调试信息
    debug: {
      poolsCount: poolsInfo.length,
      lastQuoteParams: lastQuoteParamsRef.current,
      timers: {
        hasDebounceTimer: !!debounceTimerRef.current,
        hasAutoRefreshTimer: !!autoRefreshTimerRef.current
      }
    }
  };
};

// ========== 导出类型 ==========
export type { 
  SwapQuoteResult, 
  UseSwapQuoteOptions, 
  Token,
  LiquidityHealthInfo,
  LiquidityValidationInfo,
  PriceRangeInfo
};

// 导出默认配置
export { DEFAULT_OPTIONS as DEFAULT_SWAP_QUOTE_OPTIONS };

// ========== 辅助 Hooks ==========

// 简化版本的 Hook，只提供基础功能
export const useSimpleSwapQuote = (options: Partial<UseSwapQuoteOptions> = {}) => {
  const fullHook = useSwapQuote({
    ...options,
    enableLiquidityAnalysis: false,
    enableAutoRefresh: false,
    enableMultiHop: false
  });
  
  return {
    quote: fullHook.quote,
    getQuote: fullHook.getQuote,
    isLoading: fullHook.quote?.isLoading ?? false,
    error: fullHook.quote?.error,
    isReady: fullHook.isReady
  };
};

// 专门用于价格显示的 Hook
export const usePriceDisplay = (tokenIn?: Token, tokenOut?: Token) => {
  const { quote, getQuote, isReady } = useSimpleSwapQuote();
  
  useEffect(() => {
    if (isReady && tokenIn && tokenOut) {
      getQuote(tokenIn, tokenOut, '1'); // 获取单位价格
    }
  }, [tokenIn, tokenOut, isReady, getQuote]);
  
  return {
    price: quote?.currentPrice ?? 0,
    priceFormatted: quote?.currentPriceFormatted ?? 'N/A',
    isLoading: quote?.isLoading ?? false
  };
};

// 用于监控多个交易对价格的 Hook
export const useMultiPairMonitor = (
  pairs: Array<{ tokenIn: Token; tokenOut: Token; label?: string }>
) => {
  const [prices, setPrices] = useState<Record<string, {
    price: number;
    priceFormatted: string;
    lastUpdated: number;
  }>>({});
  
  const { getBatchQuotes, isReady } = useSwapQuote({
    enableLiquidityAnalysis: false,
    enableAutoRefresh: true,
    autoRefreshInterval: 30000 // 30秒刷新
  });
  
  useEffect(() => {
    if (!isReady || pairs.length === 0) return;
    
    const updatePrices = async () => {
      const requests = pairs.map(({ tokenIn, tokenOut }) => ({
        tokenIn,
        tokenOut,
        amountIn: '1'
      }));
      
      const quotes = await getBatchQuotes(requests);
      
      const newPrices: typeof prices = {};
      quotes.forEach((quote, index) => {
        const pair = pairs[index];
        const key = pair.label || `${pair.tokenIn.symbol}/${pair.tokenOut.symbol}`;
        
        if (quote) {
          newPrices[key] = {
            price: quote.currentPrice,
            priceFormatted: quote.currentPriceFormatted,
            lastUpdated: quote.lastUpdated
          };
        }
      });
      
      setPrices(newPrices);
    };
    
    updatePrices();
    
    // 设置定时更新
    const interval = setInterval(updatePrices, 30000);
    return () => clearInterval(interval);
  }, [pairs, isReady, getBatchQuotes]);
  
  return prices;
};

