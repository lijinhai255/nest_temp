// Gas价格历史记录结构
export interface GasHistoryEntry {
  timestamp: number;
  baseFee: bigint;
  priorityFee: bigint;
  totalGasUsed: bigint;
  blockNumber: bigint;
}

// Gas费用推荐结构
export interface GasFeeRecommendation {
  maxFeePerGas: string;      // 最大总Gas费用 (Wei)
  maxPriorityFeePerGas: string;  // 最大优先费用 (Wei)
  maxFeePerGasGwei: string;  // 最大总Gas费用 (Gwei)
  maxPriorityFeePerGasGwei: string; // 最大优先费用 (Gwei)
  estimatedSeconds: number;  // 预计确认时间(秒)
}

// Gas费用推荐等级
export interface GasFeeRecommendations {
  low: GasFeeRecommendation;
  medium: GasFeeRecommendation;
  high: GasFeeRecommendation;
  baseFeePerGas: string;     // 当前基础费用 (Wei)
  baseFeePerGasGwei: string; // 当前基础费用 (Gwei)
  timestamp: number;         // 推荐生成的时间戳
  chainId: number;           // 链ID
}

/**
 * 格式化预计时间
 */
export function formatEstimatedTime(seconds: number): string {
  if (seconds < 60) {
    return `约${seconds}秒`;
  } else if (seconds < 3600) {
    return `约${Math.round(seconds / 60)}分钟`;
  } else {
    return `约${Math.round(seconds / 3600)}小时${Math.round((seconds % 3600) / 60)}分钟`;
  }
}

/**
 * 将Wei字符串转换为BigInt
 */
export function weiBigInt(weiStr: string): bigint {
  return BigInt(weiStr);
}