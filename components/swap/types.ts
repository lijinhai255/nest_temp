// 交易设置接口
export interface SwapSettings {
  slippageTolerance: number;
  deadline: number; // 交易截止时间（分钟）
  gasPrice: 'slow' | 'standard' | 'fast';
  enableMEV: boolean; // MEV 保护
  autoRefresh: boolean;
}

// 交易分析接口
export interface TradeAnalysis {
  recommendation: 'buy' | 'sell' | 'hold' | 'wait';
  confidence: number;
  reasons: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

// 报价接口
export interface SwapQuote {
  outputAmount?: string;
  outputAmountFormatted?: string;
  priceImpactV3: number;
  priceImpactV3Formatted?: string;
  currentPriceFormatted?: string;
  feeAmountFormatted?: string;
  gasEstimate?: number;
  gasEstimateFormatted?: string;
  lastUpdated: number;
  error?: string | null;
  isMultiHop?: boolean;
  liquidityStatus?: 'sufficient' | 'low' | 'insufficient' | 'critical' | 'unknown';
  path?: number[];
}