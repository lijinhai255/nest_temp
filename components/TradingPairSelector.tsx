// components/TradingPairSelector.tsx - 修复版本
import React, { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { formatFeePercent, TradingPair } from "@/types/addPosition";
import { PoolInfo } from "@/store/usePoolManagerStore";

interface TradingPairSelectorProps {
  selectedPair: TradingPair | null;
  selectedPool: PoolInfo | null;
  onPairSelect: (pair: TradingPair) => void;
  onPoolSelect: (pool: PoolInfo[]) => void;
  availablePairs: TradingPair[];
  availablePools: PoolInfo[];
  disabled?: boolean;
}

const TradingPairSelector: React.FC<TradingPairSelectorProps> = ({
  selectedPair,
  selectedPool,
  onPairSelect,
  onPoolSelect,
  availablePairs,
  availablePools,
  disabled = false,
}) => {
  console.log("🔍 TradingPairSelector 渲染:", {
    selectedPair: selectedPair?.displayName || null,
    availablePairsCount: availablePairs.length,
    availablePairs: availablePairs.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      token0Info: p.token0Info,
      token1Info: p.token1Info,
    })),
  });

  // 🔧 修复：处理交易对选择
  const handlePairChange = (pairId: string) => {
    console.log("🔍 交易对选择变化:", pairId);

    const pair = availablePairs.find((p) => p.id === pairId);
    if (pair) {
      console.log("🔍 找到交易对:", pair);
      console.log("🔍 交易对的代币信息:", {
        token0Info: pair.token0Info,
        token1Info: pair.token1Info,
      });

      // 🔧 确保立即调用回调
      onPairSelect(pair);

      // 自动选择第一个池子
      if (pair.pools && pair.pools.length > 0 && pair.pools[0]) {
        console.log("🔍 自动选择池子:", pair.pools[0]);
        // 使用 setTimeout 确保 onPairSelect 先执行
        setTimeout(() => {
          pair.pools && onPoolSelect(pair.pools);
        }, 0);
      }
    } else {
      console.error(
        "❌ 未找到交易对:",
        pairId,
        "可用交易对:",
        availablePairs.map((p) => p.id)
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* 交易对选择 */}
      <div className="space-y-2">
        <Label htmlFor="pair-select">选择交易对</Label>
        <Select
          value={selectedPair?.id || ""}
          onValueChange={handlePairChange}
          disabled={disabled}
        >
          <SelectTrigger id="pair-select">
            <SelectValue placeholder="选择交易对" />
          </SelectTrigger>
          <SelectContent>
            {availablePairs.map((pair) => {
              return pair.id ? (
                <SelectItem key={pair.id} value={pair.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{pair.displayName}</span>
                    <div className="flex gap-1 ml-2">
                      {pair.pools?.map((pool, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs"
                        >
                          {formatFeePercent(pool.fee)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </SelectItem>
              ) : (
                ""
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default TradingPairSelector;
