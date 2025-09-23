// types/token.ts
export interface TokenOption {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  isNative: boolean;
  displayName: string;
  formattedAddress: string;
  availablePairs: string[];
  totalLiquidity: string;
  poolCount: number;
}

export interface TokenOptionsResult {
  inTokens: TokenOption[];
  outTokens: TokenOption[];
  allTokens: TokenOption[];
  isLoading: boolean;
  error: string | null;
}

// 假设你已有的交易对类型
export interface TradingPair {
  id: string;
  displayName: string;
  token0: string;
  token1: string;
  pools: Array<{
    liquidity: string;
  }>;
}

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  isNative: boolean;
  displayName: string;
  formattedAddress: string;
  icon: string;
  color: string;
  balance: string;
  usdValue: string;
  availablePairs: string[];
  totalLiquidity: string;
  poolCount: number;
}
