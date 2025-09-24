"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowDown } from "lucide-react";
import { Token } from "@/hooks/useTokenOptions";
import { PoolInfo } from "@/store/usePoolManagerStore";

interface SwapPanelProps {
  token0: Token | null;
  token1: Token | null;
  inputAmount: string;
  outputAmount: string;
  handleInputChange: (value: string, isInput: boolean) => Promise<void>;
  handleSwapTokens: () => void;
  setMaxAmount: () => Promise<void>;
  availableTokensForInput: Token[];
  availableTokensForOutput: Token[];
  setToken0: (token: Token | null) => void;
  setToken1: (token: Token | null) => void;
  focusedInput: "input" | "output" | null;
  setFocusedInput: (value: "input" | "output" | null) => void;
  selectPool: PoolInfo;
}

const SwapPanel: React.FC<SwapPanelProps> = ({
  token0,
  token1,
  inputAmount,
  outputAmount,
  handleInputChange,
  handleSwapTokens,
  setMaxAmount,
  availableTokensForInput,
  availableTokensForOutput,
  setToken0,
  setToken1,
  focusedInput,
  setFocusedInput,
  selectPool,
}) => {
  // 获取输入文本颜色
  const getInputTextColor = useCallback(
    (amount: string, token: Token | null, isInputField: boolean) => {
      if (!amount || !token || !isInputField) {
        return "text-foreground";
      }

      const amountValue = parseFloat(amount);
      const balanceValue = parseFloat(token.balance);

      if (amountValue > balanceValue) {
        return "text-red-500 animate-pulse";
      }

      if (amountValue > balanceValue * 0.8) {
        return "text-orange-500";
      }

      return "text-foreground";
    },
    []
  );

  return (
    <div className="space-y-4">
      {/* 输入代币 */}
      <Card
        className={`transition-all duration-200 ${
          focusedInput === "input"
            ? "ring-2 ring-blue-500 shadow-lg"
            : "hover:shadow-md"
        }`}
      >
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium text-gray-600">卖出</Label>
              {token0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    余额: {parseFloat(token0.balance).toFixed(4)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={setMaxAmount}
                    className="text-xs h-auto p-1 text-blue-600 hover:text-blue-800"
                  >
                    最大
                  </Button>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="0.0"
                  value={inputAmount}
                  onChange={(e) =>
                    handleInputChange(e.target.value, true, selectPool)
                  }
                  onFocus={() => setFocusedInput("input")}
                  onBlur={() => setFocusedInput(null)}
                  className={`text-right text-xl font-bold border-0 bg-transparent focus:ring-0 ${getInputTextColor(
                    inputAmount,
                    token0,
                    true
                  )}`}
                />
                {inputAmount && token0 && (
                  <div className="text-right text-sm text-gray-500 mt-1">
                    ≈ ${(parseFloat(inputAmount) * 1.0).toFixed(2)}
                  </div>
                )}
              </div>

              <Select
                value={token0?.address || ""}
                onValueChange={(value) => {
                  const selectedToken = availableTokensForInput.find(
                    (token) => token.address === value
                  );
                  setToken0(selectedToken || null);
                }}
              >
                <SelectTrigger className="w-36 bg-gray-50 border-gray-200">
                  <SelectValue placeholder="选择代币">
                    {token0 && (
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {token0.symbol.charAt(0)}
                        </div>
                        <span className="font-medium">{token0.symbol}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableTokensForInput.map((token) => (
                    <SelectItem key={token.address} value={token.address}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {token.symbol.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">{token.symbol}</span>
                            <span className="text-xs text-gray-500 truncate max-w-24">
                              {token.name}
                            </span>
                          </div>
                        </div>
                        <div className="text-right ml-3">
                          <div className="text-sm font-medium">
                            {parseFloat(token.balance).toFixed(4)}
                          </div>
                          <div className="text-xs text-gray-500">
                            ${(parseFloat(token.balance) * 1.0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 交换按钮 */}
      <div className="flex justify-center relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-0.5 bg-gray-200"></div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSwapTokens}
              className="rounded-full border-2 border-gray-200 hover:border-blue-300 bg-white hover:bg-blue-50 shadow-md hover:shadow-lg transition-all duration-200 z-10"
            >
              <ArrowDown className="h-4 w-4 text-gray-600 hover:text-blue-600" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>交换代币位置 (Ctrl+S)</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* 输出代币 */}
      <Card
        className={`transition-all duration-200 ${
          focusedInput === "output"
            ? "ring-2 ring-green-500 shadow-lg"
            : "hover:shadow-md"
        }`}
      >
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium text-gray-600">买入</Label>
              {token1 && (
                <span className="text-xs text-gray-500">
                  余额: {parseFloat(token1.balance).toFixed(4)}
                </span>
              )}
            </div>

            <div className="flex space-x-3">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="0.0"
                  value={outputAmount}
                  onChange={(e) =>
                    handleInputChange(e.target.value, false, selectPool)
                  }
                  onFocus={() => setFocusedInput("output")}
                  onBlur={() => setFocusedInput(null)}
                  className="text-right text-xl font-bold border-0 bg-transparent focus:ring-0 text-foreground"
                />
                {outputAmount && token1 && (
                  <div className="text-right text-sm text-gray-500 mt-1">
                    ≈ ${(parseFloat(outputAmount) * 1.0).toFixed(2)}
                  </div>
                )}
              </div>

              <Select
                value={token1?.address || ""}
                onValueChange={(value) => {
                  const selectedToken = availableTokensForOutput.find(
                    (token) => token.address === value
                  );
                  setToken1(selectedToken || null);
                }}
              >
                <SelectTrigger className="w-36 bg-gray-50 border-gray-200">
                  <SelectValue placeholder="选择代币">
                    {token1 && (
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {token1.symbol.charAt(0)}
                        </div>
                        <span className="font-medium">{token1.symbol}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableTokensForOutput.map((token) => (
                    <SelectItem key={token.address} value={token.address}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {token.symbol.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">{token.symbol}</span>
                            <span className="text-xs text-gray-500 truncate max-w-24">
                              {token.name}
                            </span>
                          </div>
                        </div>
                        <div className="text-right ml-3">
                          <div className="text-sm font-medium">
                            {parseFloat(token.balance).toFixed(4)}
                          </div>
                          <div className="text-xs text-gray-500">
                            ${(parseFloat(token.balance) * 1.0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SwapPanel;