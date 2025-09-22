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
  return `${tickLower.toFixed(4)} – ${tickUpper.toFixed(4)}`;
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
export const formatTokenPair = (token0: string, token1: string): string => {
  if (!token0 || !token1) return 'Unknown Pair';
  
  try {
    // 简化显示地址
    const shortToken0 = token0.length > 10 
      ? `${token0.substring(0, 6)}...${token0.substring(Math.max(0, token0.length - 4))}`
      : token0;
      
    const shortToken1 = token1.length > 10
      ? `${token1.substring(0, 6)}...${token1.substring(Math.max(0, token1.length - 4))}`
      : token1;
      
    return `${shortToken0} / ${shortToken1}`;
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