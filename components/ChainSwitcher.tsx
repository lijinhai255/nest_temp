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
    rpcUrls: ["https://eth-mainnet.g.alchemy.com/v2/p5JIj-51cNP2_wpd4VW3G"],
    blockExplorerUrls: ["https://etherscan.io"],
    color: "#627EEA",
  },
  {
    id: 11155111,
    name: "Sepolia Testnet",
    shortName: "Sepolia",
    nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://eth-sepolia.g.alchemy.com/v2/p5JIj-51cNP2_wpd4VW3G"],
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

  console.log("🔗 ChainSwitcher 组件状态:", {
    chainID,
    isConnected,
    provider: !!provider,
    variant,
    showTestnets,
    supportedChainsCount: supportedChains.length,
  });

  // 获取当前链配置
  const getCurrentChain = (): ChainConfig | undefined => {
    if (!chainID) {
      console.log("⚠️ getCurrentChain: chainID 为空");
      return undefined;
    }

    const currentChain = supportedChains.find(
      (chain) => chain.id === parseInt(chainID)
    );
    console.log("🔍 getCurrentChain:", {
      chainID,
      parsedChainID: parseInt(chainID),
      foundChain: currentChain ? currentChain.shortName : "未找到",
      allSupportedChains: supportedChains.map((c) => ({
        id: c.id,
        name: c.shortName,
      })),
    });

    return currentChain;
  };

  // 过滤链列表
  const getFilteredChains = (): ChainConfig[] => {
    const testnetIds = [11155111, 5, 80001]; // Sepolia, Goerli, Mumbai

    const filtered = showTestnets
      ? supportedChains
      : supportedChains.filter((chain) => !testnetIds.includes(chain.id));

    console.log("🔽 getFilteredChains:", {
      showTestnets,
      testnetIds,
      totalChains: supportedChains.length,
      filteredChains: filtered.length,
      filteredList: filtered.map((c) => ({ id: c.id, name: c.shortName })),
    });

    return filtered;
  };

  // 切换链
  const handleSwitchChain = async (targetChain: ChainConfig) => {
    console.log("🚀 开始切换链:", {
      targetChain: targetChain.shortName,
      targetChainId: targetChain.id,
      currentChainId: chainID,
      isConnected,
      hasProvider: !!provider,
    });

    if (!isConnected || !provider) {
      const error = new Error("钱包未连接");
      console.error("❌ 钱包连接检查失败:", {
        isConnected,
        hasProvider: !!provider,
      });
      onChainError?.(error);
      return;
    }

    if (parseInt(chainID) === targetChain.id) {
      console.log("ℹ️ 已经在目标链上，无需切换:", targetChain.shortName);
      return; // 已经是目标链
    }

    setIsLoading(true);
    setLoadingChainId(targetChain.id);
    console.log("⏳ 设置加载状态:", {
      isLoading: true,
      loadingChainId: targetChain.id,
    });

    try {
      const hexChainId = `0x${targetChain.id.toString(16)}`;
      console.log("🔄 尝试切换链 - wallet_switchEthereumChain:", {
        method: "wallet_switchEthereumChain",
        chainId: hexChainId,
        targetChain: targetChain.shortName,
      });

      // 尝试切换到目标链
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexChainId } as SwitchChainParams],
      });

      console.log("✅ wallet_switchEthereumChain 成功");

      // 更新内部状态
      console.log("🔄 调用内部 switchChain 方法:", targetChain.id);
      await switchChain(targetChain.id);

      console.log("🎉 链切换完全成功:", {
        chainId: targetChain.id,
        chainName: targetChain.shortName,
      });

      onChainChanged?.(targetChain.id, targetChain);
    } catch (error: unknown) {
      console.error("❌ 切换链失败:", error);

      const walletError = error as WalletError;
      console.log("🔍 错误详情:", {
        errorCode: walletError.code,
        errorMessage: walletError.message,
        errorType: typeof error,
      });

      // 如果链不存在，尝试添加链
      if (walletError.code === 4902) {
        console.log("🔧 链不存在 (错误码 4902)，尝试添加链...");
        try {
          await addChainToWallet(targetChain);
          console.log("✅ 添加链成功，再次尝试切换...");
          await switchChain(targetChain.id);
          console.log("🎉 添加链后切换成功");
          onChainChanged?.(targetChain.id, targetChain);
        } catch (addError) {
          console.error("❌ 添加链失败:", addError);
          onChainError?.(
            addError instanceof Error ? addError : new Error("添加链失败")
          );
        }
      } else {
        console.error("❌ 其他切换链错误:", walletError);
        onChainError?.(
          walletError instanceof Error ? walletError : new Error("切换链失败")
        );
      }
    } finally {
      console.log("🏁 切换链流程结束，清理加载状态");
      setIsLoading(false);
      setLoadingChainId(null);
    }
  };

  // 添加链到钱包
  const addChainToWallet = async (chain: ChainConfig) => {
    console.log("➕ 开始添加链到钱包:", chain.shortName);

    if (!provider) {
      console.error("❌ Provider 不可用");
      throw new Error("Provider 不可用");
    }

    const chainParams: AddChainParams = {
      chainId: `0x${chain.id.toString(16)}`,
      chainName: chain.name,
      nativeCurrency: chain.nativeCurrency,
      rpcUrls: chain.rpcUrls,
      blockExplorerUrls: chain.blockExplorerUrls,
    };

    console.log("📝 添加链参数:", chainParams);

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [chainParams],
    });

    console.log("✅ wallet_addEthereumChain 调用成功");
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
    console.log("🚫 钱包未连接，不显示 ChainSwitcher");
    return null;
  }

  const currentChain = getCurrentChain();
  const filteredChains = getFilteredChains();

  console.log("🎨 渲染 ChainSwitcher:", {
    variant,
    currentChain: currentChain ? currentChain.shortName : "未知",
    filteredChainsCount: filteredChains.length,
    isLoading,
    loadingChainId,
  });

  // 图标模式
  if (variant === "icon-only") {
    console.log("🎯 渲染图标模式");
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
              onClick={() => {
                console.log("🖱️ 点击链选项 (图标模式):", chain.shortName);
                handleSwitchChain(chain);
              }}
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
    console.log("🎯 渲染紧凑模式");
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
              onClick={() => {
                console.log("🖱️ 点击链选项 (紧凑模式):", chain.shortName);
                handleSwitchChain(chain);
              }}
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
  console.log("🎯 渲染默认模式");
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
            onClick={() => {
              console.log("🖱️ 点击链选项 (默认模式):", chain.shortName);
              handleSwitchChain(chain);
            }}
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