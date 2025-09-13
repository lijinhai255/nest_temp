"use client";

import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  Copy,
  ExternalLink,
  LogOut,
  Settings,
  Check,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import ChainIcon from "./ChainIcon";
import { ChainConfig } from "./ChainSwitcher";
import {
  formatAddress,
  formatBalance,
  viewOnExplorer,
} from "@/utils/connect-button-utils";

interface AccountDropdownProps {
  // 基础信息
  address: string;
  balance?: string;
  currentChain?: ChainConfig;

  // 显示控制
  showBalance: boolean;
  showChainSwitcher: boolean;
  size: "default" | "sm" | "lg" | "icon";
  accountStatus: "full" | "address" | "avatar" | "none";
  chainStatus: "full" | "icon" | "none";
  className: string;

  // 链相关
  filteredChains: ChainConfig[];
  switchingChainId: number | null;

  // 状态
  copied: boolean;
  balanceLoading: boolean;

  // 回调函数
  onChainSwitch: (chain: ChainConfig) => void;
  onCopyAddress: () => void;
  onDisconnect: () => void;
  onFetchBalance?: () => void;
}

const AccountDropdown = ({
  address,
  balance,
  currentChain,
  showBalance,
  showChainSwitcher,
  size,
  accountStatus,
  chainStatus,
  className,
  filteredChains,
  switchingChainId,
  copied,
  balanceLoading,
  onChainSwitch,
  onCopyAddress,
  onDisconnect,
  onFetchBalance,
}: AccountDropdownProps) => {
  const getButtonStyles = () => {
    const baseStyles = "transition-all duration-200";

    switch (size) {
      case "sm":
        return cn(baseStyles, "h-8 px-3 text-sm", className);
      case "lg":
        return cn(baseStyles, "h-12 px-6 text-base", className);
      case "icon":
        return cn(baseStyles, "h-10 w-10 p-0", className);
      default:
        return cn(baseStyles, "h-10 px-4", className);
    }
  };

  // 渲染链状态
  const renderChainStatus = () => {
    if (chainStatus === "none" || !currentChain) return null;

    switch (chainStatus) {
      case "full":
        return (
          <span className="flex items-center gap-2">
            <ChainIcon chain={currentChain} />
            {currentChain.shortName}
          </span>
        );
      case "icon":
        return <ChainIcon chain={currentChain} />;
      default:
        return null;
    }
  };

  // 渲染账户状态
  const renderAccountStatus = () => {
    const formattedAddress = formatAddress(address, accountStatus);
    if (!formattedAddress) return null;

    return (
      <span className="font-mono text-sm text-muted-foreground">
        {formattedAddress}
      </span>
    );
  };

  // 渲染余额
  const renderBalance = () => {
    if (!showBalance) return null;

    const symbol = currentChain?.nativeCurrency.symbol || "ETH";

    return (
      <span className="text-sm text-muted-foreground flex items-center gap-1">
        {balanceLoading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          formatBalance(balance || "0.0000")
        )}{" "}
        {symbol}
      </span>
    );
  };

  // 紧凑模式和图标模式
  if (size === "sm" || size === "icon") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={getButtonStyles()}>
            <div className="flex items-center gap-2">
              {size !== "icon" && renderAccountStatus()}
              {size !== "icon" && <ChevronDown className="w-3 h-3" />}
              {size === "icon" && (
                <div className="w-2 h-2 bg-green-500 rounded-full" />
              )}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <div className="flex items-center gap-2">
              {currentChain && <ChainIcon chain={currentChain} />}
              <span className="text-sm font-medium">
                {currentChain?.shortName || "未知链"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1 font-mono">
              {address}
            </div>
            {showBalance && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                余额:{" "}
                {balanceLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  `${formatBalance(balance || "0.0000")} ${
                    currentChain?.nativeCurrency.symbol || "ETH"
                  }`
                )}
              </div>
            )}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onCopyAddress}>
            {copied ? (
              <Check className="w-4 h-4 mr-2 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 mr-2" />
            )}
            {copied ? "已复制" : "复制地址"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => viewOnExplorer(address, currentChain)}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            在浏览器中查看
          </DropdownMenuItem>
          {showBalance && onFetchBalance && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onFetchBalance}
                disabled={balanceLoading}
              >
                {balanceLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Settings className="w-4 h-4 mr-2" />
                )}
                刷新余额
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDisconnect} className="text-red-600">
            <LogOut className="w-4 h-4 mr-2" />
            断开连接
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // 默认和大尺寸模式
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={getButtonStyles()}>
          <div className="flex items-center gap-3">
            {renderChainStatus()}
            <div className="flex flex-col items-start">
              {renderAccountStatus()}
              {renderBalance()}
            </div>
            <ChevronDown className="w-4 h-4 ml-2" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 mb-2">
            {currentChain && <ChainIcon chain={currentChain} />}
            <span className="font-medium">
              {currentChain?.shortName || "未知链"}
            </span>
          </div>
          <div className="text-sm font-mono text-muted-foreground mb-1">
            {address}
          </div>
          {showBalance && (
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              余额:{" "}
              {balanceLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                `${formatBalance(balance || "0.0000")} ${
                  currentChain?.nativeCurrency.symbol || "ETH"
                }`
              )}
            </div>
          )}
        </div>
        <DropdownMenuSeparator />

        {/* 链切换子菜单 */}
        {showChainSwitcher && (
          <>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Settings className="w-4 h-4 mr-2" />
                <span>切换网络</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  选择网络
                </div>
                <DropdownMenuSeparator />
                {filteredChains.map((chain) => (
                  <DropdownMenuItem
                    key={chain.id}
                    onClick={() => onChainSwitch(chain)}
                    disabled={switchingChainId === chain.id}
                    className="flex items-center gap-3 py-2"
                  >
                    {switchingChainId === chain.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ChainIcon chain={chain} size="sm" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{chain.shortName}</div>
                      <div className="text-xs text-muted-foreground">
                        {chain.name}
                      </div>
                    </div>
                    {currentChain?.id === chain.id && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem onClick={onCopyAddress}>
          {copied ? (
            <Check className="w-4 h-4 mr-2 text-green-500" />
          ) : (
            <Copy className="w-4 h-4 mr-2" />
          )}
          {copied ? "已复制" : "复制地址"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => viewOnExplorer(address, currentChain)}>
          <ExternalLink className="w-4 h-4 mr-2" />
          在浏览器中查看
        </DropdownMenuItem>

        {showBalance && onFetchBalance && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onFetchBalance}
              disabled={balanceLoading}
            >
              {balanceLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Settings className="w-4 h-4 mr-2" />
              )}
              刷新余额
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDisconnect} className="text-red-600">
          <LogOut className="w-4 h-4 mr-2" />
          断开连接
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AccountDropdown;
