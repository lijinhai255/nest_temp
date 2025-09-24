"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import TokenSelector from "@/components/TokenSelector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { usePoolManagerWithClients } from "@/hooks/usePoolManagerWithClients";
import { Address } from "viem";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useTokenBalance } from "@/hooks/useTokenBalance";

// Token interface
interface Token {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
}

// 将常量移到组件外部，避免重复创建
const TOKEN_INFO: Record<
  string,
  { symbol: string; name: string; decimals: number }
> = {
  "0xD61bfEBA1E28356e653977E4fC5AA82F25396256": {
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
  },
  "0x6B175474E89094C44Da98b954EedeAC495271d0F": {
    symbol: "DAI",
    name: "Dai Stablecoin",
    decimals: 18,
  },
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48": {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
  },
  "0xdAC17F958D2ee523a2206206994597C13D831ec7": {
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
  },
};

const FEE_OPTIONS = [
  { value: "100", label: "0.01%", tickSpacing: 1 },
  { value: "500", label: "0.05%", tickSpacing: 10 },
  { value: "3000", label: "0.3%", tickSpacing: 60 },
  { value: "10000", label: "1%", tickSpacing: 200 },
];

// Uniswap V3 constants
const MIN_SQRT_RATIO = 4295128739n;
const MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342n;
const Q96 = 2n ** 96n;

interface CreatePoolProps {
  onPoolCreated?: () => void;
}

export default function CreatePool({ onPoolCreated }: CreatePoolProps) {
  const { toast } = useToast();
  const {
    createAndInitializePoolIfNecessary,
    fetchPairs,
    pairs,
    isLoading,
    error,
  } = usePoolManagerWithClients();

  // States
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [token0, setToken0] = useState<Token | undefined>();
  const [token1, setToken1] = useState<Token | undefined>();
  const [fee, setFee] = useState("3000");
  const [tickLower, setTickLower] = useState("-60");
  const [tickUpper, setTickUpper] = useState("60");
  const [priceRange, setPriceRange] = useState<[number, number]>([0.9, 1.1]);
  const [initialPrice, setInitialPrice] = useState<number>(1.0);
  const [loadingTokens, setLoadingTokens] = useState(false);

  // 使用 useRef 来避免不必要的重渲染和存储状态
  const isInitializedRef = useRef(false);
  const lastPairsLengthRef = useRef(0);
  const priceUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fetchPairsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true); // 新增：跟踪组件挂载状态

  // Token balances
  const {
    balance: token0Balance,
    isLoading: token0BalanceLoading,
    symbol: token0Symbol,
  } = useTokenBalance(token0?.address);

  const {
    balance: token1Balance,
    isLoading: token1BalanceLoading,
    symbol: token1Symbol,
  } = useTokenBalance(token1?.address);

  // 使用 useMemo 缓存计算结果，避免重复计算
  const getCurrentTickSpacing = useMemo(() => {
    const feeOption = FEE_OPTIONS.find((option) => option.value === fee);
    return feeOption?.tickSpacing || 60;
  }, [fee]);

  // 使用 useCallback 缓存函数，避免每次渲染都创建新函数
  const calculateSqrtPriceX96 = useCallback(
    (price: number, token0Decimals: number, token1Decimals: number): bigint => {
      if (price <= 0) {
        console.error("价格必须大于 0");
        return 0n;
      }

      try {
        const decimalAdjustment = token1Decimals - token0Decimals;
        const adjustedPrice = price * Math.pow(10, decimalAdjustment);

        const sqrtPrice = Math.sqrt(adjustedPrice);
        const precision = 1e12;
        const sqrtPriceScaled = Math.floor(sqrtPrice * precision);
        const result = (BigInt(sqrtPriceScaled) * Q96) / BigInt(precision);

        if (result <= MIN_SQRT_RATIO || result >= MAX_SQRT_RATIO) {
          console.warn("计算的 sqrtPriceX96 可能超出有效范围");
          return 79228162514264337593543950336n;
        }

        return result;
      } catch (error) {
        console.error("计算 sqrtPriceX96 出错:", error);
        return 79228162514264337593543950336n;
      }
    },
    []
  );

  const calculateTickFromPrice = useCallback((price: number): number => {
    if (price <= 0) return 0;
    return Math.floor(Math.log(price) / Math.log(1.0001));
  }, []);

  // 修复：使用稳定的函数引用，避免循环依赖
  const updateTicksFromPriceRange = useCallback(
    (range: [number, number], tickSpacing: number) => {
      if (!isMountedRef.current) return; // 防止组件卸载后执行

      try {
        const lowerTick = calculateTickFromPrice(range[0]);
        const upperTick = calculateTickFromPrice(range[1]);

        const adjustedLowerTick =
          Math.floor(lowerTick / tickSpacing) * tickSpacing;
        const adjustedUpperTick =
          Math.ceil(upperTick / tickSpacing) * tickSpacing;

        const boundedLowerTick = Math.max(
          -887272,
          Math.min(887272, adjustedLowerTick)
        );
        const boundedUpperTick = Math.max(
          -887272,
          Math.min(887272, adjustedUpperTick)
        );

        if (boundedLowerTick >= boundedUpperTick) {
          const safeLowerTick = -tickSpacing;
          const safeUpperTick = tickSpacing;
          setTickLower(safeLowerTick.toString());
          setTickUpper(safeUpperTick.toString());
          return;
        }

        setTickLower(boundedLowerTick.toString());
        setTickUpper(boundedUpperTick.toString());
      } catch (error) {
        console.error("计算 tick 出错:", error);
        setTickLower((-tickSpacing).toString());
        setTickUpper(tickSpacing.toString());
      }
    },
    [calculateTickFromPrice] // 只依赖稳定的函数
  );

  // 优化 token pairs 加载，避免重复调用
  useEffect(() => {
    const loadTokenPairs = async () => {
      if (isInitializedRef.current || !isMountedRef.current) return;

      try {
        setLoadingTokens(true);
        await fetchPairs();
        if (isMountedRef.current) {
          isInitializedRef.current = true;
        }
      } catch (error) {
        if (isMountedRef.current) {
          console.error("Failed to fetch token pairs:", error);
          toast({
            title: "Error",
            description: "Failed to fetch token pairs",
            variant: "destructive",
          });
        }
      } finally {
        if (isMountedRef.current) {
          setLoadingTokens(false);
        }
      }
    };

    loadTokenPairs();
  }, []); // 移除所有依赖，只在组件挂载时执行一次

  // 优化 pairs 处理逻辑
  useEffect(() => {
    if (!pairs || pairs.length === 0 || !isMountedRef.current) return;
    if (pairs.length === lastPairsLengthRef.current) return;

    lastPairsLengthRef.current = pairs.length;

    const uniqueTokens = new Set<Address>();
    pairs.forEach((pair) => {
      uniqueTokens.add(pair.token0);
      uniqueTokens.add(pair.token1);
    });

    const tokens: Token[] = Array.from(uniqueTokens).map((address) => {
      const info = TOKEN_INFO[address] || {
        symbol: address.substring(0, 6),
        name: `Token ${address.substring(0, 8)}...`,
        decimals: 18,
      };

      return {
        address,
        symbol: info.symbol,
        name: info.name,
        decimals: info.decimals,
      };
    });

    setAvailableTokens(tokens);

    if (tokens.length >= 2 && !token0 && !token1) {
      setToken0(tokens[0]);
      setToken1(tokens[1]);
    }
  }, [pairs]); // 只依赖 pairs

  // 优化代币交换逻辑
  const handleSwapTokens = useCallback(() => {
    if (!isMountedRef.current) return;

    setToken0(token1);
    setToken1(token0);

    if (initialPrice !== 0) {
      const newPrice = 1 / initialPrice;
      setInitialPrice(newPrice);

      const newRange: [number, number] = [newPrice * 0.9, newPrice * 1.1];
      setPriceRange(newRange);
      updateTicksFromPriceRange(newRange, getCurrentTickSpacing);
    }
  }, [token0, token1, initialPrice, updateTicksFromPriceRange, getCurrentTickSpacing]);

  // 使用防抖来优化价格更新
  useEffect(() => {
    if (initialPrice <= 0 || !isMountedRef.current) return;

    // 清除之前的定时器
    if (priceUpdateTimeoutRef.current) {
      clearTimeout(priceUpdateTimeoutRef.current);
    }

    priceUpdateTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      
      const newRange: [number, number] = [
        initialPrice * 0.9,
        initialPrice * 1.1,
      ];
      setPriceRange(newRange);
      updateTicksFromPriceRange(newRange, getCurrentTickSpacing);
    }, 300);

    return () => {
      if (priceUpdateTimeoutRef.current) {
        clearTimeout(priceUpdateTimeoutRef.current);
      }
    };
  }, [initialPrice]); // 移除不必要的依赖

  // 优化费率变化处理
  useEffect(() => {
    if (!isMountedRef.current) return;
    if (priceRange[0] > 0 && priceRange[1] > 0) {
      updateTicksFromPriceRange(priceRange, getCurrentTickSpacing);
    }
  }, [fee]); // 只依赖 fee 变化

  // 验证池参数 - 使用 useMemo 缓存结果
  const validationError = useMemo(() => {
    if (!token0 || !token1) {
      return "Please select two different tokens";
    }

    if (token0.address === token1.address) {
      return "Cannot select the same token";
    }

    if (initialPrice <= 0) {
      return "Initial price must be greater than 0";
    }

    const lowerTickValue = parseInt(tickLower);
    const upperTickValue = parseInt(tickUpper);

    if (isNaN(lowerTickValue) || isNaN(upperTickValue)) {
      return "Invalid tick values";
    }

    if (lowerTickValue >= upperTickValue) {
      return "Lower tick must be less than upper tick";
    }

    if (
      lowerTickValue % getCurrentTickSpacing !== 0 ||
      upperTickValue % getCurrentTickSpacing !== 0
    ) {
      return `Tick values must be multiples of ${getCurrentTickSpacing} for the selected fee tier`;
    }

    return null;
  }, [token0, token1, initialPrice, tickLower, tickUpper, getCurrentTickSpacing]);

  // 处理池创建
  const handleCreatePool = useCallback(async () => {
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    if (!token0 || !token1 || !isMountedRef.current) return;

    try {
      const isToken0Lower =
        token0.address.toLowerCase() < token1.address.toLowerCase();
      const [sortedToken0, sortedToken1] = isToken0Lower
        ? [token0, token1]
        : [token1, token0];

      const adjustedPrice = isToken0Lower ? initialPrice : 1 / initialPrice;

      const sqrtPriceX96 = calculateSqrtPriceX96(
        adjustedPrice,
        sortedToken0.decimals,
        sortedToken1.decimals
      );

      if (sqrtPriceX96 === 0n) {
        toast({
          title: "Error",
          description:
            "Invalid initial price calculation. Please check your price settings.",
          variant: "destructive",
        });
        return;
      }

      if (sqrtPriceX96 <= MIN_SQRT_RATIO || sqrtPriceX96 >= MAX_SQRT_RATIO) {
        toast({
          title: "Error",
          description:
            "Price is out of valid range. Please adjust your initial price.",
          variant: "destructive",
        });
        return;
      }

      const lowerTickValue = parseInt(tickLower);
      const upperTickValue = parseInt(tickUpper);

      const [finalLowerTick, finalUpperTick] = isToken0Lower
        ? [lowerTickValue, upperTickValue]
        : [-upperTickValue, -lowerTickValue];

      const params = {
        token0: sortedToken0.address,
        token1: sortedToken1.address,
        fee: parseInt(fee),
        tickLower: finalLowerTick,
        tickUpper: finalUpperTick,
        sqrtPriceX96: sqrtPriceX96,
      };

      await createAndInitializePoolIfNecessary(params);

      if (isMountedRef.current) {
        toast({
          title: "Success",
          description: `Pool created successfully for ${sortedToken0.symbol}/${sortedToken1.symbol}`,
        });

        onPoolCreated?.();
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;

      console.error("创建池失败:", err);

      let errorMessage = "Failed to create pool";
      if (err.message?.includes("SPL")) {
        errorMessage =
          "Square root price limit exceeded. Please adjust your initial price or price range to be more conservative.";
      } else if (err.message?.includes("TLU")) {
        errorMessage =
          "Invalid tick range. Lower tick must be less than upper tick.";
      } else if (
        err.message?.includes("user rejected") ||
        err.message?.includes("rejected")
      ) {
        errorMessage = "Transaction cancelled by user";
      } else if (err.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for transaction";
      } else if (err.message) {
        errorMessage = err.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [
    validationError,
    token0,
    token1,
    initialPrice,
    tickLower,
    tickUpper,
    calculateSqrtPriceX96,
    fee,
    createAndInitializePoolIfNecessary,
    toast,
    onPoolCreated,
  ]);

  // 处理价格范围变化
  const handlePriceRangeChange = useCallback(
    (values: number[]) => {
      if (!isMountedRef.current) return;
      
      const newRange: [number, number] = [values[0], values[1]];
      setPriceRange(newRange);
      updateTicksFromPriceRange(newRange, getCurrentTickSpacing);
    },
    [updateTicksFromPriceRange, getCurrentTickSpacing]
  );

  // 处理手动 tick 变化
  const handleTickChange = useCallback(
    (tickType: "lower" | "upper", value: string) => {
      if (!isMountedRef.current) return;
      
      const tickValue = parseInt(value);
      if (isNaN(tickValue)) return;

      const adjustedTick =
        Math.round(tickValue / getCurrentTickSpacing) * getCurrentTickSpacing;

      if (tickType === "lower") {
        setTickLower(adjustedTick.toString());
        const price = Math.pow(1.0001, adjustedTick);
        setPriceRange([price, priceRange[1]]);
      } else {
        setTickUpper(adjustedTick.toString());
        const price = Math.pow(1.0001, adjustedTick);
        setPriceRange([priceRange[0], price]);
      }
    },
    [getCurrentTickSpacing, priceRange]
  );

  // 组件挂载和卸载处理
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      
      // 清理所有定时器
      if (priceUpdateTimeoutRef.current) {
        clearTimeout(priceUpdateTimeoutRef.current);
        priceUpdateTimeoutRef.current = null;
      }
      if (fetchPairsTimeoutRef.current) {
        clearTimeout(fetchPairsTimeoutRef.current);
        fetchPairsTimeoutRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full">
      <div className="space-y-6">
        {loadingTokens ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600">Loading tokens...</span>
          </div>
        ) : (
          <>
            {/* Token selection area */}
            <div className="space-y-4">
              <TokenSelector
                selectedToken={token0}
                onTokenChange={setToken0}
                availableTokens={availableTokens}
                label="First Token"
                balance={token0Balance}
                showBalance={true}
              />

              {/* Swap button */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  onClick={handleSwapTokens}
                >
                  ↓↑
                </Button>
              </div>
              <TokenSelector
                selectedToken={token1}
                onTokenChange={setToken1}
                availableTokens={availableTokens}
                label="Second Token"
                balance={token1Balance}
                showBalance={true}
              />
            </div>

            {/* Fee selection */}
            <div className="space-y-2">
              <Label htmlFor="fee">Fee Tier</Label>
              <Select value={fee} onValueChange={setFee}>
                <SelectTrigger id="fee">
                  <SelectValue placeholder="Select fee tier" />
                </SelectTrigger>
                <SelectContent>
                  {FEE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label} (Tick Spacing: {option.tickSpacing})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                Higher fee tiers are suitable for more volatile token pairs,
                lower fee tiers for stable pairs. Current tick spacing:{" "}
                {getCurrentTickSpacing}
              </p>
            </div>

            {/* Initial price setting */}
            <div className="space-y-2">
              <Label htmlFor="initialPrice">Initial Price</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="initialPrice"
                  type="number"
                  step="any"
                  value={initialPrice}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val > 0) {
                      setInitialPrice(val);
                    }
                  }}
                  placeholder="1.0"
                  className="flex-1"
                />
                <span className="text-sm text-gray-500 whitespace-nowrap">
                  {token1?.symbol} per {token0?.symbol}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Set the initial price ratio between the two tokens. This will be
                used to initialize the pool.
                {token0 && token1 && token0.decimals !== token1.decimals && (
                  <span className="block mt-1 text-amber-600">
                    ⚠️ Note: {token0.symbol} has {token0.decimals} decimals,{" "}
                    {token1.symbol} has {token1.decimals} decimals
                  </span>
                )}
              </p>
            </div>

            {/* Price range settings */}
            <div className="space-y-4">
              <div>
                <Label>Price Range (±10% from initial price)</Label>
                <p className="text-sm text-gray-500 mb-4">
                  Set the price range where you want to provide liquidity.
                  Conservative ranges are recommended to avoid SPL errors.
                </p>

                <div className="py-4">
                  <Slider
                    defaultValue={[0.9, 1.1]}
                    min={0.1}
                    max={5}
                    step={0.01}
                    value={[priceRange[0], priceRange[1]]}
                    onValueChange={handlePriceRangeChange}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minPrice">Min Price</Label>
                    <Input
                      id="minPrice"
                      type="number"
                      step="any"
                      value={priceRange[0].toFixed(6)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0 && val < priceRange[1]) {
                          const newRange: [number, number] = [
                            val,
                            priceRange[1],
                          ];
                          setPriceRange(newRange);
                          updateTicksFromPriceRange(newRange, getCurrentTickSpacing);
                        }
                      }}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="maxPrice">Max Price</Label>
                    <Input
                      id="maxPrice"
                      type="number"
                      step="any"
                      value={priceRange[1].toFixed(6)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > priceRange[0]) {
                          const newRange: [number, number] = [
                            priceRange[0],
                            val,
                          ];
                          setPriceRange(newRange);
                          updateTicksFromPriceRange(newRange, getCurrentTickSpacing);
                        }
                      }}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Display Tick values */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <Label htmlFor="tickLower">Lower Tick</Label>
                  <Input
                    id="tickLower"
                    type="number"
                    value={tickLower}
                    onChange={(e) => handleTickChange("lower", e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Must be multiple of {getCurrentTickSpacing}
                  </p>
                </div>

                <div>
                  <Label htmlFor="tickUpper">Upper Tick</Label>
                  <Input
                    id="tickUpper"
                    type="number"
                    value={tickUpper}
                    onChange={(e) => handleTickChange("upper", e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Must be multiple of {getCurrentTickSpacing}
                  </p>
                </div>
              </div>
            </div>

            {/* Validation warnings */}
            {validationError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">⚠️ {validationError}</p>
              </div>
            )}

            {/* Pool summary */}
            {token0 && token1 && (
              <div className="p-4 bg-gray-50 rounded-md space-y-2">
                <h4 className="font-medium">Pool Summary</h4>
                <div className="text-sm space-y-1">
                  <p>
                    Pair: {token0.symbol}/{token1.symbol}
                  </p>
                  <p>Fee: {FEE_OPTIONS.find((f) => f.value === fee)?.label}</p>
                  <p>
                    Initial Price: {initialPrice.toFixed(6)} {token1.symbol} per{" "}
                    {token0.symbol}
                  </p>
                  <p>
                    Price Range: {priceRange[0].toFixed(6)} -{" "}
                    {priceRange[1].toFixed(6)}
                  </p>
                  <p>
                    Tick Range: {tickLower} to {tickUpper}
                  </p>
                </div>
              </div>
            )}

            {/* Create button */}
            <Button
              className="w-full"
              onClick={handleCreatePool}
              disabled={
                isLoading ||
                !token0 ||
                !token1 ||
                loadingTokens ||
                !!validationError
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Pool...
                </>
              ) : (
                "Create Pool"
              )}
            </Button>

            {/* Error display */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">Error: {error}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
