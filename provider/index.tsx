"use client";

import {
  ExtendedWallet,
  WalletContextValue,
  WalletProviderProps,
  WalletState,
  DetectedWallet,
  WalletConnectionResult,
} from "@/types/provider";
import { createContext, useContext, useEffect, useState } from "react";
import WalletConnectModal from "@/components/WalletConnectModal";
import { projectId } from "@/wagmi";
import { walletManager, initializeWallets } from "@/lib/walletManager";
import { getWalletConfig } from "@/lib/wallets/registry";
import { useAccount, useBalance, useChainId } from "wagmi";
import { formatEther } from "viem";

// 导入工具函数
import {
  WalletDeduplicator,
  SignerFactory,
  WalletConverter,
  WalletFinder,
  IconLoader,
} from "@/lib/wallets/utils";
import { ConfiguredWalletConnector } from "@/lib/wallets/connectors/configuredWalletConnector";

const WalletContext = createContext<WalletContextValue>({
  isConnecting: false,
  isConnected: false,
  isDisconnected: true,
  isReconnecting: false,
  address: "",
  chainID: "-1",
  ensName: null,
  error: null,
  chains: [],
  provider: undefined,
  balance: "0.0000",
  connect: async () => ({
    success: false,
    address: "",
    wallet: { id: "", name: "", installed: false },
  }),
  disconnect: async () => {},
  switchChain: async () => {},
  openModal: () => {},
  closeModal: () => {},
  walletInstances: undefined,
  fetchBalance: async () => {},
  balanceLoading: false,
});

const WalletProvider: React.FC<WalletProviderProps> = ({
  children,
  chains,
  provider,
  autoConnect,
  wallets,
}) => {
  const [state, setState] = useState<WalletState>({
    address: "",
    chainID: "-1",
    isConnecting: false,
    isConnected: false,
    isDisconnected: true,
    isReconnecting: false,
    ensName: null,
    error: null,
    chains: chains || [],
    provider: provider,
    balance: "0.0000", // 🆕 添加余额到全局状态
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detectedWallets, setDetectedWallets] = useState<DetectedWallet[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(true);
  const [walletInstances, setWalletInstances] = useState<{
    [groupName: string]: ExtendedWallet[];
  }>({});

  // 🆕 在组件内部使用 wagmi hooks
  const account = useAccount();
  const currentChainId = useChainId();

  // 🆕 使用 wagmi 的 useBalance hook
  const {
    data: balanceData,
    isError: balanceError,
    isLoading: balanceLoading,
    refetch: refetchBalance,
  } = useBalance({
    address: state.address as `0x${string}`,
    query: {
      refetchInterval: 30000, // 30秒自动刷新
      staleTime: 5000, // 5秒内认为数据是新鲜的
    },
  });

  // 🆕 监听 wagmi account 变化
  useEffect(() => {
    if (account.address && account.isConnected) {
      setState((prev) => ({
        ...prev,
        address: account.address || "",
        isConnected: account.isConnected,
        isDisconnected: !account.isConnected,
        isConnecting: account.isConnecting || false,
        isReconnecting: account.isReconnecting || false,
      }));
    } else if (account.isDisconnected) {
      setState((prev) => ({
        ...prev,
        address: "",
        isConnected: false,
        isDisconnected: true,
        isConnecting: false,
        isReconnecting: false,
        balance: "0.0000",
      }));
    }
  }, [
    account.address,
    account.isConnected,
    account.isDisconnected,
    account.isConnecting,
    account.isReconnecting,
  ]);

  // 🆕 监听链变化并更新状态
  useEffect(() => {
    if (currentChainId && state.isConnected) {
      console.log(`🔄 链已切换到: ${currentChainId}`);

      setState((prev) => ({
        ...prev,
        chainID: currentChainId.toString(),
        balance: "0.0000", // 先重置余额显示加载状态
      }));

      // 延迟一点时间再获取余额，确保链切换完成
      const timer = setTimeout(() => {
        refetchBalance();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [currentChainId, state.isConnected, refetchBalance]);

  // 🆕 监听余额数据变化并更新状态
  useEffect(() => {
    if (balanceData && state.isConnected) {
      const formattedBalance = parseFloat(
        formatEther(balanceData.value)
      ).toFixed(4);
      console.log(`💰 余额已更新: ${formattedBalance} ${balanceData.symbol}`);

      setState((prev) => ({
        ...prev,
        balance: formattedBalance,
      }));
    } else if (balanceError) {
      console.error("获取余额失败:", balanceError);
      setState((prev) => ({
        ...prev,
        balance: "0.0000",
      }));
    }
  }, [balanceData, balanceError, state.isConnected]);

  // 🚀 增强的钱包连接函数
  const connectWallet = async (
    walletId: string
  ): Promise<WalletConnectionResult> => {
    console.log("🚀 开始连接钱包:", walletId);

    if (!walletId) {
      throw new Error("钱包 ID 不能为空");
    }

    setState((prev) => ({
      ...prev,
      isConnecting: true,
      isDisconnected: false,
      error: null,
    }));

    try {
      // 1. 首先尝试从检测到的钱包中连接
      const detectedWallet = detectedWallets.find((w) => w.id === walletId);
      console.log("detectedWallet", detectedWallet);
      if (detectedWallet) {
        console.log("📱 使用检测到的钱包连接:", detectedWallet.name);
        const result = await walletManager.connectWallet(walletId);
        return await handleConnectionSuccess(result, walletId);
      }

      // 2. 如果不是检测到的钱包，检查是否是配置的钱包
      const configuredWallet = WalletFinder.findById(walletId, walletInstances);
      if (configuredWallet) {
        console.log("⚙️ 使用配置的钱包连接:", configuredWallet.name);
        const result = await ConfiguredWalletConnector.connect(
          configuredWallet
        );
        return await handleConnectionSuccess(result, walletId);
      }

      // 3. 最后尝试通过钱包注册表连接
      const walletConfig = getWalletConfig(walletId);
      if (walletConfig) {
        console.log("📋 使用注册表钱包连接:", walletConfig.name);
        const result = await walletManager.connectWallet(walletId);
        return await handleConnectionSuccess(result, walletId);
      }

      throw new Error(`未找到钱包: ${walletId}`);
    } catch (error) {
      console.error("❌ 连接钱包失败:", error);
      return await handleConnectionError(error, walletId);
    }
  };

  // 🔧 处理连接成功的逻辑
  const handleConnectionSuccess = async (
    result: WalletConnectionResult,
    walletId: string
  ): Promise<WalletConnectionResult> => {
    console.log("✅ 钱包连接成功:", result);

    // 安全转换 signer
    const safeSigner = SignerFactory.ensureSafe(result.signer);

    setState((prev) => ({
      ...prev,
      isConnecting: false,
      isConnected: true,
      isDisconnected: false,
      address: result.address,
      chainID: result.chainId?.toString() || prev.chainID,
      wallet: result.wallet,
      provider: safeSigner?.provider || result.provider,
      signer: safeSigner,
      error: null,
    }));

    // 保存连接状态
    if (typeof window !== "undefined") {
      localStorage.setItem("lastConnectedWallet", walletId);
      localStorage.setItem("walletAddress", result.address || "");
    }

    closeModal();

    return {
      ...result,
      signer: safeSigner,
    };
  };

  // 🔧 处理连接错误的逻辑
  const handleConnectionError = async (
    error: unknown,
    walletId: string
  ): Promise<never> => {
    const errorMessage =
      error instanceof Error ? error.message : "连接钱包时发生未知错误";

    setState((prev) => ({
      ...prev,
      isConnecting: false,
      isConnected: false,
      isDisconnected: true,
      error: new Error(errorMessage),
      address: "",
      chainID: "-1",
      wallet: undefined,
      provider: undefined,
      signer: undefined,
    }));

    throw new Error(errorMessage);
  };

  // 初始化钱包检测
  useEffect(() => {
    const initWallets = async () => {
      try {
        setWalletsLoading(true);
        console.log("🔄 开始初始化钱包检测...");

        // 1. 动态检测钱包
        const discovered =
          (await initializeWallets()) as unknown as DetectedWallet[];
        console.log("🔍 原始检测结果:", discovered);

        // 2. 构建配置的钱包实例
        const configuredWalletInstances: {
          [groupName: string]: ExtendedWallet[];
        } = {};
        if (wallets && projectId) {
          wallets.forEach((group) => {
            if (group.groupName) {
              configuredWalletInstances[group.groupName] = group.wallets.map(
                (createWallFn) => {
                  const wallet = createWallFn({
                    projectId,
                    appName: "YC Directory",
                  });
                  // 异步加载图标
                  IconLoader.loadWalletIcon(wallet, () => {
                    setWalletInstances((prev) => ({ ...prev }));
                  });
                  return wallet;
                }
              );
            }
          });
        }

        // 3. 去重处理
        const { filtered: filteredDetected, staticFiltered } =
          WalletDeduplicator.deduplicate(discovered, configuredWalletInstances);

        setDetectedWallets(filteredDetected);

        // 4. 构建最终的钱包实例
        const unifiedInstances: { [groupName: string]: ExtendedWallet[] } = {};

        // 添加检测到的钱包组
        if (filteredDetected.length > 0) {
          unifiedInstances["已安装的钱包"] =
            WalletConverter.batchDetectedToExtended(filteredDetected);
        }

        // 添加过滤后的配置钱包组
        Object.entries(staticFiltered).forEach(
          ([groupName, walletsInGroup]) => {
            if (walletsInGroup.length > 0) {
              unifiedInstances[groupName] = walletsInGroup;
            }
          }
        );

        console.log("📦 最终钱包实例:", unifiedInstances);
        setWalletInstances(unifiedInstances);
      } catch (error) {
        console.error("❌ 钱包初始化失败:", error);
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error : new Error("钱包初始化失败"),
        }));
      } finally {
        setWalletsLoading(false);
      }
    };

    initWallets();
  }, [wallets, projectId]);

  const disconnect = async (): Promise<void> => {
    setState((prev) => ({
      ...prev,
      isConnected: false,
      isDisconnected: true,
      address: "",
      chainID: "-1",
      wallet: undefined,
      signer: undefined,
      balance: "0.0000",
    }));

    if (typeof window !== "undefined") {
      localStorage.removeItem("lastConnectedWallet");
      localStorage.removeItem("walletAddress");
    }
  };

  const switchChain = async (chainId: number): Promise<void> => {
    setState((prev) => ({
      ...prev,
      chainID: chainId.toString(),
    }));
  };

  const openModal = (): void => {
    setIsModalOpen(true);
  };

  const closeModal = (): void => {
    setIsModalOpen(false);
  };

  // 🆕 手动刷新余额的函数
  const fetchBalance = async (): Promise<void> => {
    if (!state.isConnected || !state.address) return;

    try {
      await refetchBalance();
    } catch (error) {
      console.error("手动刷新余额失败:", error);
    }
  };

  // 自动连接逻辑
  useEffect(() => {
    if (autoConnect && !walletsLoading && detectedWallets.length > 0) {
      const lastConnectedWallet = localStorage.getItem("lastConnectedWallet");
      if (lastConnectedWallet) {
        console.log("🔄 尝试自动连接:", lastConnectedWallet);
        connectWallet(lastConnectedWallet).catch((error) => {
          console.warn("自动连接失败:", error);
        });
      }
    }
  }, [autoConnect, walletsLoading, detectedWallets.length]);

  const value: WalletContextValue = {
    ...state,
    connect: connectWallet,
    disconnect,
    switchChain,
    openModal,
    closeModal,
    walletInstances,
    detectedWallets,
    walletsLoading,
    fetchBalance, // 🆕 暴露余额刷新函数
    balanceLoading, // 🆕 暴露余额加载状态
  };

  return (
    <WalletContext.Provider value={value}>
      {children}

      <WalletConnectModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSelectWallet={connectWallet}
        onClose={closeModal}
        walletInstances={value.walletInstances}
        detectedWallets={detectedWallets}
        walletsLoading={walletsLoading}
      />
    </WalletContext.Provider>
  );
};

export default WalletProvider;

export const useWallet = (): WalletContextValue => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
