// components/PriceCalculator.tsx
import React, { useMemo } from "react";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { usePoolPrice } from "@/hooks/usePoolPrice";
import { Token } from "@/types/addPosition";
import { PoolInfo } from "@/store/usePoolManagerStore";

interface PriceCalculatorProps {
  selectedPool?: PoolInfo;
  token0: Token;
  token1: Token;
  amount0: string;
  amount1: string;
}

export const PriceCalculator: React.FC<PriceCalculatorProps> = ({
  selectedPool,
  token0,
  token1,
  amount0,
  amount1,
}) => {
  const { price: poolPrice, isLoading } = usePoolPrice(
    selectedPool,
    token0.decimals,
    token1.decimals
  );

  // 计算用户输入的价格比例
  const inputRatio = useMemo(() => {
    if (
      !amount0 ||
      !amount1 ||
      parseFloat(amount0) === 0 ||
      parseFloat(amount1) === 0
    ) {
      return null;
    }

    const amount0Num = parseFloat(amount0);
    const amount1Num = parseFloat(amount1);

    return {
      token0PerToken1: amount1Num / amount0Num,
      token1PerToken0: amount0Num / amount1Num,
    };
  }, [amount0, amount1]);

  // 计算价格偏差
  const priceDeviation = useMemo(() => {
    if (!poolPrice || !inputRatio) return null;

    const deviation = Math.abs(
      ((inputRatio.token0PerToken1 - poolPrice.currentPrice.token0PerToken1) /
        poolPrice.currentPrice.token0PerToken1) *
        100
    );

    return deviation;
  }, [poolPrice, inputRatio]);

  // 检查是否在价格区间内
  const isInPriceRange = useMemo(() => {
    if (!poolPrice || !inputRatio) return null;

    const inputPrice = inputRatio.token0PerToken1;
    return (
      inputPrice >= poolPrice.priceRange.lowerPrice &&
      inputPrice <= poolPrice.priceRange.upperPrice
    );
  }, [poolPrice, inputRatio]);

  if (isLoading) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-3 bg-gray-200 rounded w-full"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!poolPrice || !inputRatio) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* 价格比较 */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">价格分析</span>
          <Badge variant={poolPrice.isActive ? "default" : "secondary"}>
            {poolPrice.isActive ? "池子活跃" : "池子非活跃"}
          </Badge>
        </div>

        {/* 池子当前价格 */}
        <div className="space-y-1">
          <div className="text-xs text-gray-500">池子当前价格:</div>
          <div className="text-sm font-mono">
            1 {token0.symbol} ={" "}
            {poolPrice.currentPrice.token0PerToken1.toFixed(6)} {token1.symbol}
          </div>
        </div>

        {/* 用户输入比例 */}
        <div className="space-y-1">
          <div className="text-xs text-gray-500">您的输入比例:</div>
          <div className="text-sm font-mono text-blue-600">
            1 {token0.symbol} = {inputRatio.token0PerToken1.toFixed(6)}{" "}
            {token1.symbol}
          </div>
        </div>

        {/* 价格偏差 */}
        {priceDeviation !== null && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">价格偏差:</span>
            <Badge
              variant={
                priceDeviation > 10
                  ? "destructive"
                  : priceDeviation > 5
                  ? "secondary"
                  : "default"
              }
            >
              {priceDeviation.toFixed(2)}%
            </Badge>
          </div>
        )}
      </div>

      {/* 警告信息 */}
      {priceDeviation !== null && priceDeviation > 5 && (
        <Alert variant={priceDeviation > 15 ? "destructive" : "default"}>
          <AlertDescription>
            {priceDeviation > 15 ? (
              <>
                🚨 价格偏差过大 ({priceDeviation.toFixed(2)}
                %)，请仔细检查输入金额！
              </>
            ) : (
              <>⚠️ 价格偏差 {priceDeviation.toFixed(2)}%，建议检查输入比例</>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* 价格区间检查 */}
      {isInPriceRange !== null && (
        <Alert variant={isInPriceRange ? "default" : "default"}>
          <AlertDescription>
            {isInPriceRange ? (
              <>✅ 输入比例在流动性价格区间内</>
            ) : (
              <>⚠️ 输入比例超出当前流动性区间，可能影响资本效率</>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
