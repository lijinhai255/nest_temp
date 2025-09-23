"use client";

import { forwardRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, Plus } from "lucide-react";
import { Address } from "viem";
import { isAddress } from "viem";
import { getTokenInfo } from "@/types/addPosition";

// 代币接口
interface Token {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
}

interface TokenSelectorProps {
  // 代币相关
  selectedToken?: Token;
  onTokenChange?: (token: Token) => void;
  availableTokens: Token[];

  // 金额相关
  balance?: string;
  showBalance?: boolean;

  // 样式相关
  label?: string;
  className?: string;
  disabled?: boolean;
}

const TokenSelector = forwardRef<HTMLDivElement, TokenSelectorProps>(
  (
    {
      selectedToken,
      onTokenChange,
      availableTokens,
      balance = "0",
      showBalance = true,
      label,
      className = "",
      disabled = false,
    },
    ref
  ) => {
    const [showAddressInput, setShowAddressInput] = useState(false);
    const [customAddress, setCustomAddress] = useState("");
    const [addressError, setAddressError] = useState("");

    // 处理代币选择
    const handleTokenSelect = (tokenAddress: string) => {
      if (tokenAddress === "custom") {
        setShowAddressInput(true);
        return;
      }

      const token = availableTokens.find((t) => t.address === tokenAddress);
      if (token) {
        onTokenChange?.(token);
        setShowAddressInput(false);
      }
    };

    // 处理自定义地址提交
    const handleAddressSubmit = () => {
      if (!customAddress) {
        setAddressError("请输入代币地址");
        return;
      }

      // 验证地址格式
      if (!isAddress(customAddress)) {
        setAddressError("无效的以太坊地址");
        return;
      }

      // 检查地址是否已存在于可用代币列表中
      const existingToken = availableTokens.find(
        (t) => t.address.toLowerCase() === customAddress.toLowerCase()
      );

      if (existingToken) {
        onTokenChange?.(existingToken);
      } else {
        // 使用 getTokenInfo 获取代币信息
        const tokenInfo = getTokenInfo(customAddress as Address);

        // 创建新代币对象
        const newToken: Token = {
          address: customAddress as Address,
          symbol: tokenInfo.symbol,
          name: tokenInfo.name,
          decimals: tokenInfo.decimals,
        };

        onTokenChange?.(newToken);
      }

      setShowAddressInput(false);
      setCustomAddress("");
      setAddressError("");
    };

    // 取消自定义地址输入
    const handleCancel = () => {
      setShowAddressInput(false);
      setCustomAddress("");
      setAddressError("");
    };

    // 获取友好的地址显示
    const getFormattedAddress = (address: string) => {
      const tokenInfo = getTokenInfo(address as Address);
      if (tokenInfo.name !== `Token ${address.substring(0, 8)}...`) {
        return tokenInfo.name;
      }
      return `${address.substring(0, 6)}...${address.substring(38)}`;
    };

    // 格式化余额，控制小数点
    const formatBalance = (balanceStr: string) => {
      const num = parseFloat(balanceStr);
      if (isNaN(num)) return "0";

      // 如果是整数，不显示小数点
      if (Number.isInteger(num)) return num.toString();

      // 如果小数部分很小，限制到最多6位小数
      const decimalPlaces =
        num >= 1000 ? 2 : num >= 100 ? 3 : num >= 10 ? 4 : num >= 1 ? 5 : 6;

      return num.toLocaleString(undefined, {
        maximumFractionDigits: decimalPlaces,
        minimumFractionDigits: 0,
      });
    };

    return (
      <div className={`space-y-2 ${className}`} ref={ref}>
        {/* 标签 */}
        {label && (
          <label className="text-sm font-medium text-gray-700">{label}</label>
        )}

        {/* 代币选择器或地址输入 */}
        <div className="w-full">
          {showAddressInput ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={customAddress}
                  onChange={(e) => {
                    setCustomAddress(e.target.value);
                    setAddressError("");
                  }}
                  placeholder="输入代币地址 (0x...)"
                  className="flex-1"
                />
                <Button onClick={handleAddressSubmit} size="sm">
                  确认
                </Button>
                <Button onClick={handleCancel} variant="outline" size="sm">
                  取消
                </Button>
              </div>
              {addressError && (
                <p className="text-sm text-red-500">{addressError}</p>
              )}
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              {/* 金额显示区域 */}
              {showBalance && (
                <div className="px-4 py-2 bg-gray-50 border-b flex items-center">
                  <div className="flex-1">
                    <div className="text-lg font-medium">
                      {formatBalance(balance)}
                    </div>
                    <div className="text-xs text-gray-500">
                      ${formatBalance((parseFloat(balance) * 1.2).toString())}{" "}
                      {/* 模拟USD价值 */}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    Balance: {formatBalance(balance)}
                  </div>
                </div>
              )}

              {/* 代币选择器 */}
              <Select
                value={selectedToken?.address}
                onValueChange={handleTokenSelect}
                disabled={disabled}
              >
                <SelectTrigger
                  className={`
                    w-full border-0 bg-white hover:bg-gray-50 rounded-none
                    ${disabled ? "opacity-60" : ""}
                  `}
                >
                  <div className="flex items-center gap-2">
                    {/* 代币图标 */}
                    {selectedToken && (
                      <div
                        className={`
                          w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                          ${
                            selectedToken.symbol === "ETH"
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200"
                          }
                        `}
                      >
                        {selectedToken.symbol === "ETH"
                          ? "⟠"
                          : selectedToken.symbol[0] || "?"}
                      </div>
                    )}
                    <SelectValue placeholder="选择代币">
                      {selectedToken
                        ? `${selectedToken.symbol} - ${getFormattedAddress(
                            selectedToken.address
                          )}`
                        : "选择代币"}
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
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">
                            {getFormattedAddress(token.address)}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">
                    <div className="flex items-center gap-2 text-blue-600">
                      <Plus className="w-4 h-4" />
                      <div className="font-medium">输入自定义代币地址</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
    );
  }
);

TokenSelector.displayName = "TokenSelector";

export default TokenSelector;