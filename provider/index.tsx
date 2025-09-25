"use client";

import {
  ExtendedWallet,
  WalletContextValue,
  WalletProviderProps,
  WalletState,
  DetectedWallet,
  WalletConnectionResult,
} from "@/types/provider";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import WalletConnectModal from "@/components/WalletConnectModal";
import { projectId } from "@/wagmi";
import { walletManager, initializeWallets } from "@/lib/walletManager";
import {
  useAccount,
  useBalance,
  useChainId,
  useDisconnect,
  usePublicClient,
} from "wagmi";
import { Address, formatEther, formatUnits } from "viem";
import erc20ABI from "@/lib/abi/erc20Abi.json";
// 导入工具函数
import {
  WalletDeduplicator,
  SignerFactory,
  WalletConverter,
  WalletFinder,
  IconLoader,
} from "@/lib/wallets/utils";
import WalletDebugger from "@/utils/walletDebug";
const WalletContext = createContext<WalletContextValue>({
  isConnecting: false,
  isConnected: false,
  isDisconnected: true,
  isReconnecting: false,
  address: "0x",
  chainID: "-1",
  ensName: null,
  error: null,
  chains: [],
  provider: undefined,
  balance: "0.0000",
  connect: async () => ({
    success: false,
    address: "0x",
    wallet: { id: "", name: "", installed: false },
  }),
  disconnect: async () => {},
  switchChain: async () => {},
  openModal: () => {},
  closeModal: () => {},
  walletInstances: undefined,
  fetchBalance: async () => {},
  balanceLoading: false,
  // 添加新的 getTokenBalance 方法的默认实现
  getTokenBalance: async () => ({
    balance: "0",
    decimals: 18,
    symbol: "",
    loading: false,
    error: "钱包未连接",
  }),
});

const WalletProvider: React.FC<WalletProviderProps> = ({
  children,
  chains,
  provider,
  autoConnect,
  wallets,
}) => {
  const [state, setState] = useState<WalletState>({
    address: "0x",
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
  const { address: wagmiAddress, isConnected: wagmiConnected, connector: wagmiConnector } = useAccount();
  const wagmiChainId = useChainId();
  // 存储当前的钱包
  const [currentWalletId, setCurrentWalletId] = useState("");
  // 🆕 新增 useDisconnect hook
  const { disconnect: wagmiDisconnect } = useDisconnect();
  // 获取 wagmi 的 publicClient
  const publicClient = usePublicClient();
  // 添加自动连接已尝试的标志
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);

  // 创建 tokenBalanceCache 来缓存代币余额信息
  const [tokenBalanceCache, setTokenBalanceCache] = useState<{
    [tokenAddress: string]: {
      balance: string;
      decimals: number;
      symbol: string;
      lastUpdated: number;
    };
  }>({});
  // 获取代币余额的方法
  const getTokenBalance = useCallback(
    async (tokenAddress: Address) => {
      // 默认返回值
      const defaultResult = {
        balance: "0",
        decimals: 18,
        symbol: "",
        loading: false,
        error: null as string | null,
      };

      // 如果钱包未连接或地址为空，返回默认值
      if (!state.isConnected || !state.address) {
        return { ...defaultResult, error: "钱包未连接" };
      }

      // 如果没有 publicClient，返回默认值
      if (!publicClient) {
        return { ...defaultResult, error: "网络客户端未初始化" };
      }

      try {
        // 设置加载状态
        const loadingResult = { ...defaultResult, loading: true };

        // 检查缓存
        const cacheKey = `${tokenAddress.toLowerCase()}-${state.address.toLowerCase()}`;
        const cachedData = tokenBalanceCache[cacheKey];
        const now = Date.now();

        // 如果缓存存在且未过期（30秒内），直接使用缓存
        if (cachedData && now - cachedData.lastUpdated < 30000) {
          return {
            balance: cachedData.balance,
            decimals: cachedData.decimals,
            symbol: cachedData.symbol,
            loading: false,
            error: null,
          };
        }

        // 并行获取代币信息
        const [balanceResult, decimalsResult, symbolResult] = await Promise.all(
          [
            // 获取余额
            publicClient.readContract({
              address: tokenAddress,
              abi: erc20ABI,
              functionName: "balanceOf",
              args: [state.address as `0x${string}`],
            }),
            // 获取小数位数
            publicClient.readContract({
              address: tokenAddress,
              abi: erc20ABI,
              functionName: "decimals",
            }),
            // 获取代币符号
            publicClient.readContract({
              address: tokenAddress,
              abi: erc20ABI,
              functionName: "symbol",
            }),
          ]
        );

        // 格式化余额
        const decimals = Number(decimalsResult);
        const balance = formatUnits(balanceResult as bigint, decimals);
        const symbol = symbolResult as string;

        // 更新缓存
        setTokenBalanceCache((prev) => ({
          ...prev,
          [cacheKey]: {
            balance,
            decimals,
            symbol,
            lastUpdated: now,
          },
        }));

        // 返回结果
        return {
          balance,
          decimals,
          symbol,
          loading: false,
          error: null,
        };
      } catch (error) {
        console.error(`获取代币 ${tokenAddress} 余额失败:`, error);
        return {
          ...defaultResult,
          error: error instanceof Error ? error.message : "获取代币余额失败",
        };
      }
    },
    [state.isConnected, state.address, publicClient, tokenBalanceCache]
  );

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

  // 🚀 简化的钱包连接函数 - 统一使用 EIP-6963 标准
  const connectWallet = async (
    walletId: string
  ): Promise<WalletConnectionResult> => {
    console.log("🚀 开始连接钱包:", walletId, walletInstances["已安装的钱包"]);

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
      // 统一使用 walletManager 进行连接
      // walletManager 内部会处理 EIP-6963 和其他连接方式
      const result = await walletManager.connectWallet(walletId);
      setCurrentWalletId(walletId);
      return await handleConnectionSuccess(result, walletId);
    } catch (error) {
      console.error("❌ 连接钱包失败:", error);
      return await handleConnectionError(error, walletId);
    }
  };

  // 在 WalletProvider 组件中修复 disconnect 函数
  const disconnect = async (): Promise<void> => {
    console.log("🔌 开始断开钱包连接", {
      walletId: currentWalletId,
    });

    try {
      // 🆕 首先调用 wagmi 的断开连接方法
      wagmiDisconnect();

      // 🔧 调用 walletManager 的断开连接方法
      await walletManager.disconnectWallet(currentWalletId);
    } catch (error) {
      console.warn("⚠️ 断开钱包连接器时出错:", error);
      // 不抛出错误，因为断开连接失败不应该阻止清理流程
    }

    // 🧹 清理本地存储
    if (typeof window !== "undefined") {
      localStorage.removeItem("lastConnectedWallet");
      localStorage.removeItem("walletAddress");
      localStorage.removeItem("lastConnectionTime");
      console.log("🧹 已清理本地存储");
    }

    // 🔄 重置状态
    setState((prev) => ({
      ...prev,
      isConnected: false,
      isDisconnected: true,
      address: "0x",
      chainID: "-1",
      wallet: undefined,
      signer: undefined,
      balance: "0.0000",
      isConnecting: false,
      error: null,
    }));

    // 🔄 重置当前钱包ID
    setCurrentWalletId("");

    // 🧹 清理代币余额缓存
    setTokenBalanceCache({});

    console.log("✅ 钱包断开连接完成");
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
      address: result.address as unknown as Address,
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

      // 🔄 额外保存时间戳，用于调试连接状态
      localStorage.setItem("lastConnectionTime", Date.now().toString());
    }

    closeModal();

    // 🔄 确保 wagmi 状态已经同步
    // 注意：这里延迟一下让 wagmi 状态更新
    setTimeout(() => {
      if (!wagmiConnected || wagmiAddress !== result.address) {
        console.log("⚠️ Wagmi 状态未同步，可能需要手动刷新页面");
      }
    }, 1000);

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
    let errorMessage = "连接钱包时发生未知错误";

    if (error instanceof Error) {
      errorMessage = error.message;

      // 检查是否是用户拒绝授权的错误
      const errorStr = error.message.toLowerCase();
      if (
        errorStr.includes("user rejected") ||
        errorStr.includes("user denied") ||
        errorStr.includes("user cancelled") ||
        errorStr.includes("拒绝") ||
        errorStr.includes("取消")
      ) {
        errorMessage = "用户拒绝了授权请求";
        console.log("ℹ️ 用户拒绝了钱包授权请求", walletId);
      }
    }

    setState((prev) => ({
      ...prev,
      isConnecting: false,
      isConnected: false,
      isDisconnected: true,
      error: new Error(errorMessage),
      address: "0x",
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

  // 🔄 同步 wagmi 状态到自定义状态
  useEffect(() => {
    if (wagmiConnected && wagmiAddress) {
      console.log("🔄 Wagmi 状态变化，同步到自定义状态:", { wagmiConnected, wagmiAddress, wagmiChainId });

      setState((prev) => ({
        ...prev,
        isConnected: true,
        isDisconnected: false,
        address: wagmiAddress as Address,
        chainID: wagmiChainId?.toString() || prev.chainID,
        isConnecting: false,
        error: null,
      }));

      // 如果有 wagmi connector，尝试更新当前钱包ID
      if (wagmiConnector && !currentWalletId) {
        const connectorName = wagmiConnector.name.toLowerCase();
        const matchedWallet = Object.values(walletInstances).flat().find(
          wallet => wallet.name.toLowerCase().includes(connectorName) ||
                   wallet.id.toLowerCase().includes(connectorName)
        );

        if (matchedWallet) {
          setCurrentWalletId(matchedWallet.id);
          localStorage.setItem("lastConnectedWallet", matchedWallet.id);
        }
      }
    } else if (!wagmiConnected && state.isConnected) {
      // wagmi 断开了，同步断开状态
      setState((prev) => ({
        ...prev,
        isConnected: false,
        isDisconnected: true,
        address: "0x",
        chainID: "-1",
      }));
      setCurrentWalletId("");
    }
  }, [wagmiConnected, wagmiAddress, wagmiChainId, wagmiConnector]);

  // 🔄 自动连接逻辑 - 改进版本
  useEffect(() => {
    const attemptAutoConnect = async () => {
      // 如果已经连接或已经尝试过自动连接，则跳过
      if (wagmiConnected || autoConnectAttempted || !autoConnect) {
        return;
      }

      // 等待钱包检测完成
      if (walletsLoading) {
        return;
      }

      const lastConnectedWallet = localStorage.getItem("lastConnectedWallet");
      if (!lastConnectedWallet) {
        setAutoConnectAttempted(true);
        return;
      }

      console.log("🔄 尝试自动连接:", lastConnectedWallet);

      // 记录调试信息
      WalletDebugger.logDebugInfo({
        action: 'auto_connect_start',
        lastConnectedWallet,
        walletsLoading,
        walletInstancesCount: Object.keys(walletInstances).length
      });

      try {
        // 检查该钱包是否还存在
        const walletExists = Object.values(walletInstances).flat().some(
          wallet => wallet.id === lastConnectedWallet
        ) || detectedWallets.some(wallet => wallet.id === lastConnectedWallet);

        if (walletExists) {
          await connectWallet(lastConnectedWallet);

          // 连接后再次记录调试信息
          setTimeout(() => {
            WalletDebugger.logDebugInfo({
              action: 'auto_connect_complete',
              success: true,
              wagmiConnected,
              customConnected: state.isConnected
            });
          }, 1000);
        } else {
          console.log("🔄 上次连接的钱包不存在，清理存储");
          localStorage.removeItem("lastConnectedWallet");
          localStorage.removeItem("walletAddress");
          localStorage.removeItem("lastConnectionTime");
        }
      } catch (error) {
        console.warn("自动连接失败:", error);
        // 清理可能损坏的存储
        localStorage.removeItem("lastConnectedWallet");
        localStorage.removeItem("walletAddress");
        localStorage.removeItem("lastConnectionTime");

        // 记录错误信息
        WalletDebugger.logDebugInfo({
          action: 'auto_connect_error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      } finally {
        setAutoConnectAttempted(true);
      }
    };

    attemptAutoConnect();
  }, [autoConnect, walletsLoading, walletInstances, detectedWallets, autoConnectAttempted, wagmiConnected]);

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
    getTokenBalance, // 添加新方法到上下文
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
