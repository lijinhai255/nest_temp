"use client";

import { useState, useEffect } from "react";
import { useChainId } from "wagmi";
import { GasFeeRecommendations } from "@/app/api/gas-fees/[chainId]/types";

interface GasFeeProps {
  onSelectGasFee: (maxFeePerGas: bigint, maxPriorityFeePerGas: bigint) => void;
}

type FeeLevel = "low" | "medium" | "high";

// 格式化预计时间
function formatEstimatedTime(seconds: number): string {
  if (seconds < 60) {
    return `约${seconds}秒`;
  } else if (seconds < 3600) {
    return `约${Math.round(seconds / 60)}分钟`;
  } else {
    return `约${Math.round(seconds / 3600)}小时${Math.round(
      (seconds % 3600) / 60
    )}分钟`;
  }
}

const GasFeeSelector: React.FC<GasFeeProps> = ({ onSelectGasFee }) => {
  const chainId = useChainId() || 1; // 默认使用以太坊主网

  const [selectedLevel, setSelectedLevel] = useState<FeeLevel>("medium");
  const [recommendations, setRecommendations] =
    useState<GasFeeRecommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 从API获取Gas费用推荐
  useEffect(() => {
    let isMounted = true;

    const fetchGasFees = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/gas-fees/${chainId}`);

        if (!response.ok) {
          throw new Error(`获取Gas费用失败: ${response.statusText}`);
        }

        const data = await response.json();

        if (isMounted) {
          setRecommendations(data);
          setLoading(false);

          // 默认选择中等费用
          onSelectGasFee(
            BigInt(data.medium.maxFeePerGas),
            BigInt(data.medium.maxPriorityFeePerGas)
          );
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
        console.error("获取Gas费用推荐失败:", err);
      }
    };

    fetchGasFees();

    // 每30秒刷新一次数据
    const intervalId = setInterval(fetchGasFees, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [chainId, onSelectGasFee]);

  // 处理费用等级选择
  const handleSelectLevel = (level: FeeLevel) => {
    if (!recommendations) return;

    setSelectedLevel(level);
    onSelectGasFee(
      BigInt(recommendations[level].maxFeePerGas),
      BigInt(recommendations[level].maxPriorityFeePerGas)
    );
  };

  if (loading) {
    return <div className="p-4 text-center">加载Gas费用数据中...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        获取Gas费用失败: {error.message}
      </div>
    );
  }

  if (!recommendations) {
    return <div className="p-4 text-center">无法获取Gas费用推荐</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-medium mb-4">Gas费用设置</h3>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {(["low", "medium", "high"] as const).map((level) => (
          <div
            key={level}
            className={`border rounded-lg p-3 cursor-pointer transition-all ${
              selectedLevel === level
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-blue-300"
            }`}
            onClick={() => handleSelectLevel(level)}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">
                {level === "low" && "经济"}
                {level === "medium" && "标准"}
                {level === "high" && "快速"}
              </span>
              <span className="text-sm text-gray-500">
                {formatEstimatedTime(recommendations[level].estimatedSeconds)}
              </span>
            </div>

            <div className="text-lg font-semibold">
              {recommendations[level].maxFeePerGasGwei} Gwei
            </div>

            <div className="text-xs text-gray-500 mt-1">
              基础费用: {recommendations.baseFeePerGasGwei} Gwei
              <br />
              小费: {recommendations[level].maxPriorityFeePerGasGwei} Gwei
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-500 mt-2">
        数据更新时间: {new Date(recommendations.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
};

export default GasFeeSelector;
