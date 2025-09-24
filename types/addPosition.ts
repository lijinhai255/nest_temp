// types/addPosition.ts - 更新类型定义
import { PoolInfo } from '@/store/usePoolManagerStore';
import { TOKEN_INFO } from '@/utils/tokenUtils';
import { Address } from 'viem';

// 基础代币接口
export interface Token {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
  isNative?: boolean;
}

// 池子接口
export interface Pool {
  id?: string;
  pool?: Address; // 兼容原有字段
  address?: Address; // 新字段
  token0: Address;
  token1: Address;
  fee: number;
  liquidity?: string;
  sqrtPriceX96?: string;
  tick?: number;
  token0Price?: number;
  token1Price?: number;
  tvlUSD?: number;
  volume24hUSD?: number;
  feeTier?: string;
}

// 交易对接口 - 统一使用这个
export interface TradingPair {
  id?: string;
token0: Address; // 保持与原有 Pair 兼容
  token1: Address; // 保持与原有 Pair 兼容
  fee?: number;
  pools?: PoolInfo[];
  displayName?: string;
  // 扩展字段
  token0Info?: Token;
  token1Info?: Token;
}

// 为了向后兼容，保留 Pair 类型但指向 TradingPair
export type Pair = TradingPair;


// 工具函数
export const formatFeePercent = (fee: number): string => {
  return `${(fee / 100).toFixed(2)}%`;
};

export const getTokenInfo = (address: Address): { symbol: string; name: string; decimals: number; isNative: boolean } => {
  const info = TOKEN_INFO[address] || {
    symbol: `${address.substring(0, 6)}...`,
    name: `Token ${address.substring(0, 8)}...`,
    decimals: 18,
  };
  
  const isNative = address === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" || 
                   address === "0x0000000000000000000000000000000000000000";
  
  return { ...info, isNative };
};
// 获取友好的地址显示
export const getFormattedAddress = (address: string) => {
  const tokenInfo = getTokenInfo(address as Address);
  if (tokenInfo.name !== `Token ${address.substring(0, 8)}...`) {
    return tokenInfo.name;
  }
  return `${address.substring(0, 6)}...${address.substring(38)}`;
};

// 获取代币显示名称
export const getTokenDisplayName = (address: string) => {
  const tokenInfo = getTokenInfo(address as Address);
  return tokenInfo.symbol;
};

// 检查是否为原生代币
export const isNativeToken = (address: string): boolean => {
  return address === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" || 
         address === "0x0000000000000000000000000000000000000000";
};