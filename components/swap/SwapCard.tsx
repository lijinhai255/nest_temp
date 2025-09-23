"use client";

import { useState } from "react";
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
  const { exactInput, exactOutput } = useSwapRouterWithClients();
  const [localIsSwapping, setLocalIsSwapping] = useState(false);
  const [localSwapProgress, setLocalSwapProgress] = useState(0);
  const { toast } = useToast();
  const { address: userAddress } = useWallet();
  // 增强版的 handleSwap 函数，使用 exactInput 和 exactOutput
  const handleSwap = async () => {
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
      return;
    }

    try {
      setLocalIsSwapping(true);
      setLocalSwapProgress(10);

      // 准备交易参数
      const now = BigInt(Math.floor(Date.now() / 1000));
      const deadline = now + BigInt(settings.deadline * 60); // 交易截止时间（分钟转秒）
      // 获取用户钱包地址（应该从钱包连接状态中获取）

      setLocalSwapProgress(20);

      // 计算滑点值
      const slippageBps = BigInt(Math.floor(settings.slippageTolerance * 100)); // 转换为基点 (0.5% = 50 基点)

      // 根据交易方向选择合适的函数
      if (focusedInput === "input" || focusedInput === null) {
        // exactInput 交易 - 固定输入金额
        const inputAmountBigInt = BigInt(
          Math.floor(parseFloat(inputAmount) * 10 ** 18)
        ); // 假设 18 位小数
        const outputAmountBigInt = BigInt(
          Math.floor(parseFloat(outputAmount) * 10 ** 18)
        ); // 假设 18 位小数
        const minOutputAmount =
          outputAmountBigInt -
          (outputAmountBigInt * slippageBps) / BigInt(10000);

        const params: ExactInputParams = {
          tokenIn: token0!.address as Address,
          tokenOut: token1!.address as Address,
          indexPath: quote.path || [0], // 使用报价中的路径，如果没有则使用默认值
          recipient: userAddress,
          deadline: deadline,
          amountIn: inputAmountBigInt,
          amountOutMinimum: minOutputAmount,
          sqrtPriceLimitX96: BigInt(0), // 使用默认值
        };

        setLocalSwapProgress(40);

        console.log("执行 exactInput 交易，参数:", params);

        // 执行交易
        const result = await exactInput(params);

        setLocalSwapProgress(70);

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
        const maxInputAmount =
          inputAmountBigInt + (inputAmountBigInt * slippageBps) / BigInt(10000);

        const params: ExactOutputParams = {
          tokenIn: token0!.address as Address,
          tokenOut: token1!.address as Address,
          indexPath: quote.path || [0], // 使用报价中的路径，如果没有则使用默认值
          recipient: userAddress,
          deadline: deadline,
          amountOut: outputAmountBigInt,
          amountInMaximum: maxInputAmount,
          sqrtPriceLimitX96: BigInt(0), // 使用默认值
        };

        setLocalSwapProgress(40);

        console.log("执行 exactOutput 交易，参数:", params);

        // 执行交易
        const result = await exactOutput(params);

        setLocalSwapProgress(70);

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
      toast({
        title: "交易失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setLocalIsSwapping(false);
      setLocalSwapProgress(0);
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
                  handleSwapTokens={handleSwapTokens}
                  setMaxAmount={setMaxAmount}
                  availableTokensForInput={availableTokensForInput}
                  availableTokensForOutput={availableTokensForOutput}
                  setToken0={setToken0}
                  setToken1={setToken1}
                  focusedInput={focusedInput}
                  setFocusedInput={setFocusedInput}
                />

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
                  isSwapping={localIsSwapping || isSwapping}
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
