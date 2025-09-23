import { Badge } from "./ui/badge";
import PoolPriceDisplay from "./PoolPriceDisplay";
import { formatFeePercent } from "@/types/addPosition";
import { PoolInfo } from "@/store/usePoolManagerStore";
import { useState, useEffect } from "react";

interface SelectPoolFeeProps {
  selectedPool: PoolInfo | null;
  collectAllPools: PoolInfo[] | undefined;
  selectedToken0: { symbol: string; decimals: number } | null;
  selectedToken1: { symbol: string; decimals: number } | null;
  onSelectPool: (pool: PoolInfo) => void;
  loadData: () => void;
}

export const SelectPoolFee = ({
  selectedPool,
  collectAllPools,
  selectedToken0,
  selectedToken1,
  onSelectPool,
  loadData,
}: SelectPoolFeeProps) => {
  // 按费率分组的池子
  const [feeOptions, setFeeOptions] = useState<
    { fee: number; count: number }[]
  >([]);

  // 当池子列表变化时，提取可用的费率选项
  useEffect(() => {
    if (collectAllPools && collectAllPools.length > 0) {
      // 按费率分组并计数
      const feeGroups: Record<number, number> = {};
      collectAllPools.forEach((pool) => {
        if (!feeGroups[pool.fee]) {
          feeGroups[pool.fee] = 0;
        }
        feeGroups[pool.fee] += 1;
      });

      // 转换为数组格式
      const options = Object.entries(feeGroups).map(([fee, count]) => ({
        fee: Number(fee),
        count,
      }));

      setFeeOptions(options);
    }
  }, [collectAllPools]);

  // 处理池子选择
  const handleSelectFee = (fee: number) => {
    if (collectAllPools) {
      // 找到对应费率的第一个池子
      const pool = collectAllPools.find((p) => p.fee === fee);
      if (pool) {
        onSelectPool(pool);
      }
    }
  };

  return (
    <>
      {/* 费率选择区域 */}
      {feeOptions.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium mb-2">选择交易费率:</div>
          <div className="flex flex-wrap gap-2">
            {feeOptions.map(({ fee, count }) => (
              <Badge
                key={fee}
                variant={
                  selectedPool && selectedPool.fee === fee
                    ? "default"
                    : "outline"
                }
                className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors px-3 py-1"
                onClick={() => handleSelectFee(fee)}
              >
                {formatFeePercent(fee)} ({count})
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* 当前交易费率显示 */}
      {selectedPool && (
        <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
          <span>当前交易费率:</span>
          <Badge variant="secondary">
            {formatFeePercent(selectedPool.fee)}
          </Badge>
        </div>
      )}

      {/* 池子价格显示 */}
      {selectedPool && selectedToken0 && selectedToken1 && (
        <PoolPriceDisplay
          pool={selectedPool}
          token0={{
            symbol: selectedToken0.symbol,
            decimals: selectedToken0.decimals,
          }}
          token1={{
            symbol: selectedToken1.symbol,
            decimals: selectedToken1.decimals,
          }}
          onRefresh={loadData}
        />
      )}
    </>
  );
};

export default SelectPoolFee;
