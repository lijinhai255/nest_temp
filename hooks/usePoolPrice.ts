// hooks/usePoolPrice.ts
import { useState, useEffect, useMemo } from 'react';
import { calculatePriceFromSqrtPriceX96, calculatePriceFromTick, formatLiquidity } from '@/utils/priceCalculations';

interface PoolPrice {
  currentPrice: {
    token0PerToken1: number;
    token1PerToken0: number;
  };
  priceRange: {
    lowerPrice: number;
    upperPrice: number;
  };
  liquidity: string;
  isActive: boolean;
  utilizationRate: number; // 流动性利用率
}

export const usePoolPrice = (pool?: PoolInfo, token0Decimals = 18, token1Decimals = 18) => {
  const [price, setPrice] = useState<PoolPrice | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!pool) {
      setPrice(null);
      return;
    }

    setIsLoading(true);
    
    try {
      // 从 sqrtPriceX96 计算当前价格
      const currentPrice = calculatePriceFromSqrtPriceX96(
        pool.sqrtPriceX96,
        token0Decimals,
        token1Decimals
      );

      // 计算价格区间
      const lowerPrice = calculatePriceFromTick(pool.tickLower, token0Decimals, token1Decimals);
      const upperPrice = calculatePriceFromTick(pool.tickUpper, token0Decimals, token1Decimals);

      // 检查当前价格是否在范围内
      const isActive = pool.tick >= pool.tickLower && pool.tick <= pool.tickUpper;

      // 计算流动性利用率（简化版本）
      const tickRange = pool.tickUpper - pool.tickLower;
      const maxRange = 887220 * 2; // 全范围
      const utilizationRate = (maxRange - tickRange) / maxRange * 100;

      setPrice({
        currentPrice,
        priceRange: {
          lowerPrice: lowerPrice.token0PerToken1,
          upperPrice: upperPrice.token0PerToken1,
        },
        liquidity: formatLiquidity(pool.liquidity),
        isActive,
        utilizationRate,
      });
    } catch (error) {
      console.error('计算池子价格失败:', error);
      setPrice(null);
    } finally {
      setIsLoading(false);
    }
  }, [pool, token0Decimals, token1Decimals]);

  return { price, isLoading };
};
