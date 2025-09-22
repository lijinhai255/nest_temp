"use client";

import { useState, useEffect, forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown } from "lucide-react";
import { Address } from "viem";

// 代币接口
interface Token {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
}

interface TokenAmountInputProps {
  // 基础属性
  value: string;
  onChange?: (value: string) => void;
  onTokenChange?: (token: Token) => void;

  // 代币相关
  selectedToken?: Token;
  availableTokens: Token[];

  // 余额相关
  balance?: string | number;
  showBalance?: boolean;
  showMaxButton?: boolean;
  onMaxClick?: () => void;

  // 价格显示
  usdValue?: string | number;
  showUsdValue?: boolean;

  // 模式控制
  mode?: "input" | "output";
  disabled?: boolean;
  readOnly?: boolean;

  // 样式相关
  placeholder?: string;
  label?: string;
  className?: string;

  // 验证相关
  error?: string;
  warning?: string;
  balanceLoading?: boolean;
}

const TokenAmountInput = forwardRef<HTMLInputElement, TokenAmountInputProps>(
  (
    {
      value,
      onChange,
      onTokenChange,
      selectedToken,
      availableTokens,
      balance,
      showBalance = true,
      showMaxButton = true,
      onMaxClick,
      usdValue,
      showUsdValue = true,
      mode = "input",
      disabled = false,
      readOnly = false,
      placeholder = "0",
      label,
      className = "",
      error,
      warning,
      balanceLoading = false,
    },
    ref
  ) => {
    const [focused, setFocused] = useState(false);

    // 格式化余额显示
    const formatBalance = (balance: string | number | undefined) => {
      if (!balance) return "0";

      const num = typeof balance === "string" ? parseFloat(balance) : balance;
      if (isNaN(num)) return "0";

      // 大数字格式化
      if (num >= 1e6) {
        return `${(num / 1e6).toFixed(2)}M`;
      } else if (num >= 1e3) {
        return `${(num / 1e3).toFixed(2)}K`;
      } else if (num < 0.01 && num > 0) {
        return num.toExponential(2);
      } else {
        return num.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 6,
        });
      }
    };

    // 格式化 USD 价值
    const formatUsdValue = (usd: string | number | undefined) => {
      if (!usd) return "$0.00";

      const num = typeof usd === "string" ? parseFloat(usd) : usd;
      if (isNaN(num)) return "$0.00";

      return `$${num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    };

    // 处理输入变化
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (mode === "output" || readOnly) return;

      const inputValue = e.target.value;

      // 只允许数字和小数点
      if (!/^\d*\.?\d*$/.test(inputValue)) return;

      onChange?.(inputValue);
    };

    // 处理代币选择
    const handleTokenSelect = (tokenAddress: string) => {
      const token = availableTokens.find((t) => t.address === tokenAddress);
      if (token) {
        onTokenChange?.(token);
      }
    };

    // 处理最大值点击
    const handleMaxClick = () => {
      if (mode === "output" || readOnly) return;
      onMaxClick?.();
    };

    return (
      <div className={`space-y-2 ${className}`}>
        {/* 标签 */}
        {label && (
          <label className="text-sm font-medium text-gray-700">{label}</label>
        )}

        {/* 主输入区域 */}
        <div
          className={`
          relative bg-white border rounded-lg p-4 transition-all duration-200
          ${
            focused
              ? "border-blue-500 ring-2 ring-blue-500/20"
              : "border-gray-200"
          }
          ${error ? "border-red-500" : ""}
          ${warning ? "border-yellow-500" : ""}
          ${disabled ? "bg-gray-50 opacity-60" : ""}
          ${mode === "output" ? "bg-gray-50" : ""}
        `}
        >
          <div className="flex items-center justify-between">
            {/* 金额输入 */}
            <div className="flex-1">
              <Input
                ref={ref}
                type="text"
                value={value}
                onChange={handleInputChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={placeholder}
                disabled={disabled}
                readOnly={readOnly || mode === "output"}
                className={`
                  text-2xl font-bold border-none p-0 h-auto bg-transparent
                  focus-visible:ring-0 focus-visible:ring-offset-0
                  ${mode === "output" ? "text-gray-600" : "text-gray-900"}
                `}
              />
            </div>

            {/* 代币选择器 */}
            <div className="ml-4">
              <Select
                value={selectedToken?.address}
                onValueChange={handleTokenSelect}
                disabled={disabled}
              >
                <SelectTrigger
                  className={`
                  w-auto min-w-[100px] border-none bg-blue-500 text-white hover:bg-blue-600
                  ${
                    selectedToken?.symbol === "XRP"
                      ? "bg-gray-800 hover:bg-gray-700"
                      : ""
                  }
                  ${disabled ? "opacity-60" : ""}
                `}
                >
                  <div className="flex items-center gap-2">
                    {/* 代币图标 */}
                    <div
                      className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${
                        selectedToken?.symbol === "ETH"
                          ? "bg-blue-600"
                          : "bg-white/20"
                      }
                    `}
                    >
                      {selectedToken?.symbol === "ETH"
                        ? "⟠"
                        : selectedToken?.symbol?.[0] || "?"}
                    </div>
                    <SelectValue placeholder="Select">
                      {selectedToken?.symbol || "Select"}
                    </SelectValue>
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {availableTokens.map((token) => (
                    <SelectItem key={token.address} value={token.address}>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-xs">
                          {token.symbol[0]}
                        </div>
                        <div>
                          <div className="font-medium">{token.symbol}</div>
                          <div className="text-xs text-gray-500">
                            {token.name}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 底部信息行 */}
          <div className="flex items-center justify-between mt-3 text-sm">
            {/* USD 价值 */}
            <div className="text-gray-500">
              {showUsdValue ? formatUsdValue(usdValue) : ""}
            </div>

            {/* 余额和最大值按钮 */}
            <div className="flex items-center gap-2 text-gray-500">
              {showBalance && (
                <span>
                  Balance: {balanceLoading ? "..." : formatBalance(balance)}
                </span>
              )}

              {showMaxButton && mode === "input" && !readOnly && (
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto text-blue-500 hover:text-blue-600"
                  onClick={handleMaxClick}
                  disabled={disabled}
                >
                  Max
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 错误和警告信息 */}
        {error && (
          <div className="text-sm text-red-600 flex items-center gap-1">
            <span className="text-red-500">⚠</span>
            {error}
          </div>
        )}

        {warning && !error && (
          <div className="text-sm text-yellow-600 flex items-center gap-1">
            <span className="text-yellow-500">⚠</span>
            {warning}
          </div>
        )}
      </div>
    );
  }
);

TokenAmountInput.displayName = "TokenAmountInput";

export default TokenAmountInput;
