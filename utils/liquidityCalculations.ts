// utils/liquidityCalculations.ts - 完整修复版本
import { formatUnits, parseUnits } from 'viem';

// ========== 导入价格计算相关函数 ==========
import {
  calculatePriceFromSqrtPriceX96,
  calculatePriceFromTick,
  findBestTradingPool,
  type PoolInfo,
  type Token,
  type SwapResult,
  type PriceInfo,
  calculatePriceImpactFromLiquidity
} from './priceCalculations';

// ========== 从 tick 计算精确的 sqrtPriceX96 ==========
export const getSqrtPriceX96FromTick = (tick: number): bigint => {
  // 使用 Uniswap V3 的精确公式: sqrt(1.0001^tick) * 2^96
  const price = Math.pow(1.0001, tick);
  const sqrtPrice = Math.sqrt(price);
  const Q96 = Math.pow(2, 96);
  return BigInt(Math.floor(sqrtPrice * Q96));
};

// ========== 从 sqrtPriceX96 计算当前 tick ==========
export const getTickFromSqrtPriceX96 = (sqrtPriceX96: bigint): number => {
  const Q96 = BigInt(2) ** BigInt(96);
  const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
  const price = sqrtPrice * sqrtPrice;
  
  // 使用 Uniswap V3 的精确公式: tick = floor(log(price) / log(1.0001))
  const tick = Math.floor(Math.log(price) / Math.log(1.0001));
  return tick;
};

// ========== 根据手续费获取 tick spacing ==========
export const getTickSpacingFromFee = (fee: number): number => {
  // Uniswap V3 标准 tick spacing
  switch (fee) {
    case 100: return 1;    // 0.01%
    case 500: return 10;   // 0.05%
    case 3000: return 60;  // 0.3%
    case 10000: return 200; // 1%
    default: return 60;    // 默认值
  }
};

// ========== 检查流动性是否在有效范围内 ==========
export const checkLiquidityInRange = (
  poolInfo: PoolInfo,
  currentTick?: number
): {
  isInRange: boolean;
  activeLiquidity: bigint;
  tickSpacing: number;
  reason?: string;
} => {
  // 根据手续费确定 tick spacing
  const tickSpacing = getTickSpacingFromFee(poolInfo.fee);
  const calculatedTick = currentTick || getTickFromSqrtPriceX96(poolInfo.sqrtPriceX96);
  
  console.log('🎯 检查流动性范围:', {
    poolAddress: poolInfo.pool,
    currentTick: calculatedTick,
    tickLower: poolInfo.tickLower,
    tickUpper: poolInfo.tickUpper,
    tickSpacing,
    poolLiquidity: poolInfo.liquidity.toString()
  });

  // 检查当前价格是否在流动性范围内
  const isInRange = calculatedTick >= poolInfo.tickLower && calculatedTick <= poolInfo.tickUpper;
  
  // 如果在范围内，使用池子的流动性；否则为 0
  const activeLiquidity = isInRange ? poolInfo.liquidity : 0n;
  
  return {
    isInRange,
    activeLiquidity,
    tickSpacing,
    reason: isInRange ? undefined : `当前价格 (tick: ${calculatedTick}) 不在流动性范围内 [${poolInfo.tickLower}, ${poolInfo.tickUpper}]`
  };
};

// ========== 基于 Uniswap V3 的精确价格影响计算 ==========
export const calculatePriceImpactV3 = (
  amountIn: bigint,
  liquidity: bigint,
  zeroForOne: boolean
): number => {
  if (liquidity === 0n) return 100;
  
  // 使用 Uniswap V3 的价格影响公式
  // 价格影响 ≈ amountIn / (2 * liquidity) 对于小额交易
  const amountInFloat = Number(amountIn);
  const liquidityFloat = Number(liquidity);
  
  // 基础价格影响
  const baseImpact = amountInFloat / (2 * liquidityFloat);
  
  // 转换为百分比并应用非线性调整
  const impactPercent = baseImpact * 100;
  
  // 对于大额交易，价格影响会非线性增长
  const nonLinearFactor = Math.pow(1 + baseImpact, 2);
  const adjustedImpact = impactPercent * nonLinearFactor;
  
  
  return Math.min(Math.max(adjustedImpact, 0), 100);
};

// ========== 基于 Uniswap V3 公式的最大交易量计算 ==========
export const calculateMaxTradeSize = (
  poolInfo: PoolInfo,
  liquidity: bigint,
  zeroForOne: boolean,
  maxLiquidityPercent: number = 10,
  token0Decimals: number = 18,
  token1Decimals: number = 18
): {
  maxTradeSize: bigint;
  priceImpact: number;
} => {
  // 1. 设置目标价格影响（比如最大10%）
  const targetPriceImpact = 10; // 10%
  
  // 2. 基于流动性计算合理的交易量
  // 使用您之前函数中的逻辑：priceImpact = amountIn / liquidity
  // 逆向计算：amountIn = targetPriceImpact * liquidity / 100
  let maxTradeSize = (liquidity * BigInt(targetPriceImpact)) / BigInt(100);
  
  // 3. 转换为正确的token单位
  if (zeroForOne) {
    // token0 -> token1，确保maxTradeSize是token0的单位
    maxTradeSize = maxTradeSize / BigInt(10 ** (18 - token0Decimals));
  } else {
    // token1 -> token0，确保maxTradeSize是token1的单位  
    maxTradeSize = maxTradeSize / BigInt(10 ** (18 - token1Decimals));
  }
  
  // 4. 设置合理的上下限
  const minTradeSize = BigInt(1) * BigInt(10 ** (zeroForOne ? token0Decimals : token1Decimals));
  const maxLimit = BigInt(10000) * BigInt(10 ** (zeroForOne ? token0Decimals : token1Decimals));
  
  if (maxTradeSize < minTradeSize) {
    maxTradeSize = minTradeSize;
  }
  if (maxTradeSize > maxLimit) {
    maxTradeSize = maxLimit;
  }
  
  
  // 5. 使用您的函数计算实际的价格影响
  const priceImpact = calculatePriceImpactFromLiquidity(
    maxTradeSize,
    liquidity,
    poolInfo.sqrtPriceX96,
    zeroForOne
  );
  
  return {
    maxTradeSize,
    priceImpact
  };
};




// ========== 精确的流动性充足性检查 ==========
export const validateLiquiditySufficiency = (
  poolInfo: PoolInfo,
  amountIn: bigint,
  zeroForOne: boolean,
  tokenInDecimals: number = 18,
  tokenOutDecimals: number = 18
): {
  isSufficient: boolean;
  maxTradeSize: bigint;
  availableLiquidity: bigint;
  priceImpact: number;
  reason?: string;
} => {
  console.log('💧 验证流动性充足性:', {
    poolAddress: poolInfo.pool,
    amountIn: amountIn.toString(),
    zeroForOne,
    poolLiquidity: poolInfo.liquidity.toString(),
    sqrtPriceX96: poolInfo.sqrtPriceX96.toString()
  });

  // 1. 检查流动性是否在有效范围内
  const rangeCheck = checkLiquidityInRange(poolInfo);
  
  if (!rangeCheck.isInRange || rangeCheck.activeLiquidity === 0n) {
    return {
      isSufficient: false,
      maxTradeSize: 0n,
      availableLiquidity: 0n,
      priceImpact: 100,
      reason: rangeCheck.reason || '没有有效流动性'
    };
  }

  // 2. 使用 Uniswap V3 的精确公式计算最大交易量
  const { maxTradeSize, priceImpact } = calculateMaxTradeSize(
    poolInfo,
    rangeCheck.activeLiquidity,
    zeroForOne,
    tokenInDecimals,
    tokenOutDecimals
  );

  // 3. 应用安全边际（90%）
  const safeMaxTradeSize = (maxTradeSize * 90n) / 100n;
  
  const isSufficient = amountIn <= safeMaxTradeSize;
  
  console.log('✅ 流动性验证结果:', {
    activeLiquidity: rangeCheck.activeLiquidity.toString(),
    maxTradeSize: maxTradeSize.toString(),
    safeMaxTradeSize: safeMaxTradeSize.toString(),
    amountIn: amountIn.toString(),
    priceImpact: `${priceImpact.toFixed(4)}%`,
    isSufficient
  });

  return {
    isSufficient,
    maxTradeSize: safeMaxTradeSize,
    availableLiquidity: rangeCheck.activeLiquidity,
    priceImpact,
    reason: isSufficient ? undefined : `交易金额超过最大可交易量 ${formatUnits(safeMaxTradeSize, tokenInDecimals)}`
  };
};

// ========== 改进的交换输出计算（基于 Uniswap V3 公式）==========
// ========== 修正的 Uniswap V3 交换计算 ==========
export const calculateSwapOutputV3 = (
  amountIn: bigint,
  sqrtPriceX96: bigint,
  liquidity: bigint,
  fee: number,
  zeroForOne: boolean,
  token0Decimals: number = 18,
  token1Decimals: number = 18
): SwapResult => {
  console.log('🔄 计算交换输出 (修正的V3公式):', {
    amountIn: amountIn.toString(),
    sqrtPriceX96: sqrtPriceX96.toString(),
    liquidity: liquidity.toString(),
    fee,
    zeroForOne
  });

  // 1. 计算手续费 (基于 Uniswap V3 标准)
  const feeAmount = (amountIn * BigInt(fee)) / BigInt(1000000);
  const amountInAfterFee = amountIn - feeAmount;
  
  // 2. 常量定义
  const Q96 = BigInt(2) ** BigInt(96);
  const Q192 = Q96 * Q96;
  
  let amountOut: bigint;
  let newSqrtPriceX96: bigint;
  
  try {
    if (zeroForOne) {
      // token0 -> token1 交换
      // 基于官方 SwapMath.computeSwapStep 实现
      
      // 计算新的 sqrtPrice (价格下降)
      const liquidityShifted = liquidity << BigInt(96);
      const product = amountInAfterFee * sqrtPriceX96;
      const denominator = liquidityShifted + product;
      
      newSqrtPriceX96 = liquidityShifted / denominator;
      
      // 计算输出金额
      const numerator = liquidity * (sqrtPriceX96 - newSqrtPriceX96);
      amountOut = numerator / Q96;
      
    } else {
      // token1 -> token0 交换
      // 价格上升的情况
      
      // 计算新的 sqrtPrice
      const quotient = (amountInAfterFee << BigInt(96)) / liquidity;
      newSqrtPriceX96 = sqrtPriceX96 + quotient;
      
      // 计算输出金额
      const numerator1 = liquidity * (newSqrtPriceX96 - sqrtPriceX96);
      const numerator2 = sqrtPriceX96 * newSqrtPriceX96;
      amountOut = numerator1 / (numerator2 / Q96);
    }
    
    // 3. 安全检查
    if (amountOut < 0n) {
      throw new Error('计算出负数输出金额');
    }
    
    if (newSqrtPriceX96 <= 0n) {
      throw new Error('新价格计算异常');
    }
    
  } catch (error) {
    console.error('❌ 交换计算出错:', error);
    return {
      amountOut: 0n,
      priceImpact: 100,
      newSqrtPriceX96: sqrtPriceX96,
      effectivePrice: 0,
      feeAmount: 0n
    };
  }
  
  // 4. 计算价格影响 (基于价格变化)
  const oldPrice = (sqrtPriceX96 * sqrtPriceX96) / Q192;
  const newPrice = (newSqrtPriceX96 * newSqrtPriceX96) / Q192;
  
  let priceImpact: number;
  if (oldPrice > 0n) {
    const priceDiff = oldPrice > newPrice ? oldPrice - newPrice : newPrice - oldPrice;
    priceImpact = Number(priceDiff * BigInt(10000) / oldPrice) / 100;
  } else {
    priceImpact = 0;
  }
  
  // 5. 计算有效价格 (使用正确的精度处理)
  const effectivePrice = amountInAfterFee > 0n 
    ? Number(amountOut * BigInt(10**18)) / Number(amountInAfterFee * BigInt(10**18))
    : 0;
  
  const result = {
    amountOut,
    priceImpact,
    newSqrtPriceX96,
    effectivePrice,
    feeAmount
  };
  
  
  console.log('✅ 修正后的交换计算结果:', {
    输入金额: formatUnits(amountIn, token0Decimals),
    输出金额: formatUnits(amountOut, token1Decimals),
    价格影响: `${priceImpact.toFixed(4)}%`,
    有效价格: effectivePrice.toFixed(8),
    手续费: formatUnits(feeAmount, token0Decimals),
    旧价格: oldPrice.toString(),
    新价格: newPrice.toString()
  });
  
  return result;
};

// ========== 辅助函数：精确的价格计算 ==========
export const calculateExactPrice = (
  sqrtPriceX96: bigint,
  token0Decimals: number,
  token1Decimals: number
): { price: number, priceFormatted: string } => {
  const Q96 = BigInt(2) ** BigInt(96);
  const Q192 = Q96 * Q96;
  
  // 计算原始价格 (token1/token0)
  const priceX192 = (sqrtPriceX96 * sqrtPriceX96);
  const decimalAdjustment = BigInt(10 ** (token1Decimals - token0Decimals));
  
  // 转换为可读格式
  const price = Number(priceX192 * decimalAdjustment / Q192) / (10 ** token1Decimals);
  
  return {
    price,
    priceFormatted: price.toFixed(8)
  };
};

// ========== 修复后的验证函数 ==========
export const validateSwapParamsV3 = (
  tokenIn: Token,
  tokenOut: Token,
  amountIn: string,
  pools: PoolInfo[]
): {
  isValid: boolean;
  error?: string;
  bestPool?: PoolInfo;
  liquidityCheck?: ReturnType<typeof validateLiquiditySufficiency>;
} => {
  // 基础验证
  if (!tokenIn.address || !tokenOut.address) {
    return { isValid: false, error: '代币地址无效' };
  }
  
  if (tokenIn.address.toLowerCase() === tokenOut.address.toLowerCase()) {
    return { isValid: false, error: '不能交换相同的代币' };
  }
  
  if (!amountIn || parseFloat(amountIn) <= 0) {
    return { isValid: false, error: '输入金额必须大于 0' };
  }
  
  // 寻找最佳池子
  const bestPool = findBestTradingPool(pools, tokenIn.address, tokenOut.address);
  if (!bestPool) {
    return { isValid: false, error: '未找到可用的交易池' };
  }
  
  // 转换金额
  const amountInBigInt = parseUnits(amountIn, tokenIn.decimals);
  const zeroForOne = bestPool.token0.toLowerCase() === tokenIn.address.toLowerCase();
  
  // 精确的流动性验证
  const liquidityCheck = validateLiquiditySufficiency(
    bestPool,
    amountInBigInt,
    zeroForOne,
    tokenIn.decimals,
    tokenOut.decimals
  );
  
  if (!liquidityCheck.isSufficient) {
    return {
      isValid: false,
      error: liquidityCheck.reason,
      bestPool,
      liquidityCheck
    };
  }
  
  return {
    isValid: true,
    bestPool,
    liquidityCheck
  };
};

// ========== 流动性范围计算 ==========
export const calculateLiquidityRange = (
  poolInfo: PoolInfo,
  token0Decimals: number = 18,
  token1Decimals: number = 18
): {
  currentPrice: PriceInfo;
  lowerPrice: PriceInfo;
  upperPrice: PriceInfo;
  isInRange: boolean;
  utilization: number;
} => {
  const currentPrice = calculatePriceFromSqrtPriceX96(
    poolInfo.sqrtPriceX96,
    token0Decimals,
    token1Decimals
  );
  
  const lowerPrice = calculatePriceFromTick(
    poolInfo.tickLower,
    token0Decimals,
    token1Decimals
  );
  
  const upperPrice = calculatePriceFromTick(
    poolInfo.tickUpper,
    token0Decimals,
    token1Decimals
  );
  
  const currentTick = getTickFromSqrtPriceX96(poolInfo.sqrtPriceX96);
  const isInRange = currentTick >= poolInfo.tickLower && currentTick <= poolInfo.tickUpper;
  
  // 计算流动性利用率
  const tickRange = poolInfo.tickUpper - poolInfo.tickLower;
  const currentPosition = currentTick - poolInfo.tickLower;
  const utilization = isInRange ? (currentPosition / tickRange) * 100 : 0;
  
  return {
    currentPrice,
    lowerPrice,
    upperPrice,
    isInRange,
    utilization: Math.max(0, Math.min(100, utilization))
  };
};

// ========== 流动性健康度评估 ==========
export const assessLiquidityHealth = (
  poolInfo: PoolInfo,
  token0Decimals: number = 18,
  token1Decimals: number = 18
): {
  healthScore: number;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  recommendations: string[];
  metrics: {
    liquidityAmount: string;
    priceRange: string;
    utilization: number;
    tickSpacing: number;
  };
} => {
  const rangeInfo = calculateLiquidityRange(poolInfo, token0Decimals, token1Decimals);
  const liquidityCheck = checkLiquidityInRange(poolInfo);
  
  let healthScore = 0;
  const recommendations: string[] = [];
  
  // 1. 流动性数量评分 (40分)
  const liquidityNum = Number(poolInfo.liquidity);
  if (liquidityNum > 1e18) {
    healthScore += 40;
  } else if (liquidityNum > 1e15) {
    healthScore += 30;
    recommendations.push('考虑增加流动性以提高交易深度');
  } else if (liquidityNum > 1e12) {
    healthScore += 20;
    recommendations.push('流动性较低，可能影响大额交易');
  } else {
    healthScore += 10;
    recommendations.push('流动性严重不足，建议谨慎交易');
  }
  
  // 2. 价格范围评分 (30分)
  if (rangeInfo.isInRange) {
    healthScore += 30;
  } else {
    recommendations.push('当前价格不在流动性范围内，无法进行交易');
  }
  
  // 3. 利用率评分 (20分)
  if (rangeInfo.utilization >= 40 && rangeInfo.utilization <= 60) {
    healthScore += 20;
  } else if (rangeInfo.utilization >= 20 && rangeInfo.utilization <= 80) {
    healthScore += 15;
  } else {
    healthScore += 5;
    recommendations.push('流动性利用率不均衡，考虑调整价格范围');
  }
  
  // 4. 手续费合理性评分 (10分)
  if (poolInfo.fee >= 500 && poolInfo.fee <= 3000) {
    healthScore += 10;
  } else {
    healthScore += 5;
    recommendations.push('手续费设置可能不够合理');
  }
  
  // 确定状态
  let status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  if (healthScore >= 90) status = 'excellent';
  else if (healthScore >= 70) status = 'good';
  else if (healthScore >= 50) status = 'fair';
  else if (healthScore >= 30) status = 'poor';
  else status = 'critical';
  
  return {
    healthScore,
    status,
    recommendations,
    metrics: {
      liquidityAmount: formatUnits(poolInfo.liquidity, 18),
      priceRange: `${rangeInfo.lowerPrice.token0PerToken1.toFixed(6)} - ${rangeInfo.upperPrice.token0PerToken1.toFixed(6)}`,
      utilization: rangeInfo.utilization,
      tickSpacing: liquidityCheck.tickSpacing
    }
  };
};

// ========== 导出所有类型 ==========

