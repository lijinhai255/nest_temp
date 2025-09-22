// utils/priceCalculations.ts
import { formatUnits } from 'viem';

// 池子数据接口（基于你的数据结构）
interface PoolInfo {
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

// 从 sqrtPriceX96 计算价格
export const calculatePriceFromSqrtPriceX96 = (
  sqrtPriceX96: bigint,
  token0Decimals: number = 18,
  token1Decimals: number = 18
): {
  token0PerToken1: number;
  token1PerToken0: number;
} => {
  // 将 bigint 转换为 number（注意精度损失）
  const sqrtPrice = Number(sqrtPriceX96);
  
  // 计算价格：(sqrtPrice / 2^96)^2
  const Q96 = Math.pow(2, 96);
  const price = Math.pow(sqrtPrice / Q96, 2);
  
  // 调整小数位差异
  const decimalAdjustment = Math.pow(10, token1Decimals - token0Decimals);
  const adjustedPrice = price * decimalAdjustment;
  
  return {
    token0PerToken1: adjustedPrice,
    token1PerToken0: 1 / adjustedPrice,
  };
};

// 从 tick 计算价格（更精确的方法）
export const calculatePriceFromTick = (
  tick: number,
  token0Decimals: number = 18,
  token1Decimals: number = 18
): {
  token0PerToken1: number;
  token1PerToken0: number;
} => {
  // price = 1.0001^tick
  const price = Math.pow(1.0001, tick);
  
  // 调整小数位差异
  const decimalAdjustment = Math.pow(10, token1Decimals - token0Decimals);
  const adjustedPrice = price * decimalAdjustment;
  
  return {
    token0PerToken1: adjustedPrice,
    token1PerToken0: 1 / adjustedPrice,
  };
};

// 格式化流动性
export const formatLiquidity = (liquidity: bigint): string => {
  const liquidityNum = Number(liquidity);
  if (liquidityNum === 0) return '0';
  
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

// 计算价格区间
export const calculatePriceRange = (
  tickLower: number,
  tickUpper: number,
  token0Decimals: number = 18,
  token1Decimals: number = 18
): {
  lowerPrice: number;
  upperPrice: number;
} => {
  const lowerPrice = calculatePriceFromTick(tickLower, token0Decimals, token1Decimals);
  const upperPrice = calculatePriceFromTick(tickUpper, token0Decimals, token1Decimals);
  
  return {
    lowerPrice: lowerPrice.token0PerToken1,
    upperPrice: upperPrice.token0PerToken1,
  };
};
