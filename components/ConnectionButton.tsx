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

  // 如果未连接，显示连接按钮
  if (!wallet.isConnected) {
    return (
      <ConnectButton
        label={label}
        size={size}
        className={className}
        isConnecting={wallet.isConnecting}
        onClick={handleConnect}
      />
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
  );
};

export default EnhancedConnectButton;
