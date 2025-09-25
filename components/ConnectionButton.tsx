"use client";

import { SUPPORTED_CHAINS } from "./ChainSwitcher";
import ChainSwitcher from "./ChainSwitcher";
import ConnectButton from "./ConnectButton";
import AccountDropdown from "./AccountDropdown";
import { useConnectButton } from "@/hooks/useConnectButton";
import {
  getCurrentChain,
  getFilteredChains,
} from "@/utils/connect-button-utils";
import { EnhancedConnectButtonProps } from "@/types/connect-button";
import { useState, useEffect } from "react";

// 连接按钮加载状态组件
function ConnectButtonFallback() {
  return (
    <div className="w-24 h-10 bg-gray-200 animate-pulse rounded-full" />
  );
}

// 延迟加载连接按钮组件
function DelayedConnectButton({ children }: { children: React.ReactNode }) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // 延迟 200ms 后再渲染连接按钮，让页面核心内容先显示
    const timer = setTimeout(() => {
      setShouldRender(true);
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  if (!shouldRender) {
    return <ConnectButtonFallback />;
  }

  return <>{children}</>;
}

const EnhancedConnectButton = ({
  label = "连接钱包",
  showBalance = false,
  size = "default",
  chainStatus = "none",
  accountStatus = "full",
  className = "",
  showChainSwitcher = true,
  supportedChains = SUPPORTED_CHAINS,
  showTestnets = true,
  onConnect,
  onDisConnect,
  onChainChange,
  onBalanceChange,
}: EnhancedConnectButtonProps) => {
  const {
    wallet,
    state,
    handleConnect,
    handleDisconnect,
    handleChainSwitch,
    copyAddress,
  } = useConnectButton(
    showBalance,
    onConnect,
    onDisConnect,
    onChainChange,
    onBalanceChange
  );

  // 优化：如果wallet还没有初始化，显示加载状态
  if (!wallet || wallet.isConnecting) {
    return <ConnectButtonFallback />;
  }

  // 如果未连接，显示延迟加载的连接按钮
  if (!wallet.isConnected) {
    return (
      <DelayedConnectButton>
        <ConnectButton
          label={label}
          size={size}
          className={className}
          isConnecting={wallet.isConnecting}
          onClick={handleConnect}
        />
      </DelayedConnectButton>
    );
  }

  const currentChain = getCurrentChain(wallet.chainID, supportedChains);
  const filteredChains = getFilteredChains(supportedChains, showTestnets);

  // 紧凑模式和图标模式
  if (size === "sm" || size === "icon") {
    return (
      <div className="flex items-center gap-2">
        {/* 链切换器（独立显示） */}
        {showChainSwitcher && (
          <ChainSwitcher
            variant="icon-only"
            size={size}
            supportedChains={supportedChains}
            showTestnets={showTestnets}
            onChainChanged={(chainId, chainConfig) => {
              console.log("chainId, chainConfig", chainId, chainConfig);
              onChainChange?.(chainId, chainConfig);
            }}
          />
        )}

        {/* 账户信息 */}
        <AccountDropdown
          address={wallet.address || ""}
          balance={wallet.balance}
          currentChain={currentChain}
          showBalance={showBalance}
          showChainSwitcher={false} // 在紧凑模式下，链切换器独立显示
          size={size}
          accountStatus={accountStatus}
          chainStatus={chainStatus}
          className={className}
          filteredChains={filteredChains}
          switchingChainId={state.switchingChainId}
          copied={state.copied}
          balanceLoading={wallet.balanceLoading}
          onChainSwitch={handleChainSwitch}
          onCopyAddress={copyAddress}
          onDisconnect={handleDisconnect}
          onFetchBalance={wallet.fetchBalance}
        />
      </div>
    );
  }

  // 默认和大尺寸模式
  return (
    <DelayedConnectButton>
      <AccountDropdown
        address={wallet.address || ""}
        balance={wallet.balance}
        currentChain={currentChain}
        showBalance={showBalance}
        showChainSwitcher={showChainSwitcher}
        size={size}
        accountStatus={accountStatus}
        chainStatus={chainStatus}
        className={className}
        filteredChains={filteredChains}
        switchingChainId={state.switchingChainId}
        copied={state.copied}
        balanceLoading={wallet.balanceLoading}
        onChainSwitch={handleChainSwitch}
        onCopyAddress={copyAddress}
        onDisconnect={handleDisconnect}
        onFetchBalance={wallet.fetchBalance}
      />
    </DelayedConnectButton>
  );
};

export default EnhancedConnectButton;
