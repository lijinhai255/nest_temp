"use client";

import { useState, useCallback, useMemo, useEffect } from "react";

// 调试模式开关
const DEBUG_MODE = false;

// 调试日志函数
const debugLog = (...args: unknown[]) => {
  if (DEBUG_MODE) {
    console.log(...args);
  }
};
import { parseUnits, formatUnits } from "viem";
import { useSimulateContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDown, RefreshCw, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTokenOptions, Token } from "@/hooks/useTokenOptions";
import usePoolManagerWithClients from "@/hooks/usePoolManagerWithClients";
import useSwapRouterWithClients from "@/hooks/useSwapRouterWithClients";
import { PoolInfo } from "@/store/usePoolManagerStore";
import { useWallet } from "@/provider";
import swapRouterAbi from "@/lib/abi/SwapRouter.json";

// 费率选项
const FEE_TIERS = [
  { value: 100, label: "0.01%", description: "最适合稳定币" },
  { value: 500, label: "0.05%", description: "低波动性代币对" },
  { value: 3000, label: "0.3%", description: "大多数代币对" },
  { value: 10000, label: "1%", description: "高波动性代币对" },
];

export const NewSwap = () => {
  const { toast } = useToast();
  const { address } = useWallet();

  // 使用 useTokenOptions 代替模拟数据
  const {
    inTokens,
    outTokens,
    isLoading: tokensLoading,
    error: tokensError,
    refetchBalances,
  } = useTokenOptions();

  // 获取所有的池子
  const {
    poolsInfo,
    isLoading: poolsLoading,
    fetchAllPools,
  } = usePoolManagerWithClients();

  // 使用 SwapRouter 进行交易
  const {
    exactInput,
    exactOutput,
    quoteExactInput,
    quoteExactOutput,
    isWritePending,
    writeData,
  } = useSwapRouterWithClients();

  // 状态管理
  const [inputToken, setInputToken] = useState<Token | null>(null);
  const [outputToken, setOutputToken] = useState<Token | null>(null);
  const [inputAmount, setInputAmount] = useState("");
  const [outputAmount, setOutputAmount] = useState("");
  const [selectedFee, setSelectedFee] = useState<number>(3000); // 默认 0.3% 费率
  const [isLoading, setIsLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [slippage, setSlippage] = useState<number>(0.5); // 默认滑点 0.5%
  const [deadline, setDeadline] = useState<number>(20); // 默认截止时间 20 分钟
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    // 每次组件加载时获取最新的池子信息
    const loadPools = async () => {
      try {
        debugLog("🔍 调试: 开始获取池子信息...");
        await fetchAllPools();
        debugLog("🔍 调试: 池子信息获取完成");
      } catch (error) {
        debugLog("🔍 调试: 获取池子信息失败:", error);
      }
    };

    loadPools();
  }, [fetchAllPools]);

  // 初始化代币选择
  useEffect(() => {
    if (inTokens.length > 0 && !inputToken) {
      setInputToken(inTokens[0]);
    }

    if (outTokens.length > 1 && !outputToken) {
      // 选择第二个代币作为输出代币，避免与输入代币相同
      setOutputToken(outTokens[1] || outTokens[0]);
    }
  }, [inTokens, outTokens, inputToken, outputToken]);

  // 监听费率变化
  useEffect(() => {
    debugLog("🔍 调试: 费率变化", {
      selectedFee: selectedFee,
      availablePoolsLength: availablePools.length,
      selectedPoolExists: !!selectedPool
    });
  }, [selectedFee]);

  // 根据选择的代币对筛选可用的池子
  const availablePools = useMemo(() => {
    if (!inputToken || !outputToken || !poolsInfo || poolsInfo.length === 0) {
      debugLog("🔍 调试: availablePools 过滤条件不满足:", {
        hasInputToken: !!inputToken,
        hasOutputToken: !!outputToken,
        hasPoolsInfo: !!poolsInfo,
        poolsInfoLength: poolsInfo?.length
      });
      return [];
    }

    debugLog("🔍 调试: 开始过滤池子，总池子数:", poolsInfo.length);
    debugLog("🔍 调试: 输入代币地址:", inputToken.address);
    debugLog("🔍 调试: 输出代币地址:", outputToken.address);

    // 筛选包含所选代币对的池子
    const filteredPools = poolsInfo.filter((pool) => {
      const matchesTokens =
        (pool.token0.toLowerCase() === inputToken.address.toLowerCase() &&
          pool.token1.toLowerCase() === outputToken.address.toLowerCase()) ||
        (pool.token0.toLowerCase() === outputToken.address.toLowerCase() &&
          pool.token1.toLowerCase() === inputToken.address.toLowerCase());

      if (matchesTokens) {
        debugLog("🔍 调试: 找到匹配池子:", {
          pool: pool.pool,
          token0: pool.token0,
          token1: pool.token1,
          fee: pool.fee
        });
      }

      return matchesTokens;
    });

    debugLog("🔍 调试: 过滤后的池子数量:", filteredPools.length);
    return filteredPools;
  }, [inputToken, outputToken, poolsInfo]);

  // 根据选择的代币对获取可用的费率
  const availableFees = useMemo(() => {
    if (availablePools.length === 0) {
      // 如果没有可用池子，返回所有费率选项
      return FEE_TIERS;
    }

    // 从可用池子中提取唯一的费率
    const uniqueFees = Array.from(
      new Set(availablePools.map((pool) => pool.fee))
    );

    // 将唯一费率映射到费率选项
    return FEE_TIERS.filter((feeTier) => uniqueFees.includes(feeTier.value));
  }, [availablePools]);

  // 获取当前选择的池子
  const selectedPool = useMemo(() => {
    if (availablePools.length === 0) {
      debugLog("🔍 调试: availablePools 为空数组");
      debugLog("🔍 调试: poolsInfo 数据:", poolsInfo);
      debugLog("🔍 调试: inputToken:", inputToken?.symbol, inputToken?.address);
      debugLog("🔍 调试: outputToken:", outputToken?.symbol, outputToken?.address);
      return null;
    }

    // 根据选择的费率筛选池子
    const poolsWithSelectedFee = availablePools.filter(
      (pool) => pool.fee === selectedFee
    );

    debugLog("🔍 调试: availablePools 长度:", availablePools.length);
    debugLog("🔍 调试: selectedFee:", selectedFee);
    debugLog("🔍 调试: poolsWithSelectedFee 长度:", poolsWithSelectedFee.length);
    debugLog("🔍 调试: availablePools 费率列表:", availablePools.map(p => p.fee));

    // 如果没有找到精确匹配的费率，选择最接近的可用费率
    if (poolsWithSelectedFee.length === 0 && availablePools.length > 0) {
      debugLog("🔍 调试: 未找到精确匹配费率，寻找最接近的费率");

      // 计算费率差异并选择最接近的
      const poolWithClosestFee = availablePools.reduce((closest, current) => {
        const closestDiff = Math.abs(closest.fee - selectedFee);
        const currentDiff = Math.abs(current.fee - selectedFee);
        return currentDiff < closestDiff ? current : closest;
      });

      debugLog("🔍 调试: 选择最接近的费率池子:", {
        selectedFee: selectedFee,
        closestFee: poolWithClosestFee.fee,
        pool: poolWithClosestFee.pool
      });

      // 自动更新选择的费率 - 使用 useEffect 来避免在 useMemo 中调用 setState
      return poolWithClosestFee;
    }

    return poolsWithSelectedFee.length > 0 ? poolsWithSelectedFee[0] : null;
  }, [availablePools, selectedFee, poolsInfo, inputToken, outputToken]);

  // 如果没有找到精确匹配的费率，自动更新选择的费率
  useEffect(() => {
    if (availablePools.length > 0) {
      const poolsWithSelectedFee = availablePools.filter(
        (pool) => pool.fee === selectedFee
      );

      if (poolsWithSelectedFee.length === 0) {
        const poolWithClosestFee = availablePools.reduce((closest, current) => {
          const closestDiff = Math.abs(closest.fee - selectedFee);
          const currentDiff = Math.abs(current.fee - selectedFee);
          return currentDiff < closestDiff ? current : closest;
        });

        if (poolWithClosestFee.fee !== selectedFee) {
          setSelectedFee(poolWithClosestFee.fee);
        }
      }
    }
  }, [availablePools, selectedFee, setSelectedFee]);

  // 简单的价格计算函数（作为备用）
  const calculateOutputAmount = useCallback(
    (
      amount: string,
      fromToken: Token | null,
      toToken: Token | null
    ): string => {
      if (!fromToken || !toToken || !amount || isNaN(parseFloat(amount))) {
        return "0";
      }

      // 如果有选定的池子，使用池子的价格
      if (selectedPool) {
        // 这里应该使用池子的 sqrtPriceX96 计算价格
        // 这是一个简化版本，实际应该使用更复杂的计算
        const inputValue = parseFloat(amount);
        let rate = 1;
        const fee = selectedFee / 1000000; // 费率百分比

        // 根据代币顺序确定价格方向
        if (
          selectedPool.token0.toLowerCase() === fromToken.address.toLowerCase()
        ) {
          // 如果输入代币是 token0，使用正向价格
          const sqrtPrice = typeof selectedPool.sqrtPriceX96 === 'bigint'
            ? Number(selectedPool.sqrtPriceX96)
            : Number(BigInt(selectedPool.sqrtPriceX96 || "0"));
          rate = sqrtPrice ** 2 / 2 ** 192;
        } else {
          // 如果输入代币是 token1，使用反向价格
          const sqrtPrice = typeof selectedPool.sqrtPriceX96 === 'bigint'
            ? Number(selectedPool.sqrtPriceX96)
            : Number(BigInt(selectedPool.sqrtPriceX96 || "0"));
          rate = 2 ** 192 / sqrtPrice ** 2;
        }

        // 应用费率
        const outputValue = inputValue * rate * (1 - fee);
        return outputValue.toFixed(toToken.decimals);
      }

      // 如果没有池子，使用简单的价格估算
      let rate = 1;

      // 根据代币符号设置简单汇率
      if (fromToken.symbol === "ETH" && toToken.symbol === "USDC") {
        rate = 3000;
      } else if (fromToken.symbol === "USDC" && toToken.symbol === "ETH") {
        rate = 1 / 3000;
      } else if (fromToken.symbol === "ETH" && toToken.symbol === "USDT") {
        rate = 3000;
      } else if (fromToken.symbol === "USDT" && toToken.symbol === "ETH") {
        rate = 1 / 3000;
      } else if (fromToken.symbol === "USDC" && toToken.symbol === "USDT") {
        rate = 1;
      } else if (fromToken.symbol === "USDT" && toToken.symbol === "USDC") {
        rate = 1;
      }

      const inputValue = parseFloat(amount);
      if (isNaN(inputValue)) return "0";

      const feePercentage = selectedFee / 1000000; // 费率百分比
      const outputValue = inputValue * rate * (1 - feePercentage);
      return outputValue.toFixed(toToken.decimals);
    },
    [selectedFee, selectedPool]
  );

  // 在组件顶层使用 useSimulateContract
  const simulationParams = useMemo(() => {
    if (!inputToken || !outputToken || !inputAmount) return null;

    // 安全地获取 sqrtPriceLimitX96
    const sqrtPriceLimitX96 = selectedPool?.sqrtPriceX96 && selectedPool.sqrtPriceX96 !== "0" && selectedPool.sqrtPriceX96 !== "undefined"
      ? BigInt(selectedPool.sqrtPriceX96)
      : 0n;

    return {
      tokenIn: inputToken.address as `0x${string}`,
      tokenOut: outputToken.address as `0x${string}`,
      indexPath: [],
      amountIn: parseUnits(inputAmount, inputToken.decimals),
      sqrtPriceLimitX96: sqrtPriceLimitX96,
    };
  }, [inputToken, outputToken, inputAmount, selectedPool]);

  // 模拟调用 hook
  const simulation = useSimulateContract({
    address: "0xD2c220143F5784b3bD84ae12747d97C8A36CeCB2" as `0x${string}`,
    abi: swapRouterAbi,
    functionName: "quoteExactInput",
    args: simulationParams ? [simulationParams] : undefined,
    query: {
      enabled: !!simulationParams && simulationParams.amountIn > 0n,
    },
  });

  // 调试版本的获取精确输出金额报价
  const debugGetExactOutputQuote = useCallback(
    async (inputToken: Token, outputToken: Token, inputAmount: string) => {
      if (
        !inputToken ||
        !outputToken ||
        !inputAmount ||
        parseFloat(inputAmount) <= 0
      ) {
        debugLog("🔍 调试: 参数验证失败");
        return {
          success: false,
          error: "参数验证失败",
          result: "0",
        };
      }

      debugLog("🔍 调试: 开始调试调用");
      debugLog("🔍 调试: 输入参数:", {
        inputToken: inputToken.symbol,
        outputToken: outputToken.symbol,
        inputAmount,
        selectedPool: selectedPool?.pool,
      });

      // 使用用户实际输入的金额
      const testAmount = inputAmount;
      debugLog("🔍 调试: 使用测试金额:", testAmount);

      try {
        // 构建报价参数 - 修复SPL错误
        let sqrtPriceLimitX96: bigint;
        if (selectedPool?.sqrtPriceX96 && selectedPool.sqrtPriceX96 !== "0" && selectedPool.sqrtPriceX96 !== "undefined") {
          // 如果池子有价格，使用合适的价格限制
          const currentSqrtPriceX96 = BigInt(selectedPool.sqrtPriceX96);
          const zeroForOne = inputToken.address.toLowerCase() < outputToken.address.toLowerCase();

          if (zeroForOne) {
            // token0 -> token1: 价格限制应该低于当前价格
            sqrtPriceLimitX96 = currentSqrtPriceX96 * 9999n / 10000n; // 稍微低于当前价格
          } else {
            // token1 -> token0: 价格限制应该高于当前价格
            sqrtPriceLimitX96 = currentSqrtPriceX96 * 10001n / 10000n; // 稍微高于当前价格
          }
        } else {
          // 如果没有池子价格，使用0表示无价格限制
          sqrtPriceLimitX96 = 0n;
        }

        const quoteParams = {
          tokenIn: inputToken.address as `0x${string}`,
          tokenOut: outputToken.address as `0x${string}`,
          indexPath: [],
          amountIn: parseUnits(testAmount, inputToken.decimals),
          sqrtPriceLimitX96: sqrtPriceLimitX96,
        };

        debugLog("🔍 调试: 报价参数:", {
          ...quoteParams,
          amountIn: quoteParams.amountIn.toString(),
          sqrtPriceLimitX96: quoteParams.sqrtPriceLimitX96.toString(),
        });

        debugLog("🔍 调试: 检查池子信息...");
        if (selectedPool) {
          debugLog("🔍 调试: 选中池子详情:", {
            pool: selectedPool.pool,
            index: selectedPool.index,
            token0: selectedPool.token0,
            token1: selectedPool.token1,
            fee: selectedPool.fee,
            liquidity: selectedPool.liquidity.toString(),
            sqrtPriceX96: selectedPool.sqrtPriceX96.toString(),
          });
        } else {
          debugLog("🔍 调试: 未选中池子，使用空 indexPath");
        }

        // 使用组件顶层的模拟调用结果
        if (simulation.isLoading) {
          debugLog("🔍 调试: 模拟调用进行中...");
        }

        if (simulation.error) {
          debugLog("🔍 调试: 模拟调用失败:", simulation.error);
          debugLog("🔍 调试: 错误详情:", {
            message: simulation.error.message,
            name: simulation.error.name,
            stack: simulation.error.stack,
            cause: simulation.error.cause,
          });

          // 安全地访问可能的额外属性
          const errorDetails = {
            shortMessage: (simulation.error as { shortMessage?: string }).shortMessage,
            details: (simulation.error as { details?: unknown }).details,
            code: (simulation.error as { code?: unknown }).code,
          };

          debugLog("🔍 调试: 额外错误信息:", errorDetails);

          return {
            success: false,
            error: simulation.error.message || "模拟调用失败",
            errorName: simulation.error.name,
            errorDetails: errorDetails,
            result: "0",
          };
        }

        if (!simulation.data) {
          debugLog("🔍 调试: 模拟调用没有返回数据");
          return {
            success: false,
            error: "模拟调用没有返回数据",
            result: "0",
          };
        }

        debugLog("🔍 调试: 模拟调用成功！", {
          result: simulation.data.result,
          request: simulation.data.request,
        });

        // 如果模拟成功，再进行实际调用
        setQuoteLoading(true);
        const expectedOutput = await quoteExactInput(quoteParams);
        debugLog("🔍 调试: 实际调用成功:", expectedOutput.toString());

        const formattedOutput = formatUnits(
          expectedOutput,
          outputToken.decimals
        );

        return {
          success: true,
          result: formattedOutput,
          rawResult: expectedOutput.toString(),
          inputAmount: testAmount,
          inputToken: inputToken.symbol,
          outputToken: outputToken.symbol,
        };
      } catch (error) {
        debugLog("🔍 调试: 完整错误信息:", error);
        debugLog("🔍 调试: 错误类型:", typeof error);

        // 安全地访问错误属性
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorName = error instanceof Error ? error.name : 'UnknownError';
        const errorStack = error instanceof Error ? error.stack : undefined;

        debugLog("🔍 调试: 错误结构:", {
          message: errorMessage,
          name: errorName,
          stack: errorStack,
        });

        // 尝试获取额外的错误信息
        const errorDetails = {
          code: (error as { code?: unknown }).code,
          data: (error as { data?: unknown }).data,
          cause: (error as { cause?: unknown }).cause,
        };

        return {
          success: false,
          error: errorMessage,
          errorName: errorName,
          errorDetails: errorDetails,
          result: "0",
        };
      } finally {
        setQuoteLoading(false);
      }
    },
    [
      selectedPool,
      selectedFee,
      quoteExactInput,
      calculateOutputAmount,
      simulation,
    ]
  );

  // 获取精确的输入金额报价
  const getExactInputQuote = useCallback(
    async (inputToken: Token, outputToken: Token, outputAmount: string) => {
      if (
        !inputToken ||
        !outputToken ||
        !outputAmount ||
        parseFloat(outputAmount) <= 0
      ) {
        return "0";
      }

      try {
        setQuoteLoading(true);
        // 使用 quoteExactOutput 获取准确的输入金额
        const quoteParams = {
          tokenIn: inputToken.address as `0x${string}`,
          tokenOut: outputToken.address as `0x${string}`,
          indexPath: [],
          amountOut: parseUnits(outputAmount, outputToken.decimals),
          sqrtPriceLimitX96: selectedPool?.sqrtPriceX96 && selectedPool.sqrtPriceX96 !== "0" && selectedPool.sqrtPriceX96 !== "undefined"
            ? BigInt(selectedPool.sqrtPriceX96)
            : 0n,
        };

        const requiredInput = await quoteExactOutput(quoteParams);
        return formatUnits(requiredInput, inputToken.decimals);
      } catch (error) {
        console.error("获取反向报价失败:", error);

        // 如果报价失败，使用简单计算的反向计算
        let rate = 1;
        const feePercentage = selectedFee / 1000000; // 费率百分比

        // 如果有选定的池子，使用池子的价格
        if (selectedPool) {
          // 根据代币顺序确定价格方向
          if (
            selectedPool.token0.toLowerCase() ===
            inputToken.address.toLowerCase()
          ) {
            // 如果输入代币是 token0，使用正向价格
            const sqrtPrice = typeof selectedPool.sqrtPriceX96 === 'bigint'
              ? Number(selectedPool.sqrtPriceX96)
              : Number(BigInt(selectedPool.sqrtPriceX96 || "0"));
            rate = sqrtPrice ** 2 / 2 ** 192;
          } else {
            // 如果输入代币是 token1，使用反向价格
            const sqrtPrice = typeof selectedPool.sqrtPriceX96 === 'bigint'
              ? Number(selectedPool.sqrtPriceX96)
              : Number(BigInt(selectedPool.sqrtPriceX96 || "0"));
            rate = 2 ** 192 / sqrtPrice ** 2;
          }
        } else {
          // 使用简单的价格估算
          if (inputToken.symbol === "ETH" && outputToken.symbol === "USDC") {
            rate = 3000;
          } else if (
            inputToken.symbol === "USDC" &&
            outputToken.symbol === "ETH"
          ) {
            rate = 1 / 3000;
          } else if (
            inputToken.symbol === "ETH" &&
            outputToken.symbol === "USDT"
          ) {
            rate = 3000;
          } else if (
            inputToken.symbol === "USDT" &&
            outputToken.symbol === "ETH"
          ) {
            rate = 1 / 3000;
          } else if (
            inputToken.symbol === "USDC" &&
            outputToken.symbol === "USDT"
          ) {
            rate = 1;
          } else if (
            inputToken.symbol === "USDT" &&
            outputToken.symbol === "USDC"
          ) {
            rate = 1;
          }
        }

        if (rate <= 0) return "0";

        // 计算考虑费率的输入金额
        const calculatedInput = (
          parseFloat(outputAmount) /
          rate /
          (1 - feePercentage)
        ).toFixed(inputToken.decimals);

        return calculatedInput;
      } finally {
        setQuoteLoading(false);
      }
    },
    [selectedPool, selectedFee, quoteExactOutput]
  );

  // 处理输入金额变化
  const handleInputAmountChange = useCallback(
    async (value: string) => {
      setInputAmount(value);

      if (!value || isNaN(parseFloat(value)) || !inputToken || !outputToken) {
        setOutputAmount("");
        return;
      }

      // 先使用简单计算显示一个近似值
      const estimatedOutput = calculateOutputAmount(
        value,
        inputToken,
        outputToken
      );
      setOutputAmount(estimatedOutput);
    },
    [inputToken, outputToken, calculateOutputAmount]
  );

  // 处理输出金额变化
  const handleOutputAmountChange = useCallback(
    async (value: string) => {
      setOutputAmount(value);

      if (!value || isNaN(parseFloat(value)) || !inputToken || !outputToken) {
        setInputAmount("");
        return;
      }

      // 先使用简单计算显示一个近似值
      let rate = 1;
      const feePercentage = selectedFee / 1000000;

      if (selectedPool) {
        if (
          selectedPool.token0.toLowerCase() === inputToken.address.toLowerCase()
        ) {
          const sqrtPrice = typeof selectedPool.sqrtPriceX96 === 'bigint'
            ? Number(selectedPool.sqrtPriceX96)
            : Number(BigInt(selectedPool.sqrtPriceX96 || "0"));
          rate = sqrtPrice ** 2 / 2 ** 192;
        } else {
          const sqrtPrice = typeof selectedPool.sqrtPriceX96 === 'bigint'
            ? Number(selectedPool.sqrtPriceX96)
            : Number(BigInt(selectedPool.sqrtPriceX96 || "0"));
          rate = 2 ** 192 / sqrtPrice ** 2;
        }
      } else {
        // 简单价格估算
        if (inputToken.symbol === "ETH" && outputToken.symbol === "USDC") {
          rate = 3000;
        } else if (
          inputToken.symbol === "USDC" &&
          outputToken.symbol === "ETH"
        ) {
          rate = 1 / 3000;
        } else if (
          inputToken.symbol === "ETH" &&
          outputToken.symbol === "USDT"
        ) {
          rate = 3000;
        } else if (
          inputToken.symbol === "USDT" &&
          outputToken.symbol === "ETH"
        ) {
          rate = 1 / 3000;
        } else if (
          inputToken.symbol === "USDC" &&
          outputToken.symbol === "USDT"
        ) {
          rate = 1;
        } else if (
          inputToken.symbol === "USDT" &&
          outputToken.symbol === "USDC"
        ) {
          rate = 1;
        }
      }

      if (rate > 0) {
        const calculatedInput = (
          parseFloat(value) /
          rate /
          (1 - feePercentage)
        ).toFixed(inputToken.decimals);
        setInputAmount(calculatedInput);
      }

      // 然后获取精确报价
      const exactInput = await getExactInputQuote(
        inputToken,
        outputToken,
        value
      );
      if (exactInput !== "0") {
        setInputAmount(exactInput);
      }
    },
    [inputToken, outputToken, selectedPool, selectedFee, getExactInputQuote]
  );

  // 交换代币位置
  const handleSwapTokens = useCallback(() => {
    if (!inputToken || !outputToken) return;

    setInputToken(outputToken);
    setOutputToken(inputToken);
    setInputAmount(outputAmount);
    setOutputAmount(inputAmount);
  }, [inputToken, outputToken, inputAmount, outputAmount]);

  // 处理代币选择
  const handleSelectInputToken = useCallback(
    async (value: string) => {
      const token = inTokens.find((t) => t.address === value);
      if (token) {
        // 如果选择的输入代币与输出代币相同，则交换它们
        if (outputToken && token.address === outputToken.address) {
          setInputToken(token);
          setOutputToken(inputToken);
        } else {
          setInputToken(token);
        }

        if (inputAmount && outputToken) {
          // 更新输出金额

          const calculatedOutput = calculateOutputAmount(
            inputAmount,
            token,
            outputToken
          );
          setOutputAmount(calculatedOutput);
        }
      }
    },
    [inTokens, inputAmount, outputToken, inputToken, calculateOutputAmount]
  );

  const handleSelectOutputToken = useCallback(
    async (value: string) => {
      const token = outTokens.find((t) => t.address === value);
      if (token) {
        // 如果选择的输出代币与输入代币相同，则交换它们
        if (inputToken && token.address === inputToken.address) {
          setOutputToken(token);
          setInputToken(outputToken);
        } else {
          setOutputToken(token);
        }

        if (inputAmount && inputToken) {
          // 更新输出金额

          const calculatedOutput = calculateOutputAmount(
            inputAmount,
            inputToken,
            token
          );
          setOutputAmount(calculatedOutput);
        }
      }
    },
    [outTokens, inputAmount, inputToken, outputToken, calculateOutputAmount]
  );

  // 处理费率选择
  const handleFeeSelect = useCallback(
    async (fee: number) => {
      setSelectedFee(fee);

      // 更新输出金额计算
      if (inputAmount && inputToken && outputToken) {
        const calculatedOutput = calculateOutputAmount(
          inputAmount,
          inputToken,
          outputToken
        );
        setOutputAmount(calculatedOutput);
      }
    },
    [inputAmount, inputToken, outputToken, calculateOutputAmount]
  );

  // 设置最大金额
  const handleSetMaxAmount = useCallback(async () => {
    if (inputToken && inputToken.balance) {
      setInputAmount(inputToken.balance);
      if (outputToken) {
        const calculatedOutput = calculateOutputAmount(
          inputToken.balance,
          inputToken,
          outputToken
        );
        setOutputAmount(calculatedOutput);
      }
    }
  }, [inputToken, outputToken, calculateOutputAmount]);

  // 刷新价格信息
  const handleRefreshPrice = useCallback(async () => {
    console.log("价格更新了");
  }, [inputToken, outputToken, inputAmount]);

  // 执行交换
  const handleSwap = useCallback(async () => {
    if (!inputAmount || !outputAmount || !inputToken || !outputToken) return;
    if (!address) {
      toast({
        title: "未连接钱包",
        description: "请先连接钱包后再进行交换",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPool && availablePools.length === 0) {
      debugLog("🔍 调试: 交换失败 - 无可用交易池", {
        inputToken: inputToken?.symbol,
        inputTokenAddress: inputToken?.address,
        outputToken: outputToken?.symbol,
        outputTokenAddress: outputToken?.address,
        totalPoolsCount: poolsInfo?.length,
        poolsInfo: poolsInfo?.map(p => ({
          pool: p.pool,
          token0: p.token0,
          token1: p.token1,
          fee: p.fee
        }))
      });
      toast({
        title: "无可用交易池",
        description: `未找到 ${inputToken.symbol}/${outputToken.symbol} 交易对的池子`,
        variant: "destructive",
      });
      return;
    } else if (!selectedPool && availablePools.length > 0) {
      debugLog("🔍 调试: 交换失败 - 找到池子但没有匹配费率", {
        availablePoolsCount: availablePools.length,
        selectedFee: selectedFee,
        availableFees: availablePools.map(p => p.fee)
      });
      toast({
        title: "无匹配费率池子",
        description: `找到 ${availablePools.length} 个池子，但没有费率为 ${selectedFee/10000}% 的池子`,
        variant: "destructive",
      });
      return;
    }

    // 检查池子状态 - 修复1000兑换0的问题
    if (selectedPool) {
      console.log("🔍 池子状态检查:", {
        sqrtPriceX96: selectedPool.sqrtPriceX96,
        liquidity: selectedPool.liquidity,
        tick: selectedPool.tick,
        token0: selectedPool.token0,
        token1: selectedPool.token1,
        fee: selectedPool.fee
      });

      // 检查池子是否有流动性
      if (!selectedPool.liquidity ||
          (typeof selectedPool.liquidity === 'string' && selectedPool.liquidity === "0") ||
          (typeof selectedPool.liquidity === 'bigint' && selectedPool.liquidity === 0n) ||
          (typeof selectedPool.liquidity === 'string' && selectedPool.liquidity !== "0" && BigInt(selectedPool.liquidity) === 0n)) {
        toast({
          title: "池子流动性不足",
          description: "当前交易池没有足够的流动性，请添加流动性或选择其他交易对",
          variant: "destructive",
        });
        return;
      }

      // 检查池子是否已初始化
      if (!selectedPool.sqrtPriceX96 ||
          (typeof selectedPool.sqrtPriceX96 === 'string' && selectedPool.sqrtPriceX96 === "0") ||
          (typeof selectedPool.sqrtPriceX96 === 'bigint' && selectedPool.sqrtPriceX96 === 0n) ||
          (typeof selectedPool.sqrtPriceX96 === 'string' && selectedPool.sqrtPriceX96 !== "0" && BigInt(selectedPool.sqrtPriceX96) === 0n)) {
        toast({
          title: "池子未初始化",
          description: "当前交易池尚未初始化，请先添加流动性",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
    setTxHash(null);

    try {
      // 准备报价参数
      // 安全地获取 sqrtPriceLimitX96 - 修复SPL错误
      let sqrtPriceLimitX96: bigint;
      if (selectedPool?.sqrtPriceX96 && selectedPool.sqrtPriceX96 !== "0" && selectedPool.sqrtPriceX96 !== "undefined") {
        // 如果池子有价格，使用合适的价格限制
        const currentSqrtPriceX96 = BigInt(selectedPool.sqrtPriceX96);
        const zeroForOne = inputToken.address.toLowerCase() < outputToken.address.toLowerCase();

        if (zeroForOne) {
          // token0 -> token1: 价格限制应该低于当前价格
          sqrtPriceLimitX96 = currentSqrtPriceX96 * 9999n / 10000n; // 稍微低于当前价格
        } else {
          // token1 -> token0: 价格限制应该高于当前价格
          sqrtPriceLimitX96 = currentSqrtPriceX96 * 10001n / 10000n; // 稍微高于当前价格
        }
      } else {
        // 如果没有池子价格，使用0表示无价格限制
        sqrtPriceLimitX96 = 0n;
      }

      const quoteParams = {
        tokenIn: inputToken.address as `0x${string}`,
        tokenOut: outputToken.address as `0x${string}`,
        indexPath: [],
        amountIn: parseUnits(inputAmount, inputToken.decimals),
        sqrtPriceLimitX96: sqrtPriceLimitX96,
      };

      console.log("🔍 交换报价参数:", {
        ...quoteParams,
        amountIn: quoteParams.amountIn.toString(),
        sqrtPriceLimitX96: quoteParams.sqrtPriceLimitX96.toString(),
        selectedPoolExists: !!selectedPool,
        selectedPoolSqrtPrice: selectedPool?.sqrtPriceX96,
      });

      // 显示获取报价中
      toast({
        title: "获取报价中",
        description: "正在计算交易报价...",
      });

      // 先获取报价
      let expectedOutput;
      try {
        expectedOutput = await quoteExactInput(quoteParams);
        console.log(
          "报价结果:",
          formatUnits(expectedOutput, outputToken.decimals)
        );
      } catch (quoteError) {
        console.error("获取报价失败:", quoteError);
        const errorMessage = quoteError instanceof Error ? quoteError.message : "无法获取交易报价，请稍后重试";
        toast({
          title: "获取报价失败",
          description: errorMessage,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // 计算滑点保护值
      const formattedExpectedOutput = formatUnits(
        expectedOutput,
        outputToken.decimals
      );
      const amountOutMinimum =
        parseFloat(formattedExpectedOutput) * (1 - slippage / 100);

      // 计算截止时间（当前时间 + deadline分钟）
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadline * 60;

      // 准备交易参数 - 修改为与合约接口匹配的结构
      const params = {
        tokenIn: inputToken.address as `0x${string}`,
        tokenOut: outputToken.address as `0x${string}`,
        indexPath: [], // 使用池子索引路径
        recipient: address as `0x${string}`, // 添加接收者地址
        deadline: BigInt(deadlineTimestamp),
        amountIn: parseUnits(inputAmount, inputToken.decimals),
        amountOutMinimum: parseUnits(
          amountOutMinimum.toString(),
          outputToken.decimals
        ),
        sqrtPriceLimitX96: sqrtPriceLimitX96, // 使用之前安全获取的值
      };

      console.log("交换参数:", {
        ...params,
        amountIn: params.amountIn.toString(),
        amountOutMinimum: params.amountOutMinimum.toString(),
        deadline: params.deadline.toString(),
        sqrtPriceLimitX96: params.sqrtPriceLimitX96.toString(),
        expectedOutput: formattedExpectedOutput,
      });

      // 显示交易进行中的提示
      toast({
        title: "交易进行中",
        description: "请在钱包中确认交易...",
      });

      // 执行交换
      const result = await exactInput(params);
      console.log("交换结果:", result);

      // 保存交易哈希
      if (result && result.hash) {
        setTxHash(result.hash);

        toast({
          title: "交易已提交",
          description: "交易已提交到区块链，等待确认...",
        });
      }

      toast({
        title: "交换成功",
        description: `已将 ${inputAmount} ${inputToken.symbol} 交换为约 ${formattedExpectedOutput} ${outputToken.symbol}`,
      });

      // 清空输入
      setInputAmount("");
      setOutputAmount("");

      // 交换完成后刷新余额
      refetchBalances();
    } catch (error) {
      console.error("交换失败:", error);

      // 详细记录错误信息以便调试
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = (error as { code?: unknown }).code;
      const errorData = (error as { data?: unknown }).data;
      const errorStack = error instanceof Error ? error.stack : undefined;

      console.error("错误详情:", {
        message: errorMessage,
        code: errorCode,
        data: errorData,
        stack: errorStack,
      });

      // 处理特定错误
      if (errorMessage && errorMessage.includes("SPL")) {
        toast({
          title: "价格限制错误",
          description: "交易价格超出允许范围，请尝试调整金额或稍后重试",
          variant: "destructive",
        });
      } else if (errorMessage && errorMessage.includes("Pool not found")) {
        toast({
          title: "池子不存在",
          description: "指定的交易池不存在，请刷新页面重试",
          variant: "destructive",
        });
      } else if (errorMessage && errorMessage.includes("Slippage exceeded")) {
        toast({
          title: "滑点过大",
          description: "价格变化过大，请增加滑点容忍度或稍后重试",
          variant: "destructive",
        });
      } else if (
        errorCode === 4001 ||
        (errorMessage && errorMessage.includes("user rejected"))
      ) {
        toast({
          title: "交易被取消",
          description: "您取消了交易签名",
          variant: "destructive",
        });
      } else {
        toast({
          title: "交换失败",
          description: errorMessage || "未知错误",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    inputAmount,
    outputAmount,
    inputToken,
    outputToken,
    address,
    slippage,
    deadline,
    selectedPool,
    selectedFee,
    availablePools,
    quoteExactInput,
    exactInput,
    toast,
    refetchBalances,
  ]);

  // 计算交换按钮状态
  const swapButtonState = useMemo(() => {
    if (tokensLoading || poolsLoading || quoteLoading) {
      return { disabled: true, text: "加载中..." };
    }

    if (tokensError) {
      return { disabled: true, text: "加载代币失败" };
    }

    if (!inputToken || !outputToken) {
      return { disabled: true, text: "选择代币" };
    }

    if (!inputAmount || !outputAmount) {
      return { disabled: true, text: "输入金额" };
    }

    const inputValue = parseFloat(inputAmount);
    const inputBalance = inputToken.balance
      ? parseFloat(inputToken.balance)
      : 0;

    if (inputValue > inputBalance) {
      return { disabled: true, text: `余额不足 ${inputToken.symbol}` };
    }

    if (isLoading || isWritePending) {
      return { disabled: true, text: "交换中..." };
    }

    if (!address) {
      return { disabled: true, text: "连接钱包" };
    }

    return { disabled: false, text: "交换" };
  }, [
    inputAmount,
    outputAmount,
    inputToken,
    outputToken,
    isLoading,
    isWritePending,
    tokensLoading,
    tokensError,
    poolsLoading,
    quoteLoading,
    address,
  ]);

  // 价格信息
  const priceInfo = useMemo(() => {
    if (!inputToken || !outputToken) return "";

    const rate = parseFloat(
      calculateOutputAmount("1", inputToken, outputToken)
    );
    return `1 ${inputToken.symbol} ≈ ${rate.toFixed(6)} ${outputToken.symbol}`;
  }, [inputToken, outputToken, calculateOutputAmount]);

  // 刷新代币列表
  const handleRefreshTokens = useCallback(() => {
    refetchBalances();
  }, [refetchBalances]);

  return (
    <Card className="w-full max-w-md mx-auto mt-10">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>代币交换</CardTitle>
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefreshTokens}
              disabled={tokensLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${tokensLoading ? "animate-spin" : ""}`}
              />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 输入部分 */}
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">从</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSetMaxAmount}
              className="h-6 text-xs"
              disabled={!inputToken}
            >
              最大
            </Button>
          </div>

          <div className="flex space-x-2">
            <Input
              type="text"
              value={inputAmount}
              onChange={(e) => handleInputAmountChange(e.target.value)}
              placeholder="0.0"
              className="text-lg"
              disabled={tokensLoading || !inputToken}
            />

            <Select
              value={inputToken?.address}
              onValueChange={handleSelectInputToken}
              disabled={tokensLoading || inTokens.length === 0}
            >
              <SelectTrigger className="w-32">
                <SelectValue>
                  {inputToken ? inputToken.symbol : "选择代币"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {inTokens.map((token) => (
                  <SelectItem key={token.address} value={token.address}>
                    {token.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs text-muted-foreground">
            余额:{" "}
            {inputToken ? `${inputToken.balance} ${inputToken.symbol}` : "0"}
          </div>
        </div>

        {/* 交换按钮 */}
        <div className="flex justify-center -my-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-background shadow-md h-8 w-8"
            onClick={handleSwapTokens}
            disabled={!inputToken || !outputToken}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>

        {/* 输出部分 */}
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">到</span>
          </div>

          <div className="flex space-x-2">
            <Input
              type="text"
              value={outputAmount}
              onChange={(e) => handleOutputAmountChange(e.target.value)}
              placeholder="0.0"
              className="text-lg"
              disabled={tokensLoading || !outputToken}
            />

            <Select
              value={outputToken?.address}
              onValueChange={handleSelectOutputToken}
              disabled={tokensLoading || outTokens.length === 0}
            >
              <SelectTrigger className="w-32">
                <SelectValue>
                  {outputToken ? outputToken.symbol : "选择代币"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {outTokens
                  .filter(
                    (t) => !inputToken || t.address !== inputToken.address
                  )
                  .map((token) => (
                    <SelectItem key={token.address} value={token.address}>
                      {token.symbol}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              余额:{" "}
              {outputToken
                ? `${outputToken.balance} ${outputToken.symbol}`
                : "0"}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (inputToken && outputToken && inputAmount) {
                  console.log("🔍 开始调试 SPL 错误...");
                  const result = await debugGetExactOutputQuote(
                    inputToken,
                    outputToken,
                    inputAmount
                  );

                  // 显示结果给用户
                  if (typeof result === "object" && result.success) {
                    // 设置输出金额到界面
                    setOutputAmount(result.result);

                    toast({
                      title: "调试成功！",
                      description: `输入: ${result.inputAmount} ${result.inputToken} → 输出: ${result.result} ${result.outputToken}`,
                    });
                  } else if (typeof result === "object" && !result.success) {
                    toast({
                      title: "调试失败",
                      description: result.error || "未知错误",
                      variant: "destructive",
                    });
                  }
                }
              }}
              disabled={!inputToken || !outputToken || !inputAmount}
              className="h-6 text-xs px-2"
            >
              🐛 调试
            </Button>
          </div>
        </div>

        {/* 价格信息 */}
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>价格</span>
          <div className="flex items-center space-x-1">
            <span>{priceInfo}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              disabled={!inputToken || !outputToken || quoteLoading}
              onClick={handleRefreshPrice}
            >
              <RefreshCw
                className={`h-3 w-3 ${quoteLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        {/* 费率选择面板 */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">费率</span>
            <span className="text-xs text-muted-foreground">
              {selectedFee / 10000}%
            </span>
          </div>

          <Tabs
            value={selectedFee.toString()}
            onValueChange={(value) => handleFeeSelect(parseInt(value))}
            className="w-full"
          >
            <TabsList className="grid grid-cols-4 h-8">
              {FEE_TIERS.map((fee) => (
                <TabsTrigger
                  key={fee.value}
                  value={fee.value.toString()}
                  disabled={
                    availableFees.length > 0 &&
                    !availableFees.some((f) => f.value === fee.value)
                  }
                  className="text-xs px-1"
                >
                  {fee.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {FEE_TIERS.map((fee) => (
              <TabsContent
                key={fee.value}
                value={fee.value.toString()}
                className="pt-1"
              >
                <p className="text-xs text-muted-foreground">
                  {fee.description}
                </p>
              </TabsContent>
            ))}
          </Tabs>

          {selectedPool && (
            <div className="text-xs text-muted-foreground">
              使用池子: {selectedPool.pool.substring(0, 6)}...
              {selectedPool.pool.substring(38)}
              {selectedPool.liquidity &&
                ((typeof selectedPool.liquidity === "bigint" &&
                  selectedPool.liquidity > 0n) ||
                  (typeof selectedPool.liquidity === "string" &&
                    BigInt(selectedPool.liquidity) > 0n)) && (
                  <span>
                    {" "}
                    · 流动性:{" "}
                    {formatUnits(
                      typeof selectedPool.liquidity === "bigint"
                        ? selectedPool.liquidity
                        : BigInt(selectedPool.liquidity),
                      0
                    )}
                  </span>
                )}
            </div>
          )}

          {availablePools.length === 0 && inputToken && outputToken && (
            <div className="text-xs text-amber-500">
              未找到 {inputToken.symbol}/{outputToken.symbol} 交易对的池子
            </div>
          )}
        </div>

        {/* 滑点设置 */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-sm">滑点容忍度</span>
            <span className="text-xs text-muted-foreground">{slippage}%</span>
          </div>
          <div className="flex space-x-2">
            {[0.1, 0.5, 1.0].map((value) => (
              <Button
                key={value}
                variant={slippage === value ? "secondary" : "outline"}
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={() => setSlippage(value)}
              >
                {value}%
              </Button>
            ))}
            <div className="flex-1 flex space-x-1">
              <Input
                type="number"
                value={slippage}
                onChange={(e) => setSlippage(parseFloat(e.target.value) || 0.5)}
                className="h-7 text-xs"
                min="0.1"
                max="50"
                step="0.1"
              />
              <span className="flex items-center text-xs">%</span>
            </div>
          </div>
        </div>

        {/* 交易哈希显示 */}
        {txHash && (
          <div className="p-2 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-xs">交易哈希:</span>
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline"
              >
                {txHash.substring(0, 6)}...{txHash.substring(62)}
              </a>
            </div>
          </div>
        )}

        {/* 交换按钮 */}
        <Button
          className="w-full"
          disabled={swapButtonState.disabled}
          onClick={handleSwap}
        >
          {(isLoading || isWritePending || quoteLoading) && (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          )}
          {swapButtonState.text}
        </Button>
      </CardContent>
    </Card>
  );
};
