// types/addPosition.ts - 更新类型定义
import { PoolInfo } from '@/store/usePoolManagerStore';
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

// 代币信息配置
export const TOKEN_INFO: Record<string, { symbol: string; name: string; decimals: number }> = {
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE": { 
    symbol: "ETH", 
    name: "Ethereum", 
    decimals: 18 
  },
  "0x0000000000000000000000000000000000000000": { 
    symbol: "ETH", 
    name: "Ethereum", 
    decimals: 18 
  },
  "0xEaaAbd33D863Ee55BD41706E977e97CCE6dBd0d0": { 
    symbol: "MyTokenC", 
    name: "My Token C", 
    decimals: 18 
  },
  "0xD61bfEBA1E28356e653977E4fC5AA82F25396256": { 
    symbol: "MyTokenA", 
    name: "My Token A", 
    decimals: 18 
  },
};

// 工具函数
export const formatFeePercent = (fee: number): string => {
  return `${fee}%`;
};

export const getTokenInfo = (address: Address): { symbol: string; name: string; decimals: number } => {
  return TOKEN_INFO[address] || {
    symbol: `${address.substring(0, 6)}...`,
    name: `Token ${address.substring(0, 8)}...`,
    decimals: 18,
  };
};
