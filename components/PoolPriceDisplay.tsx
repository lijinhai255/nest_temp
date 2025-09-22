// components/PoolPriceDisplay.tsx
import React from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { usePoolPrice } from "@/hooks/usePoolPrice";

interface PoolPriceDisplayProps {
  pool?: PoolInfo;
  token0: {
    symbol: string;
    decimals: number;
  };
  token1: {
    symbol: string;
    decimals: number;
  };
  onRefresh?: () => void;
}

const PoolPriceDisplay: React.FC<PoolPriceDisplayProps> = ({
  pool,
  token0,
  token1,
  onRefresh,
}) => {
  const { price, isLoading } = usePoolPrice(
    pool,
    token0.decimals,
    token1.decimals
  );

  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (!pool || !price) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <span className="text-gray-500">暂无池子数据</span>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
      {/* 头部信息 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">池子价格</span>
          <Badge variant={price.isActive ? "default" : "secondary"}>
            {price.isActive ? "活跃" : "非活跃"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {(pool.fee / 10000).toFixed(2)}% 费率
          </Badge>
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={onRefresh}
            >
              刷新
            </Button>
          )}
        </div>
      </div>

      {/* 当前价格 */}
      <div className="space-y-1">
        <div className="text-lg font-bold text-gray-900">
          1 {token0.symbol} ={" "}
          {price.currentPrice.token0PerToken1.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 8,
          })}{" "}
          {token1.symbol}
        </div>
        <div className="text-sm text-gray-600">
          1 {token1.symbol} ={" "}
          {price.currentPrice.token1PerToken0.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 8,
          })}{" "}
          {token0.symbol}
        </div>
      </div>

      {/* 价格区间 */}
      <div className="bg-white rounded-md p-3 space-y-2">
        <div className="text-xs font-medium text-gray-700 mb-2">价格区间</div>
        <div className="flex justify-between text-sm">
          <div>
            <span className="text-gray-500">最低价:</span>
            <div className="font-medium">
              {price.priceRange.lowerPrice.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              })}
            </div>
          </div>
          <div className="text-center">
            <span className="text-gray-500">当前 Tick:</span>
            <div className="font-medium">{pool.tick}</div>
          </div>
          <div className="text-right">
            <span className="text-gray-500">最高价:</span>
            <div className="font-medium">
              {price.priceRange.upperPrice.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 流动性信息 */}
      <div className="flex justify-between text-sm text-gray-600">
        <span>流动性: {price.liquidity}</span>
        <span>利用率: {price.utilizationRate.toFixed(1)}%</span>
      </div>

      {/* 池子地址 */}
      <div className="text-xs text-gray-500">
        池子: {pool.pool.substring(0, 6)}...{pool.pool.substring(38)}
      </div>
    </div>
  );
};

export default PoolPriceDisplay;
