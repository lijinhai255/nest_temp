"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useWallet } from "@/provider/index";
import { ChevronDown, Check, AlertCircle, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// 支持的链配置
export interface ChainConfig {
  id: number;
  name: string;
  shortName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  iconUrl?: string;
  color?: string;
}

// 定义钱包错误类型
interface WalletError extends Error {
  code?: number;
  message: string;
}

// 定义以太坊 Provider 请求方法的参数类型
interface SwitchChainParams {
  chainId: string;
}

interface AddChainParams {
  chainId: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    id: 1,
    name: "Ethereum Mainnet",
    shortName: "Ethereum",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://mainnet.infura.io/v3/"],
    blockExplorerUrls: ["https://etherscan.io"],
    color: "#627EEA",
  },
  {
    id: 11155111,
    name: "Sepolia Testnet",
    shortName: "Sepolia",
    nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://sepolia.infura.io/v3/"],
    blockExplorerUrls: ["https://sepolia.etherscan.io"],
    color: "#FF6B35",
  },
  {
    id: 137,
    name: "Polygon Mainnet",
    shortName: "Polygon",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    rpcUrls: ["https://polygon-rpc.com"],
    blockExplorerUrls: ["https://polygonscan.com"],
    color: "#8247E5",
  },
  {
    id: 56,
    name: "BNB Smart Chain",
    shortName: "BSC",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    rpcUrls: ["https://bsc-dataseed.binance.org"],
    blockExplorerUrls: ["https://bscscan.com"],
    color: "#F3BA2F",
  },
  {
    id: 42161,
    name: "Arbitrum One",
    shortName: "Arbitrum",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://arb1.arbitrum.io/rpc"],
    blockExplorerUrls: ["https://arbiscan.io"],
    color: "#28A0F0",
  },
  {
    id: 10,
    name: "Optimism",
    shortName: "Optimism",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://mainnet.optimism.io"],
    blockExplorerUrls: ["https://optimistic.etherscan.io"],
    color: "#FF0420",
  },
];

interface ChainSwitcherProps {
  /** 显示模式 */
  variant?: "default" | "compact" | "icon-only";
  /** 按钮尺寸 */
  size?: "default" | "sm" | "lg" | "icon";
  /** 自定义类名 */
  className?: string;
  /** 支持的链列表，默认使用 SUPPORTED_CHAINS */
  supportedChains?: ChainConfig[];
  /** 链切换成功回调 */
  onChainChanged?: (chainId: number, chainConfig: ChainConfig) => void;
  /** 链切换失败回调 */
  onChainError?: (error: Error) => void;
  /** 是否显示测试网 */
  showTestnets?: boolean;
}

const ChainSwitcher = ({
  variant = "default",
  size = "default",
  className = "",
  supportedChains = SUPPORTED_CHAINS,
  onChainChanged,
  onChainError,
  showTestnets = true,
}: ChainSwitcherProps) => {
  const { chainID, switchChain, isConnected, provider } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingChainId, setLoadingChainId] = useState<number | null>(null);

  // 获取当前链配置
  const getCurrentChain = (): ChainConfig | undefined => {
    if (!chainID) return undefined;
    return supportedChains.find((chain) => chain.id === parseInt(chainID));
  };

  // 过滤链列表
  const getFilteredChains = (): ChainConfig[] => {
    const testnetIds = [11155111, 5, 80001]; // Sepolia, Goerli, Mumbai

    if (showTestnets) {
      return supportedChains;
    }

    return supportedChains.filter((chain) => !testnetIds.includes(chain.id));
  };

  // 切换链
  const handleSwitchChain = async (targetChain: ChainConfig) => {
    if (!isConnected || !provider) {
      onChainError?.(new Error("钱包未连接"));
      return;
    }

    if (parseInt(chainID) === targetChain.id) {
      return; // 已经是目标链
    }

    setIsLoading(true);
    setLoadingChainId(targetChain.id);

    try {
      // 尝试切换到目标链
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [
          { chainId: `0x${targetChain.id.toString(16)}` } as SwitchChainParams,
        ],
      });

      // 更新内部状态
      await switchChain(targetChain.id);

      onChainChanged?.(targetChain.id, targetChain);
    } catch (error: unknown) {
      console.error("切换链失败:", error);

      const walletError = error as WalletError;

      // 如果链不存在，尝试添加链
      if (walletError.code === 4902) {
        try {
          await addChainToWallet(targetChain);
          await switchChain(targetChain.id);
          onChainChanged?.(targetChain.id, targetChain);
        } catch (addError) {
          console.error("添加链失败:", addError);
          onChainError?.(
            addError instanceof Error ? addError : new Error("添加链失败")
          );
        }
      } else {
        onChainError?.(
          walletError instanceof Error ? walletError : new Error("切换链失败")
        );
      }
    } finally {
      setIsLoading(false);
      setLoadingChainId(null);
    }
  };

  // 添加链到钱包
  const addChainToWallet = async (chain: ChainConfig) => {
    if (!provider) throw new Error("Provider 不可用");

    const chainParams: AddChainParams = {
      chainId: `0x${chain.id.toString(16)}`,
      chainName: chain.name,
      nativeCurrency: chain.nativeCurrency,
      rpcUrls: chain.rpcUrls,
      blockExplorerUrls: chain.blockExplorerUrls,
    };

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [chainParams],
    });
  };

  // 渲染链图标
  const renderChainIcon = (
    chain: ChainConfig,
    iconSize: "sm" | "md" | "lg" = "md"
  ) => {
    const sizeMap = {
      sm: "w-4 h-4",
      md: "w-5 h-5",
      lg: "w-6 h-6",
    };

    return (
      <div
        className={cn(
          "rounded-full flex items-center justify-center text-white font-bold text-xs",
          sizeMap[iconSize]
        )}
        style={{ backgroundColor: chain.color || "#666" }}
      >
        {chain.shortName.charAt(0)}
      </div>
    );
  };

  // 如果未连接，不显示
  if (!isConnected) {
    return null;
  }

  const currentChain = getCurrentChain();
  const filteredChains = getFilteredChains();

  // 图标模式
  if (variant === "icon-only") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size={size}
            className={cn("p-2", className)}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : currentChain ? (
              renderChainIcon(currentChain, "sm")
            ) : (
              <AlertCircle className="w-4 h-4 text-yellow-500" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {filteredChains.map((chain) => (
            <DropdownMenuItem
              key={chain.id}
              onClick={() => handleSwitchChain(chain)}
              disabled={loadingChainId === chain.id}
              className="flex items-center gap-3"
            >
              {loadingChainId === chain.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                renderChainIcon(chain, "sm")
              )}
              <span>{chain.shortName}</span>
              {currentChain?.id === chain.id && (
                <Check className="w-4 h-4 ml-auto text-green-500" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // 紧凑模式
  if (variant === "compact") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size={size}
            className={cn("flex items-center gap-2", className)}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : currentChain ? (
              <>
                {renderChainIcon(currentChain, "sm")}
                <span className="hidden sm:inline">
                  {currentChain.shortName}
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                <span className="hidden sm:inline">未知链</span>
              </>
            )}
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {filteredChains.map((chain) => (
            <DropdownMenuItem
              key={chain.id}
              onClick={() => handleSwitchChain(chain)}
              disabled={loadingChainId === chain.id}
              className="flex items-center gap-3"
            >
              {loadingChainId === chain.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                renderChainIcon(chain, "sm")
              )}
              <span>{chain.shortName}</span>
              {currentChain?.id === chain.id && (
                <Check className="w-4 h-4 ml-auto text-green-500" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // 默认模式
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={size}
          className={cn("flex items-center gap-2 min-w-[120px]", className)}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>切换中...</span>
            </>
          ) : currentChain ? (
            <>
              {renderChainIcon(currentChain)}
              <span>{currentChain.shortName}</span>
              <ChevronDown className="w-4 h-4 ml-auto" />
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              <span>未知链</span>
              <ChevronDown className="w-4 h-4 ml-auto" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          选择网络
        </div>
        <DropdownMenuSeparator />
        {filteredChains.map((chain) => (
          <DropdownMenuItem
            key={chain.id}
            onClick={() => handleSwitchChain(chain)}
            disabled={loadingChainId === chain.id}
            className="flex items-center gap-3 py-2"
          >
            {loadingChainId === chain.id ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              renderChainIcon(chain)
            )}
            <div className="flex-1">
              <div className="font-medium">{chain.shortName}</div>
              <div className="text-xs text-muted-foreground">{chain.name}</div>
            </div>
            {currentChain?.id === chain.id && (
              <Check className="w-4 h-4 text-green-500" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ChainSwitcher;
