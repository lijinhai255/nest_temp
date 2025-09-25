import { getTokenInfo } from '@/types/addPosition';
import { Address } from 'viem';

/**
 * 池子数据格式化工具函数
 */

/**
 * 格式化价格范围
 * @param tickLower 下限 tick
 * @param tickUpper 上限 tick
 * @returns 格式化后的价格范围字符串
 */
export const formatPriceRange = (tickLower: number, tickUpper: number): string => {
  try {
    // 使用 tick 计算价格，与 formatCurrentPrice 使用相同的计算逻辑
    const lowerPrice = Math.pow(1.0001, tickLower);
    const upperPrice = Math.pow(1.0001, tickUpper);

    // 简化的格式化策略：优先使用数字格式，只有在极大数值时才使用K/M/B
    const formatPrice = (price: number): string => {
      if (price < 0.000001) {
        return price.toExponential(2);
      } else if (price < 0.001) {
        return price.toFixed(6);
      } else if (price < 1) {
        return price.toFixed(4);
      } else if (price < 10000) {
        return price.toFixed(2);
      } else if (price < 1000000) {
        return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
      } else if (price < 1000000000) {
        return `${(price / 1000000).toFixed(1)}M`;
      } else {
        return `${(price / 1000000000).toFixed(1)}B`;
      }
    };

    return `${formatPrice(lowerPrice)} – ${formatPrice(upperPrice)}`;
  } catch (error) {
    console.error("价格区间计算错误:", error);
    // 备用方案：显示原始 tick 值，但限制显示长度
    return `${tickLower.toFixed(0)} – ${tickUpper.toFixed(0)}`;
  }
};

/**
 * 格式化手续费率
 * @param fee 手续费值
 * @returns 格式化后的手续费率字符串
 */
export const formatFee = (fee: number): string => {
  // fee 值为 1 表示 0.01%
  return `${(fee / 100).toFixed(2)}%`;
};

/**
 * 格式化代币对显示
 * @param token0 第一个代币地址
 * @param token1 第二个代币地址
 * @returns 格式化后的代币对字符串
 */
export const formatTokenPair = (token0: Address, token1: Address): string => {
  if (!token0 || !token1) return 'Unknown Pair';
  
  try {
    // 使用 getTokenInfo 获取代币符号
    const token0Info = getTokenInfo(token0);
    const token1Info = getTokenInfo(token1);
    
    return `${token0Info.symbol} / ${token1Info.symbol}`;
  } catch (error) {
    console.error("Error formatting token pair:", error);
    return 'Error formatting';
  }
};

/**
 * 格式化流动性数值
 * @param liquidity 流动性值 (bigint)
 * @returns 格式化后的流动性字符串
 */
export const formatLiquidity = (liquidity: bigint): string => {
  if (liquidity === 0n) return '2024'; // 默认值
  
  // 将 bigint 转换为数字，如果太大可能需要特殊处理
  try {
    return Number(liquidity).toString();
  } catch {
    return liquidity.toString();
  }
};

/**
 * 格式化当前价格
 * @param sqrtPriceX96 价格的平方根乘以 2^96
 * @param tick 当前 tick
 * @returns 格式化后的价格字符串
 */
  export const  formatCurrentPrice=(sqrtPriceX96: bigint, tick: number) => {
        try {
          // 方法1: 使用 sqrtPriceX96 计算
          // price = (sqrtPriceX96 / 2^96)^2
          const Q96 = BigInt(2) ** BigInt(96);
          const sqrtPriceNum = Number(sqrtPriceX96) / Number(Q96);
          const price = sqrtPriceNum * sqrtPriceNum;

          // 格式化价格显示
          if (price === 0) {
            // 备用方案：使用 tick 计算
            const tickPrice = Math.pow(1.0001, tick);
            return tickPrice.toFixed(4);
          }

          if (price < 0.000001) {
            return price.toExponential(4);
          } else if (price < 1) {
            return price.toFixed(6);
          } else if (price < 1000) {
            return price.toFixed(4);
          } else {
            return price.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
          }
        } catch (error) {
          console.error("价格计算错误:", error);
          // 备用方案：使用 tick 计算价格
          const price = Math.pow(1.0001, tick);
          return price.toFixed(4);
        }
      }

// 封装一个方法      

// 格式化余额，控制小数点
export const formatBalance = (balanceStr: string) => {
  const num = parseFloat(balanceStr);
  if (isNaN(num)) return "0";
  
  // 如果是整数，不显示小数点
  if (Number.isInteger(num)) return num.toString();
  
  // 如果小数部分很小，限制到最多6位小数
  const decimalPlaces = num >= 1000 ? 2 : 
                       num >= 100 ? 3 : 
                       num >= 10 ? 4 : 
                       num >= 1 ? 5 : 6;
                       
  return num.toLocaleString(undefined, {
    maximumFractionDigits: decimalPlaces,
    minimumFractionDigits: 0
  });
};