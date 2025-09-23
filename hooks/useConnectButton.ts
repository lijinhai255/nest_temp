// hooks/useConnectButton.ts - 修复依赖和类型问题

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/provider/index";
import { ChainConfig } from "@/components/ChainSwitcher";
import { ConnectButtonState } from "@/types/connect-button";

// 🔧 定义错误类型，替换 any
interface WalletError extends Error {
  code?: number;
  data?: unknown;
}

export const useConnectButton = (
  showBalance: boolean,
  onConnect?: () => void,
  onDisConnect?: () => void,
  onChainChange?: (chainId: number, chainConfig?: ChainConfig) => void,
  onBalanceChange?: (balance: string) => void
) => {
  const wallet = useWallet();
  const [state, setState] = useState<ConnectButtonState>({
    isChainSwitching: false,
    switchingChainId: null,
    copied: false,
  });

  // 🔧 使用 useCallback 包装回调函数，避免依赖问题
  const handleBalanceChange = useCallback((balance: string) => {
    onBalanceChange?.(balance);
  }, [onBalanceChange]);

  const handleChainChangeCallback = useCallback((chainId: number, chainConfig?: ChainConfig) => {
    onChainChange?.(chainId, chainConfig);
  }, [onChainChange]);

  const handleConnectCallback = useCallback(() => {
    onConnect?.();
  }, [onConnect]);

  const handleDisconnectCallback = useCallback(() => {
    onDisConnect?.();
  }, [onDisConnect]);

  // 🔧 监听全局余额变化并触发回调
  useEffect(() => {
    if (wallet.isConnected && showBalance && wallet.balance) {
      handleBalanceChange(wallet.balance);
    }
  }, [wallet.balance, wallet.isConnected, showBalance, handleBalanceChange]);

  // 🔧 修复缺失的依赖 - 添加 wallet 到依赖数组
  useEffect(() => {
    if (wallet.isConnected && showBalance && wallet.fetchBalance) {
      const timer = setTimeout(() => {
        wallet.fetchBalance();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [wallet.isConnected, wallet.fetchBalance, showBalance]); // 🔧 添加所有使用的依赖

  // 🔧 使用 useCallback 包装处理函数
  const handleConnect = useCallback(() => {
    if (wallet.isConnected) return;
    wallet.openModal();
    handleConnectCallback();
  }, [wallet.isConnected, wallet.openModal, handleConnectCallback]);

  // 🔧 处理断开连接
  const handleDisconnect = useCallback(async () => {
    try {
      await wallet.disconnect();
      handleDisconnectCallback();
    } catch (error) {
      console.error("断开连接失败:", error);
    }
  }, [wallet.disconnect, handleDisconnectCallback]);

  // 🔧 处理链切换
  const handleChainSwitch = useCallback(async (targetChain: ChainConfig) => {
    if (!wallet.isConnected || !wallet.provider) return;
    if (parseInt(wallet.chainID) === targetChain.id) return;

    setState(prev => ({
      ...prev,
      isChainSwitching: true,
      switchingChainId: targetChain.id,
    }));

    try {
      await wallet.provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${targetChain.id.toString(16)}` }],
      });

      await wallet.switchChain(targetChain.id);
      handleChainChangeCallback(targetChain.id, targetChain);

      if (showBalance && wallet.fetchBalance) {
        setTimeout(() => {
          wallet.fetchBalance();
        }, 1000);
      }
    } catch (error: unknown) { // 🔧 使用 unknown 替代 any
      console.error("切换链失败:", error);

      // 🔧 类型守卫检查错误类型
      const walletError = error as WalletError;
      if (walletError.code === 4902) {
        try {
          await wallet.provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${targetChain.id.toString(16)}`,
                chainName: targetChain.name,
                nativeCurrency: targetChain.nativeCurrency,
                rpcUrls: targetChain.rpcUrls,
                blockExplorerUrls: targetChain.blockExplorerUrls,
              },
            ],
          });
          await wallet.switchChain(targetChain.id);
          handleChainChangeCallback(targetChain.id, targetChain);

          if (showBalance && wallet.fetchBalance) {
            setTimeout(() => {
              wallet.fetchBalance();
            }, 1000);
          }
        } catch (addError) {
          console.error("添加链失败:", addError);
        }
      }
    } finally {
      setState(prev => ({
        ...prev,
        isChainSwitching: false,
        switchingChainId: null,
      }));
    }
  }, [
    wallet.isConnected,
    wallet.provider,
    wallet.chainID,
    wallet.switchChain,
    wallet.fetchBalance,
    showBalance,
    handleChainChangeCallback,
  ]);

  // 🔧 复制地址
  const copyAddress = useCallback(async () => {
    if (wallet.address) {
      try {
        await navigator.clipboard.writeText(wallet.address);
        setState(prev => ({ ...prev, copied: true }));
        setTimeout(() => {
          setState(prev => ({ ...prev, copied: false }));
        }, 2000);
      } catch (error) {
        console.error("复制失败:", error);
      }
    }
  }, [wallet.address]);

  return {
    wallet,
    state,
    handleConnect,
    handleDisconnect,
    handleChainSwitch,
    copyAddress,
  };
};
