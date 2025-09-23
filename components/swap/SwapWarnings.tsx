"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Info, XCircle, AlertCircle } from "lucide-react";
import { Token } from "@/hooks/useTokenOptions";
import { SwapQuote } from "./types";

interface SwapWarningsProps {
  shouldWarnUser: () => boolean;
  hasInsufficientBalance: boolean;
  quote: SwapQuote | null;
  token0: Token | null;
  inputAmount: string;
  getLiquidityRecommendations: () => string[];
}

const SwapWarnings: React.FC<SwapWarningsProps> = ({
  shouldWarnUser,
  hasInsufficientBalance,
  quote,
  token0,
  inputAmount,
  getLiquidityRecommendations,
}) => {
  const recommendations = getLiquidityRecommendations();
  const hasWarnings = shouldWarnUser() || hasInsufficientBalance || quote?.error;

  return (
    <>
      {/* 警告信息 */}
      {hasWarnings && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {hasInsufficientBalance && (
                <div className="flex items-center space-x-2">
                  <XCircle className="h-3 w-3" />
                  <span>余额不足，需要 {inputAmount} {token0?.symbol}</span>
                </div>
              )}
              {shouldWarnUser() && !hasInsufficientBalance && (
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-3 w-3" />
                  <span>价格影响过高 ({quote?.priceImpactV3Formatted})</span>
                </div>
              )}
              {quote?.error && !hasInsufficientBalance && !shouldWarnUser() && (
                <div className="flex items-center space-x-2">
                  <XCircle className="h-3 w-3" />
                  <span>报价错误: {quote.error}</span>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 流动性建议 */}
      {recommendations.length > 0 && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-medium text-blue-800">智能建议:</div>
              <div className="space-y-1">
                {recommendations.map((rec, index) => (
                  <div key={index} className="text-sm text-blue-700 flex items-start">
                    <div className="w-1 h-1 bg-blue-400 rounded-full mr-2 mt-2 flex-shrink-0"></div>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </>
  );
};

export default SwapWarnings;