"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  XCircle,
  Target,
  DollarSign,
  Timer,
  AlertCircle,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { Token } from "@/hooks/useTokenOptions";
import { SwapQuote } from "./types";

// 按钮状态组件
interface ButtonContentProps {
  icon: React.ReactNode;
  text: string;
  subText?: string;
}

const ButtonContent: React.FC<ButtonContentProps> = ({
  icon,
  text,
  subText,
}) => (
  <div className="flex items-center space-x-2">
    {icon}
    <span>{text}</span>
    {subText && <div className="text-sm opacity-75">{subText}</div>}
  </div>
);

// 定义按钮状态类型
type ButtonState =
  | "swapping"
  | "insufficientBalance"
  | "selectTokens"
  | "enterAmount"
  | "notReady"
  | "quoteError"
  | "highRisk"
  | "ready";

interface SwapButtonProps {
  isSwapping: boolean;
  swapProgress: number;
  canSwap: boolean;
  handleSwap: () => Promise<void>;
  hasInsufficientBalance: boolean;
  token0: Token | null;
  token1: Token | null;
  inputAmount: string;
  isReady: boolean;
  quote: SwapQuote | null;
  shouldWarnUser: () => boolean;
  isAdvancedMode: boolean;
}

const SwapButton: React.FC<SwapButtonProps> = ({
  isSwapping,
  swapProgress,
  canSwap,
  handleSwap,
  hasInsufficientBalance,
  token0,
  token1,
  inputAmount,
  isReady,
  quote,
  shouldWarnUser,
  isAdvancedMode,
}) => {
  // 确定按钮状态
  const getButtonState = (): ButtonState => {
    if (isSwapping) return "swapping";
    if (hasInsufficientBalance) return "insufficientBalance";
    if (!token0 || !token1) return "selectTokens";
    if (!inputAmount || parseFloat(inputAmount) <= 0) return "enterAmount";
    if (!isReady) return "notReady";
    if (quote?.error) return "quoteError";
    if (shouldWarnUser()) return "highRisk";
    return "ready";
  };

  // 根据状态获取按钮内容
  const getButtonContent = (state: ButtonState) => {
    switch (state) {
      case "swapping":
        return (
          <ButtonContent
            icon={<Loader2 className="h-5 w-5 animate-spin" />}
            text="交换中..."
            subText={
              swapProgress < 50
                ? "准备中"
                : swapProgress < 80
                ? "执行中"
                : "确认中"
            }
          />
        );
      case "insufficientBalance":
        return (
          <ButtonContent
            icon={<XCircle className="h-5 w-5" />}
            text="余额不足"
          />
        );
      case "selectTokens":
        return (
          <ButtonContent
            icon={<Target className="h-5 w-5" />}
            text="选择代币"
          />
        );
      case "enterAmount":
        return (
          <ButtonContent
            icon={<DollarSign className="h-5 w-5" />}
            text="输入金额"
          />
        );
      case "notReady":
        return (
          <ButtonContent
            icon={<Timer className="h-5 w-5" />}
            text="系统未就绪"
          />
        );
      case "quoteError":
        return (
          <ButtonContent
            icon={<AlertCircle className="h-5 w-5" />}
            text="报价错误"
          />
        );
      case "highRisk":
        return (
          <ButtonContent
            icon={<AlertTriangle className="h-5 w-5" />}
            text="高风险交换"
          />
        );
      case "ready":
        return (
          <ButtonContent icon={<Zap className="h-5 w-5" />} text="立即交换" />
        );
    }
  };

  const buttonState = getButtonState();
  console.log("canSwap || isSwapping", canSwap, isSwapping);

  return (
    <div className="space-y-3">
      {isSwapping && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-blue-800">交换进度</span>
                <span className="text-blue-600">{swapProgress}%</span>
              </div>
              <Progress value={swapProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        onClick={handleSwap}
        disabled={!canSwap || isSwapping}
        className={`w-full h-14 text-lg font-bold transition-all duration-200 ${
          canSwap && !isSwapping
            ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            : ""
        }`}
        size="lg"
      >
        {getButtonContent(buttonState)}
      </Button>

      {/* 快捷操作提示 */}
      <div className="text-center text-xs text-gray-500 space-y-1">
        <div>快捷键: Ctrl+R 刷新 • Ctrl+S 交换位置 • Ctrl+M 最大金额</div>
        {isAdvancedMode && (
          <div className="text-blue-600">
            高级模式已启用 - 包含智能分析和风险评估
          </div>
        )}
      </div>
    </div>
  );
};

export default SwapButton;
