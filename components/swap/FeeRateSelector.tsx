"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Settings, Info, Percent, Clock, AlertTriangle } from "lucide-react";
import { Token } from "@/hooks/useTokenOptions";
import { cn } from "@/lib/utils";

export interface FeeRate {
  fee: number; // 费率，如 0.05%, 0.3%, 1% 等
  tier: "超低" | "低" | "中" | "高" | "超高";
  description: string;
  estimatedTime: string;
  liquidityScore: number; // 0-100 流动性评分
  recommended: boolean;
  color: string;
  pool?: any; // 添加对应的池信息
}

interface FeeRateSelectorProps {
  token0: Token | null;
  token1: Token | null;
  selectedFee: number | null;
  onSelectFee: (fee: number, pool?: any) => void; // 修改函数签名，添加池参数
  poolsInfo?: any[]; // 池信息
  isLoading?: boolean;
}

const FeeRateSelector: React.FC<FeeRateSelectorProps> = ({
  token0,
  token1,
  selectedFee,
  onSelectFee,
  poolsInfo,
  isLoading = false,
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const [selectedPool, setSelectedPool] = useState<any>(null); // 添加选中池的状态

  // 基于代币对生成可用费率
  const availableFeeRates = useMemo(() => {
    // 默认费率选项
    const defaultRates: FeeRate[] = [
      {
        fee: 0.01,
        tier: "超低",
        description: "稳定币对最佳选择",
        estimatedTime: "~1分钟",
        liquidityScore: 85,
        recommended: false,
        color: "bg-blue-500",
      },
      {
        fee: 0.05,
        tier: "低",
        description: "相关性高的代币对",
        estimatedTime: "~2分钟",
        liquidityScore: 90,
        recommended: false,
        color: "bg-green-500",
      },
      {
        fee: 0.3,
        tier: "中",
        description: "大多数代币对的标准选择",
        estimatedTime: "~3分钟",
        liquidityScore: 75,
        recommended: true,
        color: "bg-yellow-500",
      },
      {
        fee: 1,
        tier: "高",
        description: "波动性较大的代币对",
        estimatedTime: "~5分钟",
        liquidityScore: 60,
        recommended: false,
        color: "bg-orange-500",
      },
      // 添加超高费率选项，用于极端市场条件
      {
        fee: 2,
        tier: "超高",
        description: "高波动市场应急选择",
        estimatedTime: "~10分钟",
        liquidityScore: 40,
        recommended: false,
        color: "bg-red-500",
      },
    ];

    if (!token0 || !token1 || !poolsInfo || poolsInfo.length === 0) {
      return defaultRates;
    }

    // 如果有池信息，根据实际情况调整推荐费率
    try {
      // 查找匹配当前代币对的池
      const relevantPools = poolsInfo.filter(
        (pool) =>
          (pool.token0?.toLowerCase() === token0.address.toLowerCase() &&
            pool.token1?.toLowerCase() === token1.address.toLowerCase()) ||
          (pool.token0?.toLowerCase() === token1.address.toLowerCase() &&
            pool.token1?.toLowerCase() === token0.address.toLowerCase())
      );
      console.log("相关池信息:", relevantPools);

      if (relevantPools.length > 0) {
        // 根据池的实际情况调整费率推荐
        const updatedRates = [...defaultRates];

        // 找出流动性最高的池对应的费率
        const mostLiquidPool = relevantPools.reduce((prev, current) => {
          // 使用 BigInt 比较，因为 liquidity 是 BigInt 类型
          const prevLiquidity =
            typeof prev.liquidity === "bigint" ? prev.liquidity : BigInt(0);
          const currentLiquidity =
            typeof current.liquidity === "bigint"
              ? current.liquidity
              : BigInt(0);
          return prevLiquidity > currentLiquidity ? prev : current;
        }, relevantPools[0]);

        // 将池信息与费率关联起来
        const ratesWithPools = updatedRates.map((rate) => {
          // 将 fee 转换为基点值进行比较 (例如：0.3% -> 3000)
          const feeBasisPoints = Math.floor(rate.fee * 10000);

          // 查找匹配此费率的池
          const matchingPool = relevantPools.find(
            (pool) => pool.fee === feeBasisPoints
          );

          // 如果找到匹配的池，将其关联到费率
          if (matchingPool) {
            return {
              ...rate,
              recommended: feeBasisPoints === mostLiquidPool.fee || false,
              pool: matchingPool,
            };
          }

          return {
            ...rate,
            recommended: feeBasisPoints === mostLiquidPool.fee || false,
          };
        });

        return ratesWithPools;
      }
    } catch (error) {
      console.error("处理费率数据时出错:", error);
    }

    return defaultRates;
  }, [token0, token1, poolsInfo]);

  // 如果没有选择费率且有推荐费率，自动选择推荐费率
  useEffect(() => {
    if (selectedFee === null && availableFeeRates.length > 0) {
      const recommendedFee = availableFeeRates.find((rate) => rate.recommended);
      if (recommendedFee) {
        // 同时设置费率和对应的池
        onSelectFee(recommendedFee.fee, recommendedFee.pool);
        setSelectedPool(recommendedFee.pool);
      } else {
        // 默认选择中等费率
        const defaultRate = availableFeeRates[2];
        onSelectFee(defaultRate.fee, defaultRate.pool);
        setSelectedPool(defaultRate.pool);
      }
    }
  }, [availableFeeRates, selectedFee, onSelectFee]);

  // 处理费率选择，同时记录对应的池
  const handleSelectFee = (rate: FeeRate) => {
    onSelectFee(rate.fee, rate.pool);
    setSelectedPool(rate.pool);
    console.log(`已选择费率: ${rate.fee}%, 对应池:`, rate.pool);
  };

  // 如果正在加载或没有代币选择，显示加载状态
  if (isLoading) {
    return (
      <Card className="border border-dashed border-gray-200 bg-gray-50">
        <CardContent className="p-3">
          <div className="flex items-center justify-center py-2">
            <div className="animate-pulse flex space-x-2">
              <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
              <div className="h-4 w-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!token0 || !token1) {
    return null;
  }

  return (
    <TooltipProvider>
      <Card className="border-gray-200 bg-white">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-1">
              <Percent className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">选择费率</span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setShowInfo(!showInfo)}
                >
                  <Info className="h-4 w-4 text-gray-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  费率影响交易成本和执行速度。较低费率适合稳定币，较高费率适合波动性资产。
                </p>
              </TooltipContent>
            </Tooltip>
          </div>

          {showInfo && (
            <div className="mb-3 bg-blue-50 p-2 rounded-md text-xs text-blue-700">
              <p>
                • 较低费率(0.01%-0.05%): 稳定币和相关性高的代币对
                <br />
                • 中等费率(0.3%): 大多数标准代币对
                <br />
                • 较高费率(1%): 波动性大的代币对，提供更好的价格保护
                <br />• 超高费率(2%): 极端波动市场，避免滑点保护限制(SPL)错误
              </p>
            </div>
          )}

          <div className="grid grid-cols-5 gap-1">
            {availableFeeRates.map((rate) => (
              <Button
                key={rate.fee}
                variant="outline"
                size="sm"
                className={cn(
                  "h-auto py-1 px-2 flex flex-col items-center justify-center text-xs",
                  selectedFee === rate.fee
                    ? "border-2 border-blue-500 bg-blue-50"
                    : rate.fee === 2
                    ? "border-red-200 hover:border-red-300"
                    : "border-gray-200"
                )}
                onClick={() => handleSelectFee(rate)}
              >
                <span className="font-semibold">{rate.fee}%</span>
                <span className="text-[10px] text-gray-500">{rate.tier}</span>
                {rate.recommended && (
                  <Badge
                    variant="secondary"
                    className="mt-1 text-[9px] bg-green-100 text-green-800 h-4"
                  >
                    推荐
                  </Badge>
                )}
                {rate.fee === 2 && (
                  <Badge
                    variant="outline"
                    className="mt-1 text-[9px] border-red-300 text-red-600 h-4"
                  >
                    应急
                  </Badge>
                )}
                {rate.pool && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="mt-1 w-2 h-2 rounded-full bg-blue-400"></div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">已找到匹配池</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </Button>
            ))}
          </div>

          {selectedFee !== null && (
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    availableFeeRates.find((r) => r.fee === selectedFee)
                      ?.color || "bg-gray-400"
                  }`}
                ></div>
                <span>
                  {
                    availableFeeRates.find((r) => r.fee === selectedFee)
                      ?.description
                  }
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>
                  预计{" "}
                  {
                    availableFeeRates.find((r) => r.fee === selectedFee)
                      ?.estimatedTime
                  }
                </span>
              </div>
            </div>
          )}

          {selectedFee === 2 && (
            <div className="mt-2 p-1.5 bg-red-50 border border-red-100 rounded text-xs flex items-start space-x-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
              <span className="text-red-700">
                超高费率模式会增加交易成本，但可以避免滑点保护限制(SPL)错误，适用于高波动市场环境。
              </span>
            </div>
          )}

          {/* 显示选中池的信息（如果有） */}
          {selectedPool && (
            <div className="mt-2 p-1.5 bg-blue-50 border border-blue-100 rounded text-xs">
              <div className="flex justify-between">
                <span className="text-blue-700 font-medium">
                  已选择流动性池
                </span>
                <span className="text-blue-700">
                  {selectedPool.pool?.slice(0, 6)}...
                  {selectedPool.pool?.slice(-4)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default FeeRateSelector;
