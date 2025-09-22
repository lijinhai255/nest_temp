// components/AddPosition.tsx - 完整版本
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { usePoolManagerWithClients } from "@/hooks/usePoolManagerWithClients";
import { usePoolPrice } from "@/hooks/usePoolPrice";
import { formatTokenPair } from "@/utils/poolFormatters";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { Address, parseUnits } from "viem";
import { useAccount } from "wagmi"; // 🆕 添加账户 hook
import { Button } from "./ui/button";
import TradingPairSelector from "./TradingPairSelector";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert"; // 🆕 添加 Alert 组件
import TokenAmountInput from "./TokenAmountInput";
import PoolPriceDisplay from "./PoolPriceDisplay";
import {
  formatFeePercent,
  TradingPair,
  Pool,
  Token,
  getTokenInfo,
} from "@/types/addPosition";

// 🆕 导入新的组件和工具
import { PriceCalculator } from "./PriceCalculator";
import {
  buildMintParams,
  validateMintParams,
  MintParamsInput,
  formatMintParams,
} from "@/utils/mintParamsBuilder";
import { usePositionManagerWithClients } from "@/hooks/usePositionManagerWithClients";
import { useWallet } from "@/provider";

const AddPosition: React.FC = () => {
  const { fetchPairs, fetchAllPools, pairs, poolsInfo, isLoading } =
    usePoolManagerWithClients();
  const { mintWithApproval, checkTokenBalance, checkSufficientBalance } =
    usePositionManagerWithClients();

  // 🆕 添加账户信息
  const { address } = useWallet();

  // 状态定义
  const [selectedPair, setSelectedPair] = useState<TradingPair | null>(null);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [amount0, setAmount0] = useState<string>("");
  const [amount1, setAmount1] = useState<string>("");
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [filteredPools, setFilteredPools] = useState<Pool[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedToken0, setSelectedToken0] = useState<Token | undefined>();
  const [selectedToken1, setSelectedToken1] = useState<Token | undefined>();

  // 🆕 添加价格区间状态
  const [lowerPrice, setLowerPrice] = useState<string>("");
  const [upperPrice, setUpperPrice] = useState<string>("");

  // 🔧 添加调试状态
  const [debugInfo, setDebugInfo] = useState<any>({});

  const mountedRef = useRef(true);
  const isDataLoaded = useRef(false);

  // 转换 pairs 数据为 TradingPair 格式
  const tradingPairs = useMemo(() => {
    if (!pairs?.length) return [];

    console.log("🔍 转换 tradingPairs:", {
      pairsLength: pairs.length,
      poolsInfoLength: poolsInfo?.length || 0,
    });

    return pairs.map((pair, index): TradingPair => {
      const relatedPools =
        poolsInfo?.filter(
          (pool) =>
            (pool.token0 === pair.token0 && pool.token1 === pair.token1) ||
            (pool.token0 === pair.token1 && pool.token1 === pair.token0)
        ) || [];

      const token0Info = getTokenInfo(pair.token0);
      const token1Info = getTokenInfo(pair.token1);

      console.log(`🔍 处理交易对 ${index}:`, {
        pair,
        token0Info,
        token1Info,
        relatedPoolsCount: relatedPools.length,
      });

      return {
        id: `pair-${index}`,
        token0: pair.token0,
        token1: pair.token1,
        fee: relatedPools[0]?.fee || 0.3,
        pools: relatedPools,
        displayName: `${token0Info.symbol}/${token1Info.symbol}`,
        token0Info: {
          address: pair.token0,
          ...token0Info,
          isNative: false,
        },
        token1Info: {
          address: pair.token1,
          ...token1Info,
          isNative: false,
        },
      };
    });
  }, [pairs, poolsInfo]);

  // 获取可用代币
  const memoizedAvailableTokens = useMemo(() => {
    if (!pairs?.length) return [];

    const uniqueTokens = new Set<Address>();
    pairs.forEach((pair) => {
      uniqueTokens.add(pair.token0);
      uniqueTokens.add(pair.token1);
    });

    const tokens = Array.from(uniqueTokens).map((address) => {
      const info = getTokenInfo(address);
      return {
        address,
        symbol: info.symbol,
        name: info.name,
        decimals: info.decimals,
      };
    });

    console.log("🔍 可用代币:", tokens);
    return tokens;
  }, [pairs]);

  // 更新可用代币
  useEffect(() => {
    if (memoizedAvailableTokens.length > 0) {
      setAvailableTokens(memoizedAvailableTokens);
    }
  }, [memoizedAvailableTokens]);

  // 加载数据
  const loadData = useCallback(async () => {
    if (isDataLoaded.current || isLoading) return;

    try {
      console.log("🔍 开始加载数据...");
      isDataLoaded.current = true;
      await Promise.all([fetchPairs(), fetchAllPools()]);
      console.log("🔍 数据加载完成");
    } catch (error) {
      console.error("❌ 加载数据失败:", error);
      isDataLoaded.current = false;
    }
  }, [fetchPairs, fetchAllPools, isLoading]);

  useEffect(() => {
    loadData();
    return () => {
      mountedRef.current = false;
    };
  }, [loadData]);

  // 处理交易对选择
  // 处理交易对选择
  const handlePairSelect = useCallback((pair: TradingPair) => {
    console.log("🔍 AddPosition 收到交易对选择:", pair);
    console.log("🔍 pair.pools:", pair.pools); // 🆕 查看池子数据
    console.log("🔍 当前 mountedRef.current:", mountedRef.current);
    console.log("🔍 开始更新状态...");

    setSelectedPair(pair);
    setAmount0("");
    setAmount1("");
    setSelectedPool(null); // 先重置
    setLowerPrice("");
    setUpperPrice("");

    // 🔧 直接从 pair 中获取代币信息
    const token0: Token = {
      address: pair.token0,
      symbol: pair.token0Info?.symbol || `T${pair.token0.slice(-4)}`,
      name: pair.token0Info?.name || `Token ${pair.token0.slice(-4)}`,
      decimals: pair.token0Info?.decimals || 18,
      isNative: false,
    };

    const token1: Token = {
      address: pair.token1,
      symbol: pair.token1Info?.symbol || `T${pair.token1.slice(-4)}`,
      name: pair.token1Info?.name || `Token ${pair.token1.slice(-4)}`,
      decimals: pair.token1Info?.decimals || 18,
      isNative: false,
    };

    console.log("🔍 设置代币信息:", { token0, token1 });

    setSelectedToken0(token0);
    setSelectedToken1(token1);

    // 设置过滤的池子
    if (pair.pools?.length > 0) {
      setFilteredPools(pair.pools);
      console.log("🔍 设置可用池子:", pair.pools);

      // 🆕 ✅ 自动选择第一个池子 - 这是关键！
      const firstPool = pair.pools[0];
      console.log("🔍 自动选择第一个池子:", firstPool);
      setSelectedPool(firstPool);
    } else {
      setFilteredPools([]);
      console.log("⚠️ 没有找到相关池子");
    }

    // 🔧 使用 setTimeout 确保状态更新后再打印调试信息
    setTimeout(() => {
      console.log("🔍 状态更新后检查:", {
        selectedPair: pair.displayName,
        token0: token0.symbol,
        token1: token1.symbol,
        poolsCount: pair.pools?.length || 0,
        firstPool: pair.pools?.[0] || null, // 🆕 检查第一个池子
      });
    }, 100);
  }, []);

  const handlePoolSelect = useCallback((pool: Pool) => {
    console.log("🔍 AddPosition 收到池子选择:", pool);
    if (mountedRef.current) {
      setSelectedPool(pool);
    }
  }, []);

  // 获取选中池子的详细信息
  const selectedPoolInfo = useMemo(() => {
    console.log(
      !selectedPool || !poolsInfo?.length,
      "!selectedPool || !poolsInfo?.length",
      selectedPool,
      poolsInfo?.length
    );
    if (!selectedPool || !poolsInfo?.length) return null;

    const found = poolsInfo.find(
      (pool) =>
        pool.pool === selectedPool.pool ||
        (pool.token0 === selectedPool.token0 &&
          pool.token1 === selectedPool.token1 &&
          pool.fee === selectedPool.fee)
    );

    console.log("🔍 选中池子信息:", { selectedPool, found });
    return found;
  }, [selectedPool, poolsInfo, selectedToken0, selectedToken0]);

  // 使用 usePoolPrice Hook
  const { price: poolPrice, isLoading: priceLoading } = usePoolPrice(
    selectedPoolInfo,
    selectedToken0?.decimals || 18,
    selectedToken1?.decimals || 18
  );

  // 🆕 当池子价格加载完成时，自动设置价格区间
  useEffect(() => {
    if (poolPrice && !lowerPrice && !upperPrice) {
      setLowerPrice(poolPrice.priceRange.lowerPrice.toFixed(6));
      setUpperPrice(poolPrice.priceRange.upperPrice.toFixed(6));
    }
  }, [poolPrice, lowerPrice, upperPrice]);

  // 获取代币余额
  const {
    balance: token0Balance,
    isLoading: token0BalanceLoading,
    symbol: token0Symbol,
    refetch: refetchToken0Balance,
  } = useTokenBalance(selectedToken0?.address);

  const {
    balance: token1Balance,
    isLoading: token1BalanceLoading,
    symbol: token1Symbol,
    refetch: refetchToken1Balance,
  } = useTokenBalance(selectedToken1?.address);

  // 金额变化处理
  const handleAmount0Change = useCallback(
    (value: string) => {
      setAmount0(value);

      if (poolPrice && value && !isNaN(parseFloat(value))) {
        const amount0Num = parseFloat(value);
        const calculatedAmount1 =
          amount0Num * poolPrice.currentPrice.token0PerToken1;
        const decimals = selectedToken1?.decimals || 18;
        const maxDecimals = Math.min(decimals, 8);
        setAmount1(calculatedAmount1.toFixed(maxDecimals));
      } else if (!value) {
        setAmount1("");
      }
    },
    [poolPrice, selectedToken1?.decimals]
  );

  const handleAmount1Change = useCallback(
    (value: string) => {
      setAmount1(value);

      if (poolPrice && value && !isNaN(parseFloat(value))) {
        const amount1Num = parseFloat(value);
        const calculatedAmount0 =
          amount1Num * poolPrice.currentPrice.token1PerToken0;
        const decimals = selectedToken0?.decimals || 18;
        const maxDecimals = Math.min(decimals, 8);
        setAmount0(calculatedAmount0.toFixed(maxDecimals));
      } else if (!value) {
        setAmount0("");
      }
    },
    [poolPrice, selectedToken0?.decimals]
  );

  // 🆕 添加流动性处理函数
  const handleAddLiquidity = useCallback(async () => {
    if (
      !selectedPair ||
      !selectedPool ||
      !selectedToken0 ||
      !selectedToken1 ||
      !address
    ) {
      console.error("缺少必要信息");
      return;
    }

    try {
      setIsSubmitting(true);

      const amount0Wei = parseUnits(amount0, selectedToken0.decimals);
      const amount1Wei = parseUnits(amount1, selectedToken1.decimals);

      // 🆕 检查余额
      const hasToken0Balance = await checkSufficientBalance(
        selectedToken0.address,
        amount0Wei
      );
      const hasToken1Balance = await checkSufficientBalance(
        selectedToken1.address,
        amount1Wei
      );

      if (!hasToken0Balance) {
        alert(`${selectedToken0.symbol} 余额不足！`);
        return;
      }

      if (!hasToken1Balance) {
        alert(`${selectedToken1.symbol} 余额不足！`);
        return;
      }

      // 🆕 构建参数并调用 mintWithApproval（自动处理授权）
      const mintParamsInput: MintParamsInput = {
        token0: selectedToken0,
        token1: selectedToken1,
        selectedPool: selectedPool,
        amount0: amount0,
        amount1: amount1,
        recipient: address,
        deadlineMinutes: 20,
      };

      const mintParams = buildMintParams(mintParamsInput);

      // 🚀 使用自动处理授权的方法
      const result = await mintWithApproval(mintParams);
      console.log("✅ mint 结果:", result);

      // alert("添加流动性成功！");

      // 重置表单...
    } catch (error) {
      console.error("添加流动性失败:", error);
      // alert(error.message || "添加流动性失败");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    selectedPair,
    selectedPool,
    selectedToken0,
    selectedToken1,
    address,
    amount0,
    amount1,
    refetchToken0Balance,
    refetchToken1Balance,
  ]);

  // 🔧 添加调试信息显示
  const renderDebugInfo = () => {
    if (process.env.NODE_ENV !== "development") return null;

    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs">
        <div className="font-bold mb-2">🔍 调试信息:</div>
        <div>selectedPair: {selectedPair ? "✅" : "❌"}</div>
        <div>
          selectedToken0:{" "}
          {selectedToken0 ? `✅ ${selectedToken0.symbol}` : "❌"}
        </div>
        <div>
          selectedToken1:{" "}
          {selectedToken1 ? `✅ ${selectedToken1.symbol}` : "❌"}
        </div>
        <div>selectedPool: {selectedPool ? "✅" : "❌"}</div>
        <div>address: {address ? "✅" : "❌"}</div>
        <div>availableTokens: {availableTokens.length}</div>
        <div>tradingPairs: {tradingPairs.length}</div>
        <div>poolsInfo: {poolsInfo?.length || 0}</div>

        {selectedPair && (
          <div className="mt-2 p-2 bg-white rounded">
            <div>Pair: {selectedPair.displayName}</div>
            <div>Token0: {selectedPair.token0}</div>
            <div>Token1: {selectedPair.token1}</div>
            <div>Pools: {selectedPair.pools?.length || 0}</div>
          </div>
        )}
      </div>
    );
  };

  // 🔧 条件检查
  const canShowTokenInputs = selectedPair && selectedToken0 && selectedToken1;
  console.log("🔍 显示代币输入框条件:", {
    selectedPair: !!selectedPair,
    selectedToken0: !!selectedToken0,
    selectedToken1: !!selectedToken1,
    canShowTokenInputs,
    "poolPrice:": poolPrice,
    selectedPoolInfo: selectedPoolInfo,
  });

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>添加流动性</CardTitle>
        <CardDescription>选择交易对并添加流动性以赚取手续费</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 🔧 调试信息 */}
        {/* {renderDebugInfo()} */}

        {/* 🆕 钱包连接状态 */}
        {!address && (
          <Alert>
            <AlertDescription>请先连接钱包以继续操作</AlertDescription>
          </Alert>
        )}

        {/* 交易对选择器 */}
        {tradingPairs.length > 0 && (
          <TradingPairSelector
            selectedPair={selectedPair}
            selectedPool={selectedPool}
            onPairSelect={handlePairSelect}
            onPoolSelect={handlePoolSelect}
            availablePairs={tradingPairs}
            availablePools={poolsInfo}
            disabled={isSubmitting}
          />
        )}

        {/* 显示选中池子的费率信息 */}
        {selectedPool && (
          <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
            <span>交易费率:</span>
            <Badge variant="secondary">
              {formatFeePercent(selectedPool.fee)}
            </Badge>
          </div>
        )}
        {/* 池子价格显示 */}
        {selectedPoolInfo && selectedToken0 && selectedToken1 && (
          <PoolPriceDisplay
            pool={selectedPoolInfo}
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

        {/* 代币输入框 */}
        {canShowTokenInputs ? (
          <div className="space-y-4">
            <div className="text-green-600 text-sm">✅ 显示代币输入框</div>
            <TokenAmountInput
              label="第一个代币"
              value={amount0}
              onChange={handleAmount0Change}
              selectedToken={selectedToken0}
              availableTokens={[selectedToken0]}
              balance={token0Balance}
              showBalance={true}
              showMaxButton={true}
              onMaxClick={() => {
                if (token0Balance) {
                  handleAmount0Change(token0Balance);
                }
              }}
              usdValue={0}
              showUsdValue={false}
              balanceLoading={token0BalanceLoading}
              mode="input"
              disabled={isSubmitting || priceLoading}
              placeholder="0"
              onTokenChange={setSelectedToken0}
            />
            <div className="flex justify-center">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-gray-500 font-bold">+</span>
              </div>
            </div>
            <TokenAmountInput
              label="第二个代币"
              value={amount1}
              onChange={handleAmount1Change}
              selectedToken={selectedToken1}
              availableTokens={[selectedToken1]}
              balance={token1Balance}
              balanceLoading={token1BalanceLoading}
              showBalance={true}
              showMaxButton={true}
              onMaxClick={() => {
                if (token1Balance) {
                  handleAmount1Change(token1Balance);
                }
              }}
              usdValue={0}
              showUsdValue={false}
              mode="input"
              disabled={isSubmitting || priceLoading}
              placeholder="0"
              onTokenChange={setSelectedToken1}
            />
            <PriceCalculator
              selectedPool={selectedPoolInfo}
              token0={selectedToken0}
              token1={selectedToken1}
              amount0={amount0}
              amount1={amount1}
            />
            {/* 🆕 价格区间设置 */}
            {poolPrice && (
              <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  设置价格区间
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">
                      最低价格
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      value={lowerPrice}
                      onChange={(e) => setLowerPrice(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {selectedToken1?.symbol} per {selectedToken0?.symbol}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">
                      最高价格
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      value={upperPrice}
                      onChange={(e) => setUpperPrice(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {selectedToken1?.symbol} per {selectedToken0?.symbol}
                    </div>
                  </div>
                </div>

                {/* 当前价格指示器 */}
                <div className="flex items-center justify-center p-2 bg-white dark:bg-gray-800 rounded border">
                  <div className="text-sm">
                    <span className="text-gray-600">当前价格: </span>
                    <span className="font-mono font-medium">
                      {poolPrice.currentPrice.token0PerToken1.toFixed(6)}
                    </span>
                    <span className="text-gray-600 ml-1">
                      {selectedToken1?.symbol} per {selectedToken0?.symbol}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {/* 🆕 添加流动性预览 */}
            {selectedPool && amount0 && amount1 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                <div className="text-sm font-medium text-green-800">
                  添加流动性预览
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>存入 {selectedToken0?.symbol}:</span>
                    <span className="font-mono">{amount0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>存入 {selectedToken1?.symbol}:</span>
                    <span className="font-mono">{amount1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>费率:</span>
                    <span>{formatFeePercent(selectedPool.fee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>池子索引:</span>
                    <span>{selectedPool.index}</span>
                  </div>
                  {lowerPrice && upperPrice && (
                    <>
                      <div className="flex justify-between">
                        <span>价格区间:</span>
                        <span className="font-mono text-xs">
                          {parseFloat(lowerPrice).toFixed(4)} -{" "}
                          {parseFloat(upperPrice).toFixed(4)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-red-600 text-sm">
            ❌ 无法显示代币输入框 - 检查上面的状态
          </div>
        )}

        {/* 加载状态 */}
        {(isLoading || priceLoading) && (
          <div className="flex items-center justify-center p-4 text-gray-500">
            <div className="w-4 h-4 border border-gray-300 border-t-transparent rounded-full animate-spin mr-2"></div>
            <span>{isLoading ? "加载交易对中..." : "获取价格信息中..."}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            setAmount0("");
            setAmount1("");
            setSelectedPair(null);
            setSelectedPool(null);
            setSelectedToken0(undefined);
            setSelectedToken1(undefined);
            setFilteredPools([]);
            setLowerPrice("");
            setUpperPrice("");
          }}
          disabled={isSubmitting}
        >
          重置
        </Button>
        <Button
          className="flex-1"
          onClick={handleAddLiquidity}
          disabled={
            !selectedPair ||
            !selectedPool ||
            !amount0 ||
            !amount1 ||
            isSubmitting ||
            priceLoading ||
            !address
          }
        >
          {isSubmitting
            ? "处理中..."
            : priceLoading
            ? "加载价格..."
            : !address
            ? "请连接钱包"
            : "添加流动性"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AddPosition;
