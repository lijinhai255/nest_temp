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
import { formatFeePercent, TradingPair, Pool } from "@/types/addPosition";
import { PoolInfo } from "@/store/usePoolManagerStore";

interface TradingPairSelectorProps {
  selectedPair: TradingPair | null;
  selectedPool: Pool | null;
  onPairSelect: (pair: TradingPair) => void;
  onPoolSelect: (pool: PoolInfo) => void;
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
      if (pair.pools && pair.pools.length > 0) {
        console.log("🔍 自动选择池子:", pair.pools[0]);
        // 使用 setTimeout 确保 onPairSelect 先执行
        setTimeout(() => {
          onPoolSelect(pair.pools[0]);
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

  // 🔧 修复：处理池子选择
  const handlePoolChange = (poolKey: string) => {
    console.log("🔍 池子选择变化:", poolKey);

    if (!selectedPair) {
      console.error("❌ 没有选中的交易对");
      return;
    }

    const pool = selectedPair.pools?.find(
      (p) => `${p.token0}-${p.token1}-${p.fee}` === poolKey
    );

    if (pool) {
      console.log("🔍 找到池子:", pool);
      onPoolSelect(pool);
    } else {
      console.error("❌ 未找到池子:", poolKey);
    }
  };

  // 获取当前选中交易对的池子
  const availablePoolsForPair = useMemo(() => {
    if (!selectedPair) return [];
    return selectedPair.pools || [];
  }, [selectedPair]);

  return (
    <div className="space-y-4">
      {/* 🔧 添加调试信息 */}
      {/* <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-xs">
        <div>TradingPairSelector 状态:</div>
        <div>可用交易对数量: {availablePairs.length}</div>
        <div>选中交易对: {selectedPair?.displayName || "无"}</div>
        <div>
          选中池子:{" "}
          {selectedPool ? `${formatFeePercent(selectedPool.fee)}` : "无"}
        </div>
      </div> */}
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
            {availablePairs.map((pair) => (
              <SelectItem key={pair.id} value={pair.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{pair.displayName}</span>
                  <div className="flex gap-1 ml-2">
                    {pair.pools?.map((pool, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {formatFeePercent(pool.fee)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* 池子选择 */}
      {/* {selectedPair && availablePoolsForPair.length > 1 && (
        <div className="space-y-2">
          <Label htmlFor="pool-select">选择费率池</Label>
          <Select
            value={
              selectedPool
                ? `${selectedPool.token0}-${selectedPool.token1}-${selectedPool.fee}`
                : ""
            }
            onValueChange={handlePoolChange}
            disabled={disabled}
          >
            <SelectTrigger id="pool-select">
              <SelectValue placeholder="选择费率池" />
            </SelectTrigger>
            <SelectContent>
              {availablePoolsForPair.map((pool, index) => (
                <SelectItem
                  key={index}
                  value={`${pool.token0}-${pool.token1}-${pool.fee}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>费率: {formatFeePercent(pool.fee)}</span>
                    {pool.liquidity && (
                      <Badge variant="outline" className="text-xs ml-2">
                        流动性: {pool.liquidity}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )} */}
      {/* 选中信息显示 */}
      {/* {selectedPair && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <div className="font-medium text-gray-700 mb-2">选中的交易对:</div>
          <div className="space-y-1">
            <div>交易对: {selectedPair.displayName}</div>
            <div>
              Token0: {selectedPair.token0Info?.symbol || "Unknown"} (
              {selectedPair.token0})
            </div>
            <div>
              Token1: {selectedPair.token1Info?.symbol || "Unknown"} (
              {selectedPair.token1})
            </div>
            {selectedPool && (
              <div>费率: {formatFeePercent(selectedPool.fee)}</div>
            )}
          </div>
        </div>
      )} */}
    </div>
  );
};

export default TradingPairSelector;
