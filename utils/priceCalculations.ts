// utils/priceCalculations.ts - 完整修正版（无any类型）
import { formatUnits, parseUnits } from 'viem';

// ========== 接口定义 ==========

// 池子数据接口（基于你的数据结构）
export interface PoolInfo {
  fee: number;
  feeProtocol: number;
  index: number;
  liquidity: bigint;
  pool: string;
  sqrtPriceX96: bigint;
  tick: number;
  tickLower: number;
  tickUpper: number;
  token0: string;
  token1: string;
}

// Token 接口
export interface Token {
  address: string;
  decimals: number;
  symbol: string;
  name?: string;
}

// 交换结果接口
export interface SwapResult {
  amountOut: bigint;
  priceImpact: number;
  newSqrtPriceX96: bigint;
  effectivePrice: number;
  feeAmount: bigint;
}

// 价格信息接口
export interface PriceInfo {
  token0PerToken1: number;
  token1PerToken0: number;
}

// 多跳交换结果接口
export interface MultiHopSwapResult {
  finalAmountOut: bigint;
  totalPriceImpact: number;
  totalFees: bigint;
  pathDetails: SwapResult[];
}

// 验证结果接口
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Gas 估算结果接口
export interface GasEstimateResult {
  gasLimit: number;
  gasLimitString: string;
}

// 价格范围结果接口
export interface PriceRangeResult {
  lowerPrice: number;
  upperPrice: number;
  currentInRange: boolean;
  currentTick?: number;
}

// ========== 常量定义 ==========

const Q96 = 2n ** 96n;
const Q192 = Q96 * Q96;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const MAX_UINT256 = 2n ** 256n - 1n;
const MIN_TICK = -887272;
const MAX_TICK = 887272;

// 预定义的代币汇率表
const TOKEN_EXCHANGE_RATES: Record<string, Record<string, number>> = {
  'ETH': {
    'USDC': 3000,
    'USDT': 3000,
    'DAI': 3000,
    'WETH': 1,
    'MyTokenA': 3333.33,
    'MyTokenB': 3333.33
  },
  'WETH': {
    'USDC': 3000,
    'USDT': 3000,
    'ETH': 1,
    'MyTokenA': 3333.33,
    'MyTokenB': 3333.33
  },
  'USDC': {
    'USDT': 1,
    'DAI': 1,
    'ETH': 1/3000,
    'WETH': 1/3000,
    'MyTokenA': 1.5,
    'MyTokenB': 1.5
  },
  'USDT': {
    'USDC': 1,
    'DAI': 1,
    'ETH': 1/3000,
    'WETH': 1/3000,
    'MyTokenA': 1.5,
    'MyTokenB': 1.5
  },
  'MyTokenA': {
    'MyTokenB': 0.998,
    'ETH': 0.0003,
    'WETH': 0.0003,
    'USDC': 0.67,
    'USDT': 0.67
  },
  'MyTokenB': {
    'MyTokenA': 1.002,
    'ETH': 0.0003,
    'WETH': 0.0003,
    'USDC': 0.67,
    'USDT': 0.67
  }
};

// ========== 核心价格计算函数 ==========

// 从 sqrtPriceX96 计算价格（高精度版本）
export const calculatePriceFromSqrtPriceX96 = (
  sqrtPriceX96: bigint,
  token0Decimals: number = 18,
  token1Decimals: number = 18
): PriceInfo => {
  try {
    if (sqrtPriceX96 <= 0n) {
      console.warn('⚠️ sqrtPriceX96 无效，使用默认价格');
      return { token0PerToken1: 1, token1PerToken0: 1 };
    }

    // 使用高精度计算避免溢出
    const numerator = sqrtPriceX96 * sqrtPriceX96;
    
    // 调整小数位差异
    const decimalAdjustment = 10n ** BigInt(token1Decimals - token0Decimals);
    const adjustedNumerator = numerator * decimalAdjustment;
    
    // 转换为浮点数进行最终计算
    const priceFloat = Number(adjustedNumerator) / Number(Q192);
    
    console.log('🔢 价格计算详情:', {
      sqrtPriceX96: sqrtPriceX96.toString(),
      numerator: numerator.toString(),
      Q192: Q192.toString(),
      decimalAdjustment: decimalAdjustment.toString(),
      priceFloat,
      token0Decimals,
      token1Decimals
    });
    
    if (!isFinite(priceFloat) || priceFloat <= 0) {
      console.warn('⚠️ 计算出的价格无效，使用默认价格');
      return { token0PerToken1: 1, token1PerToken0: 1 };
    }
    
    return {
      token0PerToken1: priceFloat,
      token1PerToken0: 1 / priceFloat,
    };
  } catch (error) {
    console.error('❌ 价格计算失败:', error);
    return {
      token0PerToken1: 1,
      token1PerToken0: 1,
    };
  }
};

// 从 tick 计算价格（更精确的方法）
export const calculatePriceFromTick = (
  tick: number,
  token0Decimals: number = 18,
  token1Decimals: number = 18
): PriceInfo => {
  try {
    // 验证 tick 范围
    if (tick < MIN_TICK || tick > MAX_TICK) {
      console.warn(`⚠️ tick ${tick} 超出有效范围 [${MIN_TICK}, ${MAX_TICK}]`);
      return { token0PerToken1: 1, token1PerToken0: 1 };
    }

    // price = 1.0001^tick
    const price = Math.pow(1.0001, tick);
    
    // 调整小数位差异
    const decimalAdjustment = Math.pow(10, token1Decimals - token0Decimals);
    const adjustedPrice = price * decimalAdjustment;
    
    if (!isFinite(adjustedPrice) || adjustedPrice <= 0) {
      console.warn('⚠️ 从tick计算的价格无效');
      return { token0PerToken1: 1, token1PerToken0: 1 };
    }
    
    return {
      token0PerToken1: adjustedPrice,
      token1PerToken0: 1 / adjustedPrice,
    };
  } catch (error) {
    console.error('❌ 从tick计算价格失败:', error);
    return { token0PerToken1: 1, token1PerToken0: 1 };
  }
};

// ========== 修正的价格影响计算 ==========

// 精确的 Uniswap V3 价格影响计算
export const calculatePriceImpactFromLiquidity = (
  amountIn: bigint,
  liquidity: bigint,
  sqrtPriceX96: bigint,
  zeroForOne: boolean
): number => {
  if (liquidity === 0n || amountIn === 0n) {
    console.warn('⚠️ 流动性或输入金额为0');
    return 0;
  }
  
  try {
    const amountInFloat = Number(amountIn);
    const liquidityFloat = Number(liquidity);
    const sqrtPrice = Number(sqrtPriceX96) / (2 ** 96);
    
    console.log('💹 价格影响计算参数:', {
      amountInFloat,
      liquidityFloat,
      sqrtPrice,
      zeroForOne
    });
    
    if (!isFinite(amountInFloat) || !isFinite(liquidityFloat) || !isFinite(sqrtPrice)) {
      console.warn('⚠️ 价格影响计算参数无效');
      return 0;
    }
    
    let priceImpact: number;
    
    if (zeroForOne) {
      // 卖出 token0，买入 token1
      // 公式: priceImpact = Δx / (L/√P + Δx)
      const denominator = liquidityFloat / sqrtPrice + amountInFloat;
      priceImpact = denominator > 0 ? (amountInFloat / denominator) * 100 : 0;
    } else {
      // 卖出 token1，买入 token0
      // 公式: priceImpact = Δy / (L*√P + Δy)
      const denominator = liquidityFloat * sqrtPrice + amountInFloat;
      priceImpact = denominator > 0 ? (amountInFloat / denominator) * 100 : 0;
    }
    
    const finalImpact = Math.min(Math.max(priceImpact, 0), 100);
    
    console.log('💹 价格影响计算结果:', {
      priceImpact,
      finalImpact
    });
    
    return finalImpact;
  } catch (error) {
    console.error('❌ 价格影响计算失败:', error);
    return 0;
  }
};

// ========== 修正的交换输出计算 ==========

// 精确的 Uniswap V3 交换输出计算
export const calculateSwapOutput = (
  amountIn: bigint,
  sqrtPriceX96: bigint,
  liquidity: bigint,
  fee: number,
  zeroForOne: boolean,
  token0Decimals: number = 18,
  token1Decimals: number = 18
): SwapResult => {
  console.log('🔄 开始交换输出计算:', {
    amountIn: amountIn.toString(),
    sqrtPriceX96: sqrtPriceX96.toString(),
    liquidity: liquidity.toString(),
    fee,
    zeroForOne,
    token0Decimals,
    token1Decimals
  });
  
  try {
    // 输入验证
    if (amountIn <= 0n || liquidity <= 0n || sqrtPriceX96 <= 0n) {
      console.warn('⚠️ 无效的输入参数');
      return createZeroSwapResult(sqrtPriceX96);
    }

    // 1. 计算手续费
    const feeAmount = (amountIn * BigInt(fee)) / BigInt(1000000);
    const amountInAfterFee = amountIn - feeAmount;
    
    console.log('💰 手续费计算:', {
      原始金额: amountIn.toString(),
      手续费: feeAmount.toString(),
      扣费后金额: amountInAfterFee.toString()
    });
    
    if (amountInAfterFee <= 0n) {
      console.warn('⚠️ 扣除手续费后金额为0或负数');
      return createZeroSwapResult(sqrtPriceX96, feeAmount);
    }

    // 2. 计算价格影响
    const priceImpact = calculatePriceImpactFromLiquidity(
      amountInAfterFee, 
      liquidity, 
      sqrtPriceX96, 
      zeroForOne
    );
    
    // 3. 使用 Uniswap V3 的精确输出计算
    const sqrtPrice = Number(sqrtPriceX96) / (2 ** 96);
    const liquidityFloat = Number(liquidity);
    const amountInFloat = Number(amountInAfterFee);
    
    if (!isFinite(sqrtPrice) || !isFinite(liquidityFloat) || !isFinite(amountInFloat)) {
      console.warn('⚠️ 计算参数转换后无效');
      return createFallbackSwapResult(amountInAfterFee, sqrtPriceX96, priceImpact, feeAmount);
    }
    
    let amountOut: bigint;
    let newSqrtPriceX96: bigint;
    let effectivePrice: number;
    
    if (zeroForOne) {
      // token0 -> token1
      const sqrtPriceNext = liquidityFloat / (liquidityFloat / sqrtPrice + amountInFloat);
      const amountOutFloat = liquidityFloat * (sqrtPrice - sqrtPriceNext);
      
      amountOut = BigInt(Math.floor(Math.max(amountOutFloat, 0)));
      newSqrtPriceX96 = BigInt(Math.floor(sqrtPriceNext * (2 ** 96)));
      effectivePrice = amountOut > 0n ? Number(amountOut) / Number(amountInAfterFee) : 0;
      
      console.log('🔄 Token0 -> Token1 计算:', {
        sqrtPrice,
        sqrtPriceNext,
        amountOutFloat,
        amountOut: amountOut.toString()
      });
    } else {
      // token1 -> token0
      const sqrtPriceNext = (liquidityFloat * sqrtPrice) / (liquidityFloat + amountInFloat * sqrtPrice);
      const amountOutFloat = liquidityFloat * (1/sqrtPriceNext - 1/sqrtPrice);
      
      amountOut = BigInt(Math.floor(Math.max(amountOutFloat, 0)));
      newSqrtPriceX96 = BigInt(Math.floor(sqrtPriceNext * (2 ** 96)));
      effectivePrice = amountOut > 0n ? Number(amountOut) / Number(amountInAfterFee) : 0;
      
      console.log('🔄 Token1 -> Token0 计算:', {
        sqrtPrice,
        sqrtPriceNext,
        amountOutFloat,
        amountOut: amountOut.toString()
      });
    }
    
    // 验证结果
    if (amountOut <= 0n) {
      console.warn('⚠️ 计算出的输出金额为0，使用fallback');
      return createFallbackSwapResult(amountInAfterFee, sqrtPriceX96, priceImpact, feeAmount);
    }
    
    const result: SwapResult = {
      amountOut,
      priceImpact,
      newSqrtPriceX96,
      effectivePrice,
      feeAmount
    };
    
    console.log('✅ 交换输出计算完成:', {
      输出金额: result.amountOut.toString(),
      价格影响: result.priceImpact.toFixed(4) + '%',
      有效价格: result.effectivePrice,
      手续费: result.feeAmount.toString()
    });
    
    return result;
  } catch (error) {
    console.error('❌ 交换输出计算失败:', error);
    return createZeroSwapResult(sqrtPriceX96);
  }
};

// ========== 辅助函数 ==========

// 创建零值交换结果
const createZeroSwapResult = (sqrtPriceX96: bigint, feeAmount: bigint = 0n): SwapResult => {
  return {
    amountOut: 0n,
    priceImpact: 0,
    newSqrtPriceX96: sqrtPriceX96,
    effectivePrice: 0,
    feeAmount
  };
};

// 创建fallback交换结果
const createFallbackSwapResult = (
  amountIn: bigint,
  sqrtPriceX96: bigint,
  priceImpact: number,
  feeAmount: bigint
): SwapResult => {
  // 使用简单的1:1兑换作为fallback
  const fallbackOutput = (amountIn * 997n) / 1000n; // 0.3% 滑点
  
  return {
    amountOut: fallbackOutput,
    priceImpact,
    newSqrtPriceX96: sqrtPriceX96,
    effectivePrice: Number(fallbackOutput) / Number(amountIn),
    feeAmount
  };
};

// ========== 池子选择和路径查找 ==========

// 寻找最佳交易路径
export const findBestTradingPool = (
  pools: PoolInfo[],
  tokenIn: string,
  tokenOut: string
): PoolInfo | null => {
  if (!pools || pools.length === 0) {
    console.log('❌ 池子数组为空');
    return null;
  }

  const tokenInLower = tokenIn.toLowerCase();
  const tokenOutLower = tokenOut.toLowerCase();
  
  const matchingPools = pools.filter(pool => 
    (pool.token0.toLowerCase() === tokenInLower && 
     pool.token1.toLowerCase() === tokenOutLower) ||
    (pool.token1.toLowerCase() === tokenInLower && 
     pool.token0.toLowerCase() === tokenOutLower)
  );
  
  if (matchingPools.length === 0) {
    console.log('❌ 未找到匹配的池子');
    return null;
  }
  
  if (matchingPools.length === 1) {
    console.log('✅ 找到唯一匹配池子');
    return matchingPools[0];
  }
  
  console.log(`🔍 找到 ${matchingPools.length} 个匹配的池子，开始选择最佳池子`);
  
  // 分层选择策略：优先流动性，其次手续费
  return matchingPools.reduce((best, current) => {
    const bestLiquidity = Number(best.liquidity);
    const currentLiquidity = Number(current.liquidity);
    
    // 计算流动性比率
    const liquidityRatio = bestLiquidity > 0 ? currentLiquidity / bestLiquidity : 1;
    
    console.log('🏊‍♂️ 池子比较:', {
      best: {
        pool: best.pool.slice(0, 10) + "...",
        liquidity: bestLiquidity,
        fee: best.fee
      },
      current: {
        pool: current.pool.slice(0, 10) + "...",
        liquidity: currentLiquidity,
        fee: current.fee
      },
      liquidityRatio: liquidityRatio.toFixed(2)
    });
    
    // 1. 如果当前池子流动性显著更高（>50%），选择当前池子
    if (liquidityRatio > 1.5) {
      console.log('✅ 选择流动性更高的池子');
      return current;
    }
    
    // 2. 如果当前池子流动性显著更低（<67%），保持最佳池子
    if (liquidityRatio < 0.67) {
      console.log('✅ 保持流动性更高的池子');
      return best;
    }
    
    // 3. 流动性相近时，选择手续费更低的池子
    if (current.fee < best.fee) {
      console.log('✅ 流动性相近，选择手续费更低的池子');
      return current;
    } else {
      console.log('✅ 流动性相近，保持手续费更低的池子');
      return best;
    }
  });
};

// 寻找多跳交易路径（通过中间代币）
export const findMultiHopPath = (
  pools: PoolInfo[],
  tokenIn: string,
  tokenOut: string,
  intermediateTokens: string[] = []
): PoolInfo[] | null => {
  // 直接路径
  const directPool = findBestTradingPool(pools, tokenIn, tokenOut);
  if (directPool) {
    console.log('✅ 找到直接交易路径');
    return [directPool];
  }
  
  console.log('🔍 寻找多跳交易路径...');
  
  // 尝试通过中间代币的路径
  for (const intermediateToken of intermediateTokens) {
    if (intermediateToken.toLowerCase() === tokenIn.toLowerCase() || 
        intermediateToken.toLowerCase() === tokenOut.toLowerCase()) {
      continue; // 跳过与输入或输出代币相同的中间代币
    }
    
    const firstHop = findBestTradingPool(pools, tokenIn, intermediateToken);
    const secondHop = findBestTradingPool(pools, intermediateToken, tokenOut);
    
    if (firstHop && secondHop) {
      console.log(`✅ 找到多跳路径: ${tokenIn} -> ${intermediateToken} -> ${tokenOut}`);
      return [firstHop, secondHop];
    }
  }
  
  console.log('❌ 未找到可用的交易路径');
  return null;
};

// 计算多跳交易的总输出
export const calculateMultiHopSwap = (
  amountIn: bigint,
  path: PoolInfo[],
  tokenDecimals: number[]
): MultiHopSwapResult => {
  let currentAmountIn = amountIn;
  let totalPriceImpact = 0;
  let totalFees = 0n;
  const pathDetails: SwapResult[] = [];
  
  console.log(`🛤️ 开始多跳交易计算，路径长度: ${path.length}`);
  
  if (path.length === 0) {
    console.warn('⚠️ 交易路径为空');
    return {
      finalAmountOut: 0n,
      totalPriceImpact: 0,
      totalFees: 0n,
      pathDetails: []
    };
  }
  
  for (let i = 0; i < path.length; i++) {
    const pool = path[i];
    const token0Decimals = tokenDecimals[i] || 18;
    const token1Decimals = tokenDecimals[i + 1] || 18;
    
    if (!pool) {
      console.error(`❌ 路径第${i}个池子为空`);
      break;
    }
    
    // 确定交易方向（这里需要根据实际 token 地址判断）
    // 简化处理，实际应该根据前一跳的输出token和当前池子的token地址判断
    const zeroForOne = i === 0 ? true : (i % 2 === 0);
    
    console.log(`🔄 第 ${i + 1} 跳交易:`, {
      输入金额: currentAmountIn.toString(),
      池子: pool.pool.slice(0, 10) + '...',
      方向: zeroForOne ? 'Token0->Token1' : 'Token1->Token0'
    });
    
    const swapResult = calculateSwapOutput(
      currentAmountIn,
      pool.sqrtPriceX96,
      pool.liquidity,
      pool.fee,
      zeroForOne,
      token0Decimals,
      token1Decimals
    );
    
    if (swapResult.amountOut <= 0n) {
      console.warn(`⚠️ 第${i + 1}跳输出为0，终止计算`);
      break;
    }
    
    pathDetails.push(swapResult);
    currentAmountIn = swapResult.amountOut;
    totalPriceImpact += swapResult.priceImpact;
    totalFees += swapResult.feeAmount;
    
    console.log(`✅ 第 ${i + 1} 跳完成:`, {
      输出金额: swapResult.amountOut.toString(),
      价格影响: swapResult.priceImpact.toFixed(4) + '%'
    });
  }
  
  const result: MultiHopSwapResult = {
    finalAmountOut: currentAmountIn,
    totalPriceImpact: Math.min(totalPriceImpact, 100),
    totalFees,
    pathDetails
  };
  
  console.log('🎯 多跳交易计算完成:', {
    最终输出: result.finalAmountOut.toString(),
    总价格影响: result.totalPriceImpact.toFixed(4) + '%',
    总手续费: result.totalFees.toString()
  });
  
  return result;
};

// ========== 格式化和工具函数 ==========

// 格式化流动性
export const formatLiquidity = (liquidity: bigint): string => {
  if (liquidity === 0n) return '0';
  
  const liquidityNum = Number(liquidity);
  
  if (!isFinite(liquidityNum)) return '无效';
  
  if (liquidityNum >= 1e12) {
    return `${(liquidityNum / 1e12).toFixed(2)}T`;
  } else if (liquidityNum >= 1e9) {
    return `${(liquidityNum / 1e9).toFixed(2)}B`;
  } else if (liquidityNum >= 1e6) {
    return `${(liquidityNum / 1e6).toFixed(2)}M`;
  } else if (liquidityNum >= 1e3) {
    return `${(liquidityNum / 1e3).toFixed(2)}K`;
  }
  return liquidityNum.toLocaleString();
};

// 格式化交换结果
export const formatSwapResult = (
  amountOut: bigint,
  decimals: number,
  symbol: string
): string => {
  if (amountOut === 0n) return `0 ${symbol}`;
  
  try {
    const formatted = formatUnits(amountOut, decimals);
    const num = parseFloat(formatted);
    
    if (!isFinite(num)) return `无效 ${symbol}`;
    
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M ${symbol}`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K ${symbol}`;
    } else if (num >= 1) {
      return `${num.toFixed(6)} ${symbol}`;
    } else {
      return `${num.toFixed(8)} ${symbol}`;
    }
  } catch (error) {
    console.error('❌ 格式化交换结果失败:', error);
    return `错误 ${symbol}`;
  }
};

// 格式化价格
export const formatPrice = (
  price: number,
  tokenInSymbol: string,
  tokenOutSymbol: string
): string => {
  if (!isFinite(price) || price === 0) {
    return `1 ${tokenInSymbol} = 0 ${tokenOutSymbol}`;
  }
  
  if (price >= 1000000) {
    return `1 ${tokenInSymbol} = ${(price / 1000000).toFixed(2)}M ${tokenOutSymbol}`;
  } else if (price >= 1000) {
    return `1 ${tokenInSymbol} = ${(price / 1000).toFixed(2)}K ${tokenOutSymbol}`;
  } else if (price >= 1) {
    return `1 ${tokenInSymbol} = ${price.toFixed(6)} ${tokenOutSymbol}`;
  } else {
    return `1 ${tokenInSymbol} = ${price.toFixed(8)} ${tokenOutSymbol}`;
  }
};

// 计算价格区间
export const calculatePriceRange = (
  tickLower: number,
  tickUpper: number,
  token0Decimals: number = 18,
  token1Decimals: number = 18
): PriceRangeResult => {
  const lowerPrice = calculatePriceFromTick(tickLower, token0Decimals, token1Decimals);
  const upperPrice = calculatePriceFromTick(tickUpper, token0Decimals, token1Decimals);
  
  return {
    lowerPrice: lowerPrice.token0PerToken1,
    upperPrice: upperPrice.token0PerToken1,
    currentInRange: false, // 需要传入当前 tick 来判断
  };
};

// 检查流动性位置是否在范围内
// 检查流动性位置是否在范围内
export const isPositionInRange = (
  currentTick: number,
  tickLower: number,
  tickUpper: number
): boolean => {
  return currentTick >= tickLower && currentTick <= tickUpper;
};

// 计算 APR（年化收益率）
export const calculateAPR = (
  feeEarned: bigint,
  liquidityValue: bigint,
  timeInSeconds: number
): number => {
  if (liquidityValue === 0n || timeInSeconds === 0) return 0;
  
  try {
    const feeEarnedFloat = Number(feeEarned);
    const liquidityValueFloat = Number(liquidityValue);
    
    if (!isFinite(feeEarnedFloat) || !isFinite(liquidityValueFloat)) {
      return 0;
    }
    
    const timeInYears = timeInSeconds / (365 * 24 * 60 * 60);
    
    if (timeInYears <= 0) return 0;
    
    return (feeEarnedFloat / liquidityValueFloat) / timeInYears * 100;
  } catch (error) {
    console.error('❌ APR计算失败:', error);
    return 0;
  }
};

// 估算 Gas 费用
export const estimateGasCost = (
  swapType: 'single' | 'multi',
  poolCount: number = 1
): GasEstimateResult => {
  let baseGas = 150000; // 基础 Gas
  
  if (swapType === 'multi') {
    baseGas += (poolCount - 1) * 80000; // 每个额外的池子增加 Gas
  }
  
  // 添加安全边际
  const gasLimit = Math.floor(baseGas * 1.2);
  
  return {
    gasLimit,
    gasLimitString: gasLimit.toLocaleString()
  };
};

// 验证交换参数
export const validateSwapParams = (
  tokenIn: Token,
  tokenOut: Token,
  amountIn: string,
  pools: PoolInfo[]
): ValidationResult => {
  console.log('🔍 验证交换参数:', {
    tokenIn: tokenIn?.symbol,
    tokenOut: tokenOut?.symbol,
    amountIn,
    poolsCount: pools?.length
  });
  
  // 检查代币地址
  if (!tokenIn?.address || !tokenOut?.address) {
    return { isValid: false, error: '代币地址无效' };
  }
  
  // 检查是否是相同代币
  if (tokenIn.address.toLowerCase() === tokenOut.address.toLowerCase()) {
    return { isValid: false, error: '不能交换相同的代币' };
  }
  
  // 检查输入金额
  if (!amountIn || parseFloat(amountIn) <= 0) {
    return { isValid: false, error: '输入金额必须大于 0' };
  }
  
  // 检查是否有可用的池子
  if (!pools || pools.length === 0) {
    return { isValid: false, error: '没有可用的流动性池' };
  }
  
  const availablePool = findBestTradingPool(pools, tokenIn.address, tokenOut.address);
  if (!availablePool) {
    return { isValid: false, error: '未找到可用的交易池' };
  }
  
  // 检查池子流动性
  if (availablePool.liquidity === 0n) {
    return { isValid: false, error: '池子流动性不足' };
  }
  
  console.log('✅ 参数验证通过');
  return { isValid: true };
};

// ========== 高级计算函数 ==========

// 使用预定义汇率计算输出金额（fallback方案）
export const calculateOutputWithFallbackRate = (
  tokenIn: Token,
  tokenOut: Token,
  amountIn: string
): bigint => {
  console.log('🔄 使用fallback汇率计算:', {
    tokenIn: tokenIn.symbol,
    tokenOut: tokenOut.symbol,
    amountIn
  });
  
  try {
    const inputAmount = parseUnits(amountIn, tokenIn.decimals);
    
    // 获取汇率
    const rate = getExchangeRate(tokenIn.symbol, tokenOut.symbol);
    console.log('📊 获取到汇率:', rate);
    
    if (rate === 0) {
      console.warn('⚠️ 汇率为0，使用1:1');
      return inputAmount;
    }
    
    // 计算输出金额
    const outputFloat = parseFloat(amountIn) * rate;
    const outputAmount = parseUnits(outputFloat.toFixed(tokenOut.decimals), tokenOut.decimals);
    
    console.log('✅ Fallback计算完成:', {
      输入: amountIn,
      汇率: rate,
      输出浮点: outputFloat,
      输出BigInt: outputAmount.toString()
    });
    
    return outputAmount;
  } catch (error) {
    console.error('❌ Fallback汇率计算失败:', error);
    // 最后的fallback：1:1兑换
    return parseUnits(amountIn, tokenOut.decimals);
  }
};

// 获取预定义的汇率
export const getExchangeRate = (
  tokenInSymbol: string,
  tokenOutSymbol: string
): number => {
  const rates = TOKEN_EXCHANGE_RATES[tokenInSymbol];
  if (!rates) {
    console.warn(`⚠️ 未找到 ${tokenInSymbol} 的汇率表`);
    return 1; // 默认1:1
  }
  
  const rate = rates[tokenOutSymbol];
  if (rate === undefined) {
    console.warn(`⚠️ 未找到 ${tokenInSymbol} -> ${tokenOutSymbol} 的汇率`);
    return 1; // 默认1:1
  }
  
  return rate;
};

// 计算滑点保护的最小输出金额
export const calculateMinimumOutput = (
  outputAmount: bigint,
  slippagePercent: number,
  decimals: number
): {
  minOutput: bigint;
  minOutputFormatted: string;
  slippageAmount: bigint;
  slippageAmountFormatted: string;
} => {
  try {
    const slippageMultiplier = (100 - slippagePercent) / 100;
    const minOutputFloat = Number(formatUnits(outputAmount, decimals)) * slippageMultiplier;
    const minOutput = parseUnits(minOutputFloat.toFixed(decimals), decimals);
    const slippageAmount = outputAmount - minOutput;
    
    return {
      minOutput,
      minOutputFormatted: formatUnits(minOutput, decimals),
      slippageAmount,
      slippageAmountFormatted: formatUnits(slippageAmount, decimals)
    };
  } catch (error) {
    console.error('❌ 滑点计算失败:', error);
    return {
      minOutput: outputAmount,
      minOutputFormatted: formatUnits(outputAmount, decimals),
      slippageAmount: 0n,
      slippageAmountFormatted: '0'
    };
  }
};

// 计算交易路径的总费用
export const calculateTotalFees = (
  amountIn: bigint,
  path: PoolInfo[]
): {
  totalFees: bigint;
  totalFeesFormatted: string;
  feePercentage: number;
  pathFees: Array<{
    poolAddress: string;
    fee: number;
    feeAmount: bigint;
    feeAmountFormatted: string;
  }>;
} => {
  let totalFees = 0n;
  let currentAmount = amountIn;
  const pathFees: Array<{
    poolAddress: string;
    fee: number;
    feeAmount: bigint;
    feeAmountFormatted: string;
  }> = [];
  
  for (const pool of path) {
    const feeAmount = (currentAmount * BigInt(pool.fee)) / BigInt(1000000);
    totalFees += feeAmount;
    
    pathFees.push({
      poolAddress: pool.pool,
      fee: pool.fee,
      feeAmount,
      feeAmountFormatted: formatUnits(feeAmount, 18) // 假设18位小数
    });
    
    currentAmount -= feeAmount;
  }
  
  const feePercentage = amountIn > 0n ? 
    (Number(totalFees) / Number(amountIn)) * 100 : 0;
  
  return {
    totalFees,
    totalFeesFormatted: formatUnits(totalFees, 18),
    feePercentage,
    pathFees
  };
};

// 评估交易的复杂度和风险
export const assessTradeComplexity = (
  path: PoolInfo[],
  totalPriceImpact: number,
  totalLiquidity: bigint
): {
  complexityLevel: 'simple' | 'moderate' | 'complex' | 'high-risk';
  riskFactors: string[];
  recommendations: string[];
  score: number; // 0-100, 100是最安全的
} => {
  const riskFactors: string[] = [];
  const recommendations: string[] = [];
  let score = 100;
  
  // 路径复杂度评估
  if (path.length > 1) {
    score -= 20;
    riskFactors.push('多跳交易增加失败风险');
    recommendations.push('考虑直接交易路径');
  }
  
  if (path.length > 2) {
    score -= 30;
    riskFactors.push('交易路径过于复杂');
    recommendations.push('分解为多个简单交易');
  }
  
  // 价格影响评估
  if (totalPriceImpact > 1) {
    score -= 15;
    riskFactors.push('价格影响较大');
    recommendations.push('考虑分批交易');
  }
  
  if (totalPriceImpact > 5) {
    score -= 25;
    riskFactors.push('价格影响过大');
    recommendations.push('减少交易金额或等待更好时机');
  }
  
  // 流动性评估
  const liquidityNum = Number(totalLiquidity);
  if (liquidityNum < 100000) {
    score -= 30;
    riskFactors.push('流动性不足');
    recommendations.push('等待流动性增加');
  }
  
  // 确定复杂度等级
  let complexityLevel: 'simple' | 'moderate' | 'complex' | 'high-risk';
  if (score >= 80) {
    complexityLevel = 'simple';
  } else if (score >= 60) {
    complexityLevel = 'moderate';
  } else if (score >= 40) {
    complexityLevel = 'complex';
  } else {
    complexityLevel = 'high-risk';
  }
  
  return {
    complexityLevel,
    riskFactors,
    recommendations,
    score: Math.max(0, score)
  };
};

// ========== 数学工具函数 ==========

// 安全的BigInt除法（避免除零）
export const safeBigIntDivision = (
  numerator: bigint,
  denominator: bigint,
  defaultValue: bigint = 0n
): bigint => {
  if (denominator === 0n) {
    console.warn('⚠️ 除零错误，返回默认值');
    return defaultValue;
  }
  return numerator / denominator;
};

// 安全的数字除法
export const safeNumberDivision = (
  numerator: number,
  denominator: number,
  defaultValue: number = 0
): number => {
  if (denominator === 0 || !isFinite(denominator)) {
    console.warn('⚠️ 除零或无效除数，返回默认值');
    return defaultValue;
  }
  const result = numerator / denominator;
  return isFinite(result) ? result : defaultValue;
};

// 计算平方根（用于价格计算）
export const calculateSqrtPrice = (price: number): bigint => {
  if (price <= 0 || !isFinite(price)) {
    console.warn('⚠️ 无效价格，返回默认sqrtPrice');
    return 79228162514264337593543950336n; // sqrt(1) * 2^96
  }
  
  try {
    const sqrt = Math.sqrt(price);
    const sqrtPriceX96 = BigInt(Math.floor(sqrt * (2 ** 96)));
    return sqrtPriceX96;
  } catch (error) {
    console.error('❌ 计算sqrtPrice失败:', error);
    return 79228162514264337593543950336n;
  }
};

// 从价格计算tick
export const priceToTick = (price: number): number => {
  if (price <= 0 || !isFinite(price)) {
    console.warn('⚠️ 无效价格，返回默认tick');
    return 0;
  }
  
  try {
    const tick = Math.floor(Math.log(price) / Math.log(1.0001));
    return Math.max(MIN_TICK, Math.min(MAX_TICK, tick));
  } catch (error) {
    console.error('❌ 价格转tick失败:', error);
    return 0;
  }
};

// 从tick计算价格
export const tickToPrice = (tick: number): number => {
  if (tick < MIN_TICK || tick > MAX_TICK) {
    console.warn(`⚠️ tick ${tick} 超出范围，返回默认价格`);
    return 1;
  }
  
  try {
    return Math.pow(1.0001, tick);
  } catch (error) {
    console.error('❌ tick转价格失败:', error);
    return 1;
  }
};

// ========== 缓存和优化 ==========

// 简单的内存缓存
const calculationCache = new Map<string, {
  result: SwapResult;
  timestamp: number;
}>();

const CACHE_TTL = 30000; // 30秒缓存

// 带缓存的交换计算
export const calculateSwapOutputWithCache = (
  amountIn: bigint,
  sqrtPriceX96: bigint,
  liquidity: bigint,
  fee: number,
  zeroForOne: boolean,
  token0Decimals: number = 18,
  token1Decimals: number = 18
): SwapResult => {
  const cacheKey = `${amountIn.toString()}-${sqrtPriceX96.toString()}-${liquidity.toString()}-${fee}-${zeroForOne}`;
  
  // 检查缓存
  const cached = calculationCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log('✅ 使用缓存的计算结果');
    return cached.result;
  }
  
  // 计算新结果
  const result = calculateSwapOutput(
    amountIn,
    sqrtPriceX96,
    liquidity,
    fee,
    zeroForOne,
    token0Decimals,
    token1Decimals
  );
  
  // 存储到缓存
  calculationCache.set(cacheKey, {
    result,
    timestamp: Date.now()
  });
  
  // 清理过期缓存
  cleanExpiredCache();
  
  return result;
};

// 清理过期缓存
const cleanExpiredCache = (): void => {
  const now = Date.now();
  for (const [key, value] of calculationCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      calculationCache.delete(key);
    }
  }
};

// 清空所有缓存
export const clearCalculationCache = (): void => {
  calculationCache.clear();
  console.log('🧹 已清空计算缓存');
};

// ========== 调试和监控 ==========

// 性能监控装饰器
export const withPerformanceMonitoring = <T extends unknown[], R>(
  fn: (...args: T) => R,
  name: string
): ((...args: T) => R) => {
  return (...args: T): R => {
    const startTime = Date.now();
    try {
      const result = fn(...args);
      const endTime = Date.now();
      console.log(`⏱️ ${name} 执行时间: ${endTime - startTime}ms`);
      return result;
    } catch (error) {
      const endTime = Date.now();
      console.error(`❌ ${name} 执行失败 (${endTime - startTime}ms):`, error);
      throw error;
    }
  };
};

// 创建性能监控版本的函数
export const calculateSwapOutputMonitored = withPerformanceMonitoring(
  calculateSwapOutput,
  'calculateSwapOutput'
);

export const findBestTradingPoolMonitored = withPerformanceMonitoring(
  findBestTradingPool,
  'findBestTradingPool'
);

// ========== 导出所有类型和函数 ==========



// 导出常量
export {
  Q96,
  Q192,
  MIN_TICK,
  MAX_TICK,
  TOKEN_EXCHANGE_RATES
};
