// utils/positionUtils.ts
import { PositionInfo } from '@/stores/usePositionManagerStore';

export type PositionStatus = 'active' | 'closed' | 'pending_collection';

export interface PositionStatusInfo {
  status: PositionStatus;
  hasLiquidity: boolean;
  hasUnclaimedFees: boolean;
  canCollect: boolean;
  canBurn: boolean;
}

// 判断头寸状态
export const getPositionStatus = (position: PositionInfo): PositionStatusInfo => {
  const hasLiquidity = position.liquidity > 0n;
  const hasUnclaimedFees = position.tokensOwed0 > 0n || position.tokensOwed1 > 0n;
  
  let status: PositionStatus;
  if (hasLiquidity) {
    status = 'active';
  } else if (hasUnclaimedFees) {
    status = 'pending_collection';
  } else {
    status = 'closed';
  }
  
  return {
    status,
    hasLiquidity,
    hasUnclaimedFees,
    canCollect: hasUnclaimedFees,
    canBurn: hasLiquidity,
  };
};

// 格式化显示
export const formatTokenAmount = (amount: bigint, decimals: number = 18): string => {
  if (amount === 0n) return '0';
  const divisor = BigInt(10 ** decimals);
  const wholePart = amount / divisor;
  const fractionalPart = amount % divisor;
  
  if (fractionalPart === 0n) {
    return wholePart.toString();
  }
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const trimmedFractional = fractionalStr.replace(/0+$/, '');
  
  return `${wholePart}.${trimmedFractional}`;
};

// 获取状态显示文本
export const getStatusText = (status: PositionStatus): string => {
  switch (status) {
    case 'active':
      return '活跃';
    case 'pending_collection':
      return '待收集';
    case 'closed':
      return '已关闭';
    default:
      return '未知';
  }
};

// 获取状态颜色
export const getStatusColor = (status: PositionStatus): string => {
  switch (status) {
    case 'active':
      return 'text-green-600 bg-green-100';
    case 'pending_collection':
      return 'text-yellow-600 bg-yellow-100';
    case 'closed':
      return 'text-gray-600 bg-gray-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};
