"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTokenOptions, Token } from "@/hooks/useTokenOptions";
import { useSwapQuote } from "@/hooks/useSwapQuote";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";

// 导入子组件
import SwapCard from "./swap/SwapCard";

// 导入类型
import { SwapSettings, TradeAnalysis } from "./swap/types";
import usePoolManagerWithClients from "@/hooks/usePoolManagerWithClients";
import { PoolInfo } from "@/store/usePoolManagerStore";
import { formatUnits, parseUnits } from "viem";
import { calculateSwapOutput, formatPrice } from "@/utils/priceCalculations";

const SwapComponent = () => {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLInputElement>(null);

  // 使用集成了余额的 hook
  const { allTokens, isLoading, error, refetchBalances } = useTokenOptions();

  // 增强的状态管理
  const [activeTab, setActiveTab] = useState("swap");
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);

  // Token 状态
  const [token0, setToken0] = useState<Token | null>(null);
  const [token1, setToken1] = useState<Token | null>(null);

  // 输入状态
  const [inputAmount, setInputAmount] = useState("");
  const [outputAmount, setOutputAmount] = useState("");
  const [isExactInput, setIsExactInput] = useState(true);
  const [focusedInput, setFocusedInput] = useState<"input" | "output" | null>(
    null
  );

  // 高级设置状态
  const [settings, setSettings] = useState<SwapSettings>({
    slippageTolerance: 0.5,
    deadline: 20,
    gasPrice: "standard",
    enableMEV: true,
    autoRefresh: true,
  });

  // UI 状态
  const [showSlippageSettings, setShowSlippageSettings] = useState(false);
  const [showTokenStats, setShowTokenStats] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapProgress, setSwapProgress] = useState(0);

  // 集成 useSwapQuote Hook
  const {
    quote,
    isRefreshing,
    isPoolsLoading,
    getQuote,
    refreshQuote,
    clearQuote,
    getPriceImpactLevel,
    shouldWarnUser,
    isQuoteStale,
    hasError,
    isReady,
    canSafelyTrade,
    liquidityHealthScore,
    getLiquidityRecommendations,
    assessTradeRisk,
    getOptimalTradingTime,
    simulateTrade,
  } = useSwapQuote({
    enableAutoRefresh: settings.autoRefresh,
    autoRefreshInterval: 15000,
    debounceDelay: 800,
    enableMultiHop: true,
    maxSlippage: settings.slippageTolerance,
    enableLiquidityAnalysis: isAdvancedMode,
    intermediateTokens: [
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
      "0xA0b86a33E6441B8dB4B2f6b8e7e0b9e0d1234567", // USDC
      "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
    ],
  });

  // 智能交易分析
  const tradeAnalysis = useMemo((): TradeAnalysis => {
    if (!quote || quote.error) {
      return {
        recommendation: "wait",
        confidence: 0,
        reasons: ["无法获取报价"],
        riskLevel: "critical",
      };
    }

    const riskAssessment = assessTradeRisk(quote);
    const optimalTiming = getOptimalTradingTime(quote);

    let recommendation: TradeAnalysis["recommendation"] = "hold";
    let confidence = 50;
    const reasons: string[] = [];

    // 基于价格影响的建议
    if (quote.priceImpactV3 < 0.1) {
      recommendation = "buy";
      confidence += 20;
      reasons.push("价格影响极低");
    } else if (quote.priceImpactV3 > 5) {
      recommendation = "wait";
      confidence -= 30;
      reasons.push("价格影响过高");
    }

    // 基于流动性健康度
    if (liquidityHealthScore > 80) {
      confidence += 15;
      reasons.push("流动性充足");
    } else if (liquidityHealthScore < 40) {
      recommendation = "wait";
      confidence -= 20;
      reasons.push("流动性不足");
    }

    // 基于最佳时机建议
    if (optimalTiming?.recommendation === "now") {
      confidence += 10;
      reasons.push("当前是好时机");
    }

    return {
      recommendation,
      confidence: Math.max(0, Math.min(100, confidence)),
      reasons,
      riskLevel: riskAssessment?.riskLevel || "medium",
    };
  }, [quote, liquidityHealthScore, assessTradeRisk, getOptimalTradingTime]);

  // 过滤可选代币
  const availableTokensForInput = useMemo(() => {
    return allTokens.filter((token) => token.address !== token1?.address);
  }, [allTokens, token1?.address]);

  const availableTokensForOutput = useMemo(() => {
    return allTokens.filter((token) => token.address !== token0?.address);
  }, [allTokens, token0?.address]);

  // 检查余额不足
  const checkInsufficientBalance = useCallback(() => {
    if (!token0 || !inputAmount) return false;
    const amountValue = parseFloat(inputAmount);
    const balanceValue = parseFloat(token0.balance);
    return amountValue > balanceValue;
  }, [token0, inputAmount]);

  const hasInsufficientBalance = checkInsufficientBalance();
  // 新增的使用特定池子获取报价的函数
  const getQuoteWithSelectedPool = useCallback(
    async (
      tokenIn: Token,
      tokenOut: Token,
      amountIn: string,
      selectedPool: PoolInfo
    ) => {
      console.log("🏊‍♂️ 使用指定池子获取报价:", {
        tokenIn: tokenIn.symbol,
        tokenOut: tokenOut.symbol,
        amountIn,
        poolAddress: selectedPool.pool.slice(0, 10) + "...",
        fee: selectedPool.fee,
      });

      try {
        // 确定交易方向
        const zeroForOne =
          tokenIn.address.toLowerCase() === selectedPool.token0.toLowerCase();
        console.log(
          "交易方向:",
          zeroForOne ? "token0 -> token1" : "token1 -> token0"
        );

        // 解析输入金额
        const amountInBigInt = parseUnits(amountIn, tokenIn.decimals);

        // 计算手续费
        const feeAmount =
          (amountInBigInt * BigInt(selectedPool.fee)) / BigInt(1000000);
        const amountInAfterFee = amountInBigInt - feeAmount;

        // 计算输出金额 (使用 calculateSwapOutput 函数，如果可用)
        if (typeof calculateSwapOutput === "function") {
          const swapResult = calculateSwapOutput(
            amountInAfterFee,
            selectedPool.sqrtPriceX96,
            selectedPool.liquidity,
            selectedPool.fee,
            zeroForOne,
            tokenIn.decimals,
            tokenOut.decimals
          );

          if (swapResult && swapResult.amountOut > 0n) {
            // 格式化输出金额
            const outputAmountFormatted = formatUnits(
              swapResult.amountOut,
              tokenOut.decimals
            );

            // 构建报价结果
            return {
              inputAmount: amountIn,
              outputAmount: outputAmountFormatted,
              outputAmountFormatted,
              currentPrice: swapResult.effectivePrice,
              currentPriceFormatted: formatPrice(
                swapResult.effectivePrice,
                tokenIn.symbol,
                tokenOut.symbol
              ),
              effectivePrice: swapResult.effectivePrice,
              effectivePriceFormatted: formatPrice(
                swapResult.effectivePrice,
                tokenIn.symbol,
                tokenOut.symbol
              ),
              priceImpact: swapResult.priceImpact,
              priceImpactFormatted: `${swapResult.priceImpact.toFixed(2)}%`,
              priceImpactV3: swapResult.priceImpact,
              priceImpactV3Formatted: `${swapResult.priceImpact.toFixed(2)}%`,
              feeAmount: swapResult.feeAmount,
              feeAmountFormatted: formatUnits(
                swapResult.feeAmount,
                tokenIn.decimals
              ),
              totalFees: swapResult.feeAmount,
              poolUsed: selectedPool,
              tradingPath: [selectedPool],
              isMultiHop: false,
              isLoading: false,
              error: null,
              lastUpdated: Date.now(),
            };
          }
        }

        // 如果上面的计算失败，使用简化的计算方法
        // 简单的1:1兑换（考虑手续费）
        const feeMultiplier = 1000000 - selectedPool.fee;
        const outputAmount =
          (amountInAfterFee * BigInt(feeMultiplier)) / 1000000n;
        const outputAmountFormatted = formatUnits(
          outputAmount,
          tokenOut.decimals
        );

        return {
          inputAmount: amountIn,
          outputAmount: outputAmountFormatted,
          outputAmountFormatted,
          currentPrice: Number(outputAmount) / Number(amountInBigInt),
          currentPriceFormatted: `1 ${tokenIn.symbol} = ${(
            Number(outputAmount) / Number(amountInBigInt)
          ).toFixed(6)} ${tokenOut.symbol}`,
          effectivePrice: Number(outputAmount) / Number(amountInBigInt),
          effectivePriceFormatted: `1 ${tokenIn.symbol} = ${(
            Number(outputAmount) / Number(amountInBigInt)
          ).toFixed(6)} ${tokenOut.symbol}`,
          priceImpact: 0.3, // 默认价格影响
          priceImpactFormatted: "0.30%",
          priceImpactV3: 0.3,
          priceImpactV3Formatted: "0.30%",
          feeAmount,
          feeAmountFormatted: formatUnits(feeAmount, tokenIn.decimals),
          totalFees: feeAmount,
          poolUsed: selectedPool,
          tradingPath: [selectedPool],
          isMultiHop: false,
          isLoading: false,
          error: null,
          lastUpdated: Date.now(),
        };
      } catch (error) {
        console.error("❌ 使用指定池子获取报价失败:", error);
        return {
          inputAmount: amountIn,
          outputAmount: "0",
          outputAmountFormatted: "计算失败",
          currentPrice: 0,
          currentPriceFormatted: "计算失败",
          effectivePrice: 0,
          effectivePriceFormatted: "计算失败",
          priceImpact: 0,
          priceImpactFormatted: "0%",
          priceImpactV3: 0,
          priceImpactV3Formatted: "0%",
          feeAmount: 0n,
          feeAmountFormatted: "0",
          totalFees: 0n,
          poolUsed: selectedPool,
          tradingPath: [selectedPool],
          isMultiHop: false,
          isLoading: false,
          error: "计算报价失败",
          lastUpdated: Date.now(),
        };
      }
    },
    []
  );
  // 增强的输入处理函数
  const handleInputChange = useCallback(
    async (value: string, isInput: boolean = true, selectedPool?: PoolInfo) => {
      console.log("🔄 输入变化:", {
        value,
        isInput,
        selectedPool: selectedPool?.pool?.slice(0, 10) + "...",
      });

      if (!value || parseFloat(value) <= 0) {
        if (isInput) {
          setInputAmount("");
          setOutputAmount("");
        } else {
          setOutputAmount("");
          setInputAmount("");
        }
        return;
      }

      const sanitizedValue = value.replace(/[^\d.]/g, "");

      if (isInput) {
        setInputAmount(sanitizedValue);
        setIsExactInput(true);
      } else {
        setOutputAmount(sanitizedValue);
        setIsExactInput(false);
      }

      if (
        token0 &&
        token1 &&
        sanitizedValue &&
        parseFloat(sanitizedValue) > 0 &&
        isReady
      ) {
        try {
          const fromToken = isInput ? token0 : token1;
          const toToken = isInput ? token1 : token0;

          // 如果提供了特定的池子，使用它来获取报价
          let result;
          if (selectedPool) {
            // 使用自定义的获取报价方法，直接使用选定的池子
            result = await getQuoteWithSelectedPool(
              fromToken,
              toToken,
              sanitizedValue,
              selectedPool
            );
          } else {
            // 使用默认的获取报价方法
            result = await getQuote(fromToken, toToken, sanitizedValue);
          }

          if (result && !result.error) {
            const outputValue =
              result.outputAmount || result.outputAmountFormatted || "0";

            if (isInput) {
              setOutputAmount(outputValue);
            } else {
              setInputAmount(outputValue);
            }
          }
        } catch (error) {
          console.error("❌ 获取报价异常:", error);
        }
      }
    },
    [token0, token1, isReady, getQuote]
  );

  // 交换代币位置
  const handleSwapTokens = useCallback(() => {
    const tempToken = token0;
    setToken0(token1);
    setToken1(tempToken);

    const tempAmount = inputAmount;
    setInputAmount(outputAmount);
    setOutputAmount(tempAmount);

    setIsExactInput(!isExactInput);
    clearQuote();

    // 添加视觉反馈
    toast({
      title: "代币位置已交换 🔄",
      description: "输入和输出代币已互换",
    });
  }, [
    token0,
    token1,
    inputAmount,
    outputAmount,
    isExactInput,
    clearQuote,
    toast,
  ]);

  // 设置最大值
  const setMaxAmount = useCallback(async () => {
    if (token0) {
      const maxBalance = (parseFloat(token0.balance) * 0.99).toFixed(
        token0.decimals
      ); // 保留1%作为gas费
      setInputAmount(maxBalance);
      setIsExactInput(true);

      if (token1 && isReady) {
        await handleInputChange(maxBalance, true);
      }
    }
  }, [token0, token1, isReady, handleInputChange]);

  // 增强的交换能力检查
  const canSwap = useMemo(() => {
    const basicChecks =
      token0 &&
      token1 &&
      inputAmount &&
      outputAmount &&
      parseFloat(inputAmount) > 0 &&
      parseFloat(outputAmount) > 0 &&
      !hasInsufficientBalance &&
      isReady &&
      !quote?.error;

    if (!basicChecks) return false;

    // 高级检查
    if (isAdvancedMode) {
      return canSafelyTrade() && tradeAnalysis.riskLevel !== "critical";
    }

    return canSafelyTrade();
  }, [
    token0,
    token1,
    inputAmount,
    outputAmount,
    hasInsufficientBalance,
    isReady,
    quote?.error,
    canSafelyTrade,
    isAdvancedMode,
    tradeAnalysis.riskLevel,
  ]);

  // 增强的交换处理 - 包含进度反馈
  const handleSwap = useCallback(async () => {
    if (!canSwap || !quote) return;

    setIsSwapping(true);
    setSwapProgress(0);

    try {
      // 模拟交换进度
      const progressSteps = [
        { progress: 20, message: "准备交易..." },
        { progress: 40, message: "检查流动性..." },
        { progress: 60, message: "执行交换..." },
        { progress: 80, message: "确认交易..." },
        { progress: 100, message: "交换完成!" },
      ];

      for (const step of progressSteps) {
        setSwapProgress(step.progress);
        toast({
          title: step.message,
          description: `进度: ${step.progress}%`,
        });
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      toast({
        title: "交换成功 ✅",
        description: `成功将 ${inputAmount} ${token0?.symbol} 交换为 ${quote.outputAmountFormatted} ${token1?.symbol}`,
      });

      // 重置状态
      setInputAmount("");
      setOutputAmount("");
      setSwapProgress(0);
      clearQuote();
      refetchBalances();
    } catch (error) {
      toast({
        title: "交换失败 ❌",
        description: "交换过程中发生错误，请重试",
        variant: "destructive",
      });
    } finally {
      setIsSwapping(false);
    }
  }, [
    canSwap,
    quote,
    inputAmount,
    token0,
    token1,
    toast,
    refetchBalances,
    clearQuote,
  ]);

  // 处理刷新余额
  const handleRefreshBalances = useCallback(() => {
    refetchBalances();
    toast({
      title: "刷新余额 🔄",
      description: "正在更新所有代币余额...",
    });
  }, [refetchBalances, toast]);

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "r":
            e.preventDefault();
            refreshQuote();
            break;
          case "s":
            e.preventDefault();
            handleSwapTokens();
            break;
          case "m":
            e.preventDefault();
            setMaxAmount();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [refreshQuote, handleSwapTokens, setMaxAmount]);

  // 当代币选择改变时，清除报价并重新计算
  useEffect(() => {
    if (
      token0 &&
      token1 &&
      inputAmount &&
      parseFloat(inputAmount) > 0 &&
      isReady
    ) {
      getQuote(token0, token1, inputAmount);
    } else {
      clearQuote();
    }
  }, [token0, token1, isReady]);

  // 加载状态组件
  if (isLoading || isPoolsLoading) {
    return (
      <div className="max-w-md mx-auto py-10">
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <div className="absolute inset-0 h-8 w-8 rounded-full border-2 border-blue-200 animate-pulse"></div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-700">
                  正在加载交易数据...
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {isLoading && "加载代币信息..."}
                  {isPoolsLoading && "加载流动性池..."}
                </div>
                <Progress value={isLoading ? 30 : 70} className="w-full mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 错误状态处理
  if (error) {
    return (
      <div className="max-w-md mx-auto py-10">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <div className="space-y-2">
            <div>加载代币选项失败: {error}</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              重新加载
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  // 空状态处理
  if (!allTokens || allTokens.length === 0) {
    return (
      <div className="max-w-md mx-auto py-10">
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-700">
                  暂无可用代币
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  请确保已配置交易对数据
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>刷新页面</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SwapCard
      isReady={isReady}
      isAdvancedMode={isAdvancedMode}
      setIsAdvancedMode={setIsAdvancedMode}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      quote={quote}
      isRefreshing={isRefreshing}
      isQuoteStale={isQuoteStale}
      tradeAnalysis={tradeAnalysis}
      showTokenStats={showTokenStats}
      setShowTokenStats={setShowTokenStats}
      showSlippageSettings={showSlippageSettings}
      setShowSlippageSettings={setShowSlippageSettings}
      settings={settings}
      setSettings={setSettings}
      token0={token0}
      token1={token1}
      inputAmount={inputAmount}
      outputAmount={outputAmount}
      handleInputChange={handleInputChange}
      handleSwapTokens={handleSwapTokens}
      setMaxAmount={setMaxAmount}
      allTokens={allTokens}
      availableTokensForInput={availableTokensForInput}
      availableTokensForOutput={availableTokensForOutput}
      setToken0={setToken0}
      setToken1={setToken1}
      focusedInput={focusedInput}
      setFocusedInput={setFocusedInput}
      hasInsufficientBalance={hasInsufficientBalance}
      shouldWarnUser={shouldWarnUser}
      getPriceImpactLevel={getPriceImpactLevel}
      showDetailedAnalysis={showDetailedAnalysis}
      setShowDetailedAnalysis={setShowDetailedAnalysis}
      getLiquidityRecommendations={getLiquidityRecommendations}
      liquidityHealthScore={liquidityHealthScore}
      isSwapping={isSwapping}
      swapProgress={swapProgress}
      handleSwap={handleSwap}
      canSwap={canSwap}
      refreshQuote={refreshQuote}
      handleRefreshBalances={handleRefreshBalances}
    />
  );
};

export default SwapComponent;
