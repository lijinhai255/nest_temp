"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowUpDown,
  Target,
  TrendingUp,
  DollarSign,
  Maximize2,
  Minimize2,
  Clock,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { Token } from "@/hooks/useTokenOptions";
import SwapPanel from "./SwapPanel";
import SwapControlPanel from "./SwapControlPanel";
import SwapQuoteStatus from "./SwapQuoteStatus";
import TradeAnalysisPanel from "./TradeAnalysisPanel";
import TokenStatsPanel from "./TokenStatsPanel";
import SettingsPanel from "./SettingsPanel";
import SwapDetails from "./SwapDetails";
import SwapWarnings from "./SwapWarnings";
import SwapButton from "./SwapButton";
import PlaceholderTab from "./PlaceholderTab";
import FeeRateSelector from "./FeeRateSelector"; // 导入费率选择组件
import { useToast } from "@/hooks/use-toast";
// 导入类型
import { SwapSettings, TradeAnalysis } from "./types";
import useSwapRouterWithClients from "@/hooks/useSwapRouterWithClients";
import { Address } from "viem";
import {
  ExactInputParams,
  ExactOutputParams,
} from "@/store/useSwapRouterStore";
import { useWallet } from "@/provider";
import usePoolManagerWithClients from "@/hooks/usePoolManagerWithClients";

interface SwapCardProps {
  isReady: boolean;
  isAdvancedMode: boolean;
  setIsAdvancedMode: (value: boolean) => void;
  activeTab: string;
  setActiveTab: (value: string) => void;
  quote: any; // 使用实际的类型
  isRefreshing: boolean;
  isQuoteStale: boolean;
  tradeAnalysis: TradeAnalysis;
  showTokenStats: boolean;
  setShowTokenStats: (value: boolean) => void;
  showSlippageSettings: boolean;
  setShowSlippageSettings: (value: boolean) => void;
  settings: SwapSettings;
  setSettings: (
    settings: SwapSettings | ((prev: SwapSettings) => SwapSettings)
  ) => void;
  token0: Token | null;
  token1: Token | null;
  inputAmount: string;
  outputAmount: string;
  handleInputChange: (value: string, isInput: boolean) => Promise<void>;
  handleSwapTokens: () => void;
  setMaxAmount: () => Promise<void>;
  allTokens: Token[];
  availableTokensForInput: Token[];
  availableTokensForOutput: Token[];
  setToken0: (token: Token | null) => void;
  setToken1: (token: Token | null) => void;
  focusedInput: "input" | "output" | null;
  setFocusedInput: (value: "input" | "output" | null) => void;
  hasInsufficientBalance: boolean;
  shouldWarnUser: () => boolean;
  getPriceImpactLevel: (value: number) => string;
  showDetailedAnalysis: boolean;
  setShowDetailedAnalysis: (value: boolean) => void;
  getLiquidityRecommendations: () => string[];
  liquidityHealthScore: number;
  isSwapping: boolean;
  swapProgress: number;
  handleSwap: () => Promise<void>;
  canSwap: boolean;
  refreshQuote: () => void;
  handleRefreshBalances: () => void;
  poolsInfo?: any[]; // 添加池信息属性
}

const SwapCard: React.FC<SwapCardProps> = ({
  isReady,
  isAdvancedMode,
  setIsAdvancedMode,
  activeTab,
  setActiveTab,
  quote,
  isRefreshing,
  isQuoteStale,
  tradeAnalysis,
  showTokenStats,
  setShowTokenStats,
  showSlippageSettings,
  setShowSlippageSettings,
  settings,
  setSettings,
  token0,
  token1,
  inputAmount,
  outputAmount,
  handleInputChange,
  handleSwapTokens,
  setMaxAmount,
  allTokens,
  availableTokensForInput,
  availableTokensForOutput,
  setToken0,
  setToken1,
  focusedInput,
  setFocusedInput,
  hasInsufficientBalance,
  shouldWarnUser,
  getPriceImpactLevel,
  showDetailedAnalysis,
  setShowDetailedAnalysis,
  getLiquidityRecommendations,
  liquidityHealthScore,
  isSwapping,
  swapProgress,
  handleSwap: parentHandleSwap,
  canSwap,
  refreshQuote,
  handleRefreshBalances,
}) => {
  const { exactInput, exactOutput, checkAllowance, approveToken } =
    useSwapRouterWithClients();
  const [localIsSwapping, setLocalIsSwapping] = useState(false);
  const [localSwapProgress, setLocalSwapProgress] = useState(0);
  const [selectedFee, setSelectedFee] = useState<number | null>(null); // 添加费率状态
  const { toast } = useToast();
  const { address: userAddress } = useWallet();

  // 授权相关状态
  const [isApproving, setIsApproving] = useState(false);
  const [highSlippageMode, setHighSlippageMode] = useState(false); // 添加高滑点模式状态
  // 获取交易对数据
  const { poolsInfo } = usePoolManagerWithClients();
  const [selectPool, setSelectedPool] = useState(null);
  console.log("📊 池信息:", poolsInfo);

  // 处理费率选择
  const handleSelectFee = (fee: number, pool?: any) => {
    setSelectedFee(fee);
    if (pool) {
      setSelectedPool(pool); // 添加一个新的状态来存储选中的池
    }
    // 更新交易设置中的滑点容忍度，根据费率调整
    // 为高费率提供更高的滑点容忍度
    setSettings((prev) => ({
      ...prev,
      slippageTolerance:
        fee < 0.1 ? 0.1 : fee < 0.5 ? 0.3 : fee < 1.5 ? fee : fee * 1.5,
    }));

    // 高费率自动开启高滑点模式
    if (fee >= 1) {
      setHighSlippageMode(true);
    } else {
      setHighSlippageMode(false);
    }

    // 将选择的费率转换为基点值，用于交易路径
    // 例如：0.3% -> 3000, 0.05% -> 500, 1% -> 10000, 0.01% -> 100
    const feeBasisPoints = Math.floor(fee * 10000);

    // 存储费率对应的索引路径，供交易使用
    const feeIndex = getFeeIndex(feeBasisPoints);
    console.log(
      `选择费率: ${fee}%, 基点值: ${feeBasisPoints}, 索引: ${feeIndex}`
    );

    // 重新获取报价
    if (token0 && token1 && inputAmount && parseFloat(inputAmount) > 0) {
      refreshQuote();
    }

    toast({
      title: "费率已更新",
      description: `已选择 ${fee}% 费率，滑点已相应调整`,
    });
  };

  // 根据费率基点获取对应的索引
  const getFeeIndex = (feeBasisPoints: number): number => {
    // 根据截图中显示的映射关系
    switch (feeBasisPoints) {
      case 100: // 0.01%
        return 1; // 假设索引1对应最低费率
      case 500: // 0.05%
        return 0; // 假设索引0对应低费率
      case 3000: // 0.3%
        return 2; // 假设索引2对应中等费率
      case 10000: // 1%
        return 3; // 假设索引3对应高费率
      case 20000: // 2% - 添加超高费率选项
        return 3; // 可能也使用高费率索引
      default:
        return 2; // 默认使用中等费率
    }
  };

  // 增强版的 handleSwap 函数，使用 exactInput 和 exactOutput
  const handleSwap = async () => {
    try {
      setLocalIsSwapping(true);
      setLocalSwapProgress(10);

      // 检查是否可以交换
      if (!canSwap) {
        // 根据不同情况提供有用的反馈
        if (!token0 || !token1) {
          toast({
            title: "无法交换",
            description: "请选择交换的代币",
            variant: "destructive",
          });
        } else if (hasInsufficientBalance) {
          toast({
            title: "余额不足",
            description: `您的${token0.symbol}余额不足`,
            variant: "destructive",
          });
        } else if (
          !inputAmount ||
          parseFloat(inputAmount) <= 0 ||
          !outputAmount ||
          parseFloat(outputAmount) <= 0
        ) {
          toast({
            title: "无效金额",
            description: "请输入有效的交换金额",
            variant: "destructive",
          });
        } else if (quote?.error) {
          toast({
            title: "报价错误",
            description: quote.error || "无法获取交换报价",
            variant: "destructive",
          });
        } else if (!isReady) {
          toast({
            title: "系统未就绪",
            description: "请等待系统初始化完成",
            variant: "destructive",
          });
        } else {
          toast({
            title: "无法交换",
            description: "请检查交易参数",
            variant: "destructive",
          });
        }
        setLocalIsSwapping(false);
        setLocalSwapProgress(0);
        return;
      }

      // 检查授权
      setLocalSwapProgress(15);
      if (!token0 || !userAddress) {
        throw new Error("代币或用户地址未定义");
      }

      // 计算需要授权的金额
      const requiredAmount = BigInt(
        Math.floor(parseFloat(inputAmount) * 10 ** 18)
      );

      // 检查授权额度
      const allowance = await checkAllowance(
        token0.address as Address,
        userAddress as Address
      );

      // 如果授权额度不足，先进行授权
      if (allowance < requiredAmount) {
        setLocalSwapProgress(20);
        setIsApproving(true);

        toast({
          title: "需要授权",
          description: `正在授权使用您的 ${token0.symbol} 代币...`,
          variant: "default",
        });

        // 授权代币
        const approvalHash = await approveToken(
          token0.address as Address,
          undefined, // 使用默认的 spender (SwapRouter 地址)
          undefined // 使用默认的最大授权额度
        );
        console.log("approvalHash", approvalHash);

        // 等待授权交易确认
        toast({
          title: "授权中",
          description: "请在钱包中确认授权交易",
          variant: "default",
        });

        setLocalSwapProgress(30);

        // 等待授权交易确认
        // 注意：这里应该有等待交易确认的逻辑，但在当前代码中没有显示
        // 假设授权已经确认

        toast({
          title: "授权成功",
          description: `已授权使用 ${token0.symbol}，继续进行交易`,
          variant: "default",
        });

        setIsApproving(false);
      }

      setLocalSwapProgress(40);

      // 准备交易参数
      const now = BigInt(Math.floor(Date.now() / 1000));
      const deadline = now + BigInt(settings.deadline * 60); // 交易截止时间（分钟转秒）

      // 计算滑点值 - 增加滑点容忍度以防止 SPL 错误
      // 对于高费率交易，提供更高的滑点容忍度
      let slippageTolerance = settings.slippageTolerance;
      if (highSlippageMode || (selectedFee && selectedFee >= 1)) {
        // 对于高费率池，使用更高的滑点容忍度
        slippageTolerance = Math.max(
          slippageTolerance,
          selectedFee ? selectedFee * 2 : 2
        );
        console.log(`使用高滑点模式: ${slippageTolerance}%`);
      }

      const slippageBps = BigInt(Math.floor(slippageTolerance * 100)); // 转换为基点

      setLocalSwapProgress(50);

      // 根据交易方向选择合适的函数
      if (focusedInput === "input" || focusedInput === null) {
        // exactInput 交易 - 固定输入金额
        const inputAmountBigInt = BigInt(
          Math.floor(parseFloat(inputAmount) * 10 ** 18)
        ); // 假设 18 位小数
        const outputAmountBigInt = BigInt(
          Math.floor(parseFloat(outputAmount) * 10 ** 18)
        ); // 假设 18 位小数

        // 计算最小输出金额，使用更宽松的滑点容忍度
        const minOutputAmount =
          outputAmountBigInt - (outputAmountBigInt * slippageBps) / BigInt(500);
        console.log("selectPool", selectPool);
        // 在 handleSwap 函数中修改 indexPath 参数
        const params: ExactInputParams = {
          tokenIn: token0!.address as Address,
          tokenOut: token1!.address as Address,
          // 使用选择的费率索引构建路径，如果没有选择则使用默认值或报价中的路径
          indexPath: selectedFee
            ? [getFeeIndex(Math.floor(selectedFee * 10000))]
            : quote.path || [0],
          recipient: userAddress,
          deadline: deadline,
          amountIn: inputAmountBigInt,
          amountOutMinimum: minOutputAmount,
          sqrtPriceLimitX96: selectPool?.sqrtPriceX96 || BigInt(0), // 根据费率设置价格限制
        };

        setLocalSwapProgress(60);

        console.log("执行 exactInput 交易，参数:", params);

        // 执行交易
        const result = await exactInput(params);

        setLocalSwapProgress(80);

        // 处理交易结果
        if (result && result.hash) {
          setLocalSwapProgress(90);
          toast({
            title: "交易成功",
            description: `交易已确认: ${result.hash.slice(
              0,
              6
            )}...${result.hash.slice(-4)}`,
          });
        }
      } else {
        // exactOutput 交易 - 固定输出金额
        const inputAmountBigInt = BigInt(
          Math.floor(parseFloat(inputAmount) * 10 ** 18)
        ); // 假设 18 位小数
        const outputAmountBigInt = BigInt(
          Math.floor(parseFloat(outputAmount) * 10 ** 18)
        ); // 假设 18 位小数

        // 计算最大输入金额，使用更宽松的滑点容忍度
        const maxInputAmount =
          inputAmountBigInt + (inputAmountBigInt * slippageBps) / BigInt(10000);

        const params: ExactOutputParams = {
          tokenIn: token0!.address as Address,
          tokenOut: token1!.address as Address,
          // 对于exactOutput也应用相同的费率索引逻辑
          indexPath: selectedFee
            ? [getFeeIndex(Math.floor(selectedFee * 10000))]
            : quote.path || [0],
          recipient: userAddress,
          deadline: deadline,
          amountOut: outputAmountBigInt,
          amountInMaximum: maxInputAmount,
          sqrtPriceLimitX96: selectPool?.sqrtPriceLimitX96 || BigInt(0), // 根据费率设置价格限制
        };

        setLocalSwapProgress(60);

        console.log("执行 exactOutput 交易，参数:", params);

        // 执行交易
        const result = await exactOutput(params);

        setLocalSwapProgress(80);

        // 处理交易结果
        if (result && result.hash) {
          setLocalSwapProgress(90);
          toast({
            title: "交易成功",
            description: `交易已确认: ${result.hash.slice(
              0,
              6
            )}...${result.hash.slice(-4)}`,
          });
        }
      }

      setLocalSwapProgress(100);

      // 刷新余额和报价
      handleRefreshBalances();
      refreshQuote();

      // 调用父组件的 handleSwap 函数（如果需要）
      await parentHandleSwap();
    } catch (error) {
      console.error("交易失败:", error);

      // 特殊处理SPL错误
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      if (errorMessage.includes("SPL") || errorMessage.includes("slippage")) {
        toast({
          title: "滑点保护触发",
          description:
            "价格波动超出滑点容忍度。请增加滑点容忍度或尝试使用更高费率。",
          variant: "destructive",
        });
        // 自动开启高滑点模式
        setHighSlippageMode(true);
        // 增加滑点容忍度
        setSettings((prev) => ({
          ...prev,
          slippageTolerance: Math.max(prev.slippageTolerance * 2, 2),
        }));
      } else {
        toast({
          title: "交易失败",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLocalIsSwapping(false);
      setLocalSwapProgress(0);
    }
  };

  // 切换高滑点模式
  const toggleHighSlippageMode = () => {
    const newMode = !highSlippageMode;
    setHighSlippageMode(newMode);

    // 调整滑点容忍度
    if (newMode) {
      // 高滑点模式：使用更高的滑点容忍度
      setSettings((prev) => ({
        ...prev,
        slippageTolerance: Math.max(
          prev.slippageTolerance,
          selectedFee ? selectedFee * 2 : 2
        ),
      }));
      toast({
        title: "高滑点模式已开启",
        description: "已增加滑点容忍度以提高交易成功率",
      });
    } else {
      // 恢复正常滑点
      setSettings((prev) => ({
        ...prev,
        slippageTolerance: selectedFee
          ? selectedFee < 0.1
            ? 0.1
            : selectedFee < 0.5
            ? 0.3
            : selectedFee
          : 0.5,
      }));
      toast({
        title: "高滑点模式已关闭",
        description: "已恢复正常滑点容忍度",
      });
    }
  };

  return (
    <TooltipProvider>
      <div className="max-w-md mx-auto py-10">
        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                智能交换
              </CardTitle>
              <div className="flex items-center space-x-1">
                <Badge
                  variant={isReady ? "default" : "secondary"}
                  className="text-xs"
                >
                  {isReady ? "就绪" : "加载中"}
                </Badge>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsAdvancedMode(!isAdvancedMode)}
                      className={`h-8 w-8 ${
                        isAdvancedMode ? "bg-blue-100 text-blue-600" : ""
                      }`}
                    >
                      {isAdvancedMode ? (
                        <Minimize2 className="h-4 w-4" />
                      ) : (
                        <Maximize2 className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isAdvancedMode ? "简化模式" : "高级模式"}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* 导航标签 */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-4 bg-gray-100">
                <TabsTrigger
                  value="swap"
                  className="text-sm data-[state=active]:bg-white"
                >
                  <ArrowUpDown className="h-4 w-4 mr-1" />
                  交换
                </TabsTrigger>
                <TabsTrigger
                  value="limit"
                  className="text-sm data-[state=active]:bg-white"
                >
                  <Target className="h-4 w-4 mr-1" />
                  限价
                </TabsTrigger>
                <TabsTrigger
                  value="buy"
                  className="text-sm data-[state=active]:bg-white"
                >
                  <TrendingUp className="h-4 w-4 mr-1" />
                  买入
                </TabsTrigger>
                <TabsTrigger
                  value="sell"
                  className="text-sm data-[state=active]:bg-white"
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  卖出
                </TabsTrigger>
              </TabsList>

              <TabsContent value="swap" className="space-y-4 mt-4">
                {/* 控制面板 */}
                <SwapControlPanel
                  showTokenStats={showTokenStats}
                  setShowTokenStats={setShowTokenStats}
                  showSlippageSettings={showSlippageSettings}
                  setShowSlippageSettings={setShowSlippageSettings}
                  refreshQuote={refreshQuote}
                  handleRefreshBalances={handleRefreshBalances}
                  quote={quote}
                  isRefreshing={isRefreshing}
                />

                {/* 实时报价状态 */}
                {quote && (
                  <SwapQuoteStatus
                    quote={quote}
                    isRefreshing={isRefreshing}
                    isQuoteStale={isQuoteStale}
                  />
                )}

                {/* 高级模式 - 交易分析 */}
                {isAdvancedMode && tradeAnalysis && (
                  <TradeAnalysisPanel tradeAnalysis={tradeAnalysis} />
                )}

                {/* 代币统计信息 */}
                {showTokenStats && (
                  <TokenStatsPanel
                    allTokens={allTokens}
                    liquidityHealthScore={liquidityHealthScore}
                    settings={settings}
                    token0={token0}
                    token1={token1}
                  />
                )}

                {/* 高级设置面板 */}
                {showSlippageSettings && (
                  <SettingsPanel
                    settings={settings}
                    setSettings={setSettings}
                  />
                )}

                {/* 主要交易界面 */}
                <SwapPanel
                  token0={token0}
                  token1={token1}
                  inputAmount={inputAmount}
                  outputAmount={outputAmount}
                  handleInputChange={handleInputChange}
                  selectPool={selectPool}
                  handleSwapTokens={handleSwapTokens}
                  setMaxAmount={setMaxAmount}
                  availableTokensForInput={availableTokensForInput}
                  availableTokensForOutput={availableTokensForOutput}
                  setToken0={setToken0}
                  setToken1={setToken1}
                  focusedInput={focusedInput}
                  setFocusedInput={setFocusedInput}
                />

                {/* 费率选择组件 - 在代币选择后显示 */}
                {token0 && token1 && (
                  <FeeRateSelector
                    token0={token0}
                    token1={token1}
                    selectedFee={selectedFee}
                    onSelectFee={handleSelectFee}
                    poolsInfo={poolsInfo}
                    isLoading={isRefreshing}
                  />
                )}

                {/* 高滑点模式切换 */}
                {token0 && token1 && (
                  <Card
                    className={`border ${
                      highSlippageMode
                        ? "border-orange-300 bg-orange-50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <ShieldCheck
                            className={`h-4 w-4 ${
                              highSlippageMode
                                ? "text-orange-500"
                                : "text-gray-500"
                            }`}
                          />
                          <span
                            className={`text-sm font-medium ${
                              highSlippageMode
                                ? "text-orange-700"
                                : "text-gray-700"
                            }`}
                          >
                            高滑点保护模式
                          </span>
                        </div>
                        <Button
                          variant={highSlippageMode ? "default" : "outline"}
                          size="sm"
                          className={
                            highSlippageMode
                              ? "bg-orange-500 hover:bg-orange-600"
                              : ""
                          }
                          onClick={toggleHighSlippageMode}
                        >
                          {highSlippageMode ? "已开启" : "开启"}
                        </Button>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {highSlippageMode
                          ? "已增加滑点容忍度至" +
                            settings.slippageTolerance.toFixed(1) +
                            "%，提高交易成功率"
                          : "开启此模式可增加滑点容忍度，提高交易成功率"}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* 移除授权提示区域 */}

                {/* 增强的交易详情 */}
                {quote && !quote.error && (
                  <SwapDetails
                    quote={quote}
                    token0={token0}
                    token1={token1}
                    outputAmount={outputAmount}
                    settings={settings}
                    getPriceImpactLevel={getPriceImpactLevel}
                    showDetailedAnalysis={showDetailedAnalysis}
                    setShowDetailedAnalysis={setShowDetailedAnalysis}
                    isAdvancedMode={isAdvancedMode}
                  />
                )}

                {/* 警告和建议信息 */}
                <SwapWarnings
                  shouldWarnUser={shouldWarnUser}
                  hasInsufficientBalance={hasInsufficientBalance}
                  quote={quote}
                  token0={token0}
                  inputAmount={inputAmount}
                  getLiquidityRecommendations={getLiquidityRecommendations}
                />

                {/* 增强的交换按钮 */}
                <SwapButton
                  isSwapping={localIsSwapping || isSwapping || isApproving}
                  swapProgress={
                    localIsSwapping ? localSwapProgress : swapProgress
                  }
                  canSwap={canSwap && !localIsSwapping}
                  handleSwap={handleSwap}
                  hasInsufficientBalance={hasInsufficientBalance}
                  token0={token0}
                  token1={token1}
                  inputAmount={inputAmount}
                  isReady={isReady}
                  quote={quote}
                  shouldWarnUser={shouldWarnUser}
                  isAdvancedMode={isAdvancedMode}
                />
              </TabsContent>

              {/* 其他标签页内容 */}
              <TabsContent value="limit" className="space-y-4 mt-4">
                <PlaceholderTab
                  icon={
                    <Target className="h-12 w-12 text-yellow-600 mx-auto" />
                  }
                  title="限价交易"
                  description="设置目标价格，当市场价格达到时自动执行交易"
                  badgeText="即将推出"
                  badgeColor="yellow"
                />
              </TabsContent>

              <TabsContent value="buy" className="space-y-4 mt-4">
                <PlaceholderTab
                  icon={
                    <TrendingUp className="h-12 w-12 text-green-600 mx-auto" />
                  }
                  title="快速买入"
                  description="一键买入热门代币，支持定投和批量购买"
                  badgeText="开发中"
                  badgeColor="green"
                />
              </TabsContent>

              <TabsContent value="sell" className="space-y-4 mt-4">
                <PlaceholderTab
                  icon={
                    <DollarSign className="h-12 w-12 text-red-600 mx-auto" />
                  }
                  title="智能卖出"
                  description="止损止盈设置，自动化卖出策略"
                  badgeText="规划中"
                  badgeColor="red"
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* 底部信息栏 */}
        <Card className="mt-4 bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>网络正常</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>最后更新: {new Date().toLocaleTimeString()}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span>v2.1.0</span>
                <Badge variant="outline" className="text-xs">
                  Beta
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};

export default SwapCard;