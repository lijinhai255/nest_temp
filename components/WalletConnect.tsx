"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { MTK_CONTRACT_ADDRESS } from "../wagmi";
import { useBalance, useReadContract, useWatchContractEvent } from "wagmi";
import { erc20Abi } from "viem";

import { useState, useEffect } from "react";

// 创建一个单独的组件来处理代币余额显示
function TokenBalanceDisplay({
  account,
  connected,
}: {
  account: { address?: string } | null; // 修改类型定义，接受普通的 string
  connected: boolean;
}) {
  const mik_address = MTK_CONTRACT_ADDRESS as `0x${string}`;
  const [mtkBalance, setMtkBalance] = useState("0");
  const [tokenSymbol, setTokenSymbol] = useState("MTK");
  const [shouldRefreshBalance, setShouldRefreshBalance] = useState(false);

  // 获取代币符号
  const { data: symbolData } = useReadContract({
    address: mik_address,
    abi: erc20Abi,
    functionName: "symbol",
    query: {
      enabled: connected && !!account,
    },
  });

  // 获取代币余额
  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address: account?.address ? (account.address as `0x${string}`) : undefined, // 类型转换
    token: mik_address,
    query: {
      enabled: connected && !!account?.address,
    },
  });

  // 监听 Transfer 事件
  useWatchContractEvent({
    address: mik_address,
    abi: erc20Abi,
    eventName: "Transfer",
    onLogs(logs) {
      // 检查事件是否与当前用户相关
      if (!account?.address) return;

      const userAddress = account.address.toLowerCase();
      const relevantEvents = logs.filter((log) => {
        const { from, to } = log.args;
        // 检查用户是发送方或接收方
        return (
          from?.toLowerCase() === userAddress ||
          to?.toLowerCase() === userAddress
        );
      });

      if (relevantEvents.length > 0) {
        console.log("检测到与用户相关的 MTK 转账事件");
        setShouldRefreshBalance(true);
      }
    },
  });

  // 更新代币符号
  useEffect(() => {
    if (symbolData) {
      setTokenSymbol(symbolData);
    }
  }, [symbolData]);

  // 更新代币余额
  useEffect(() => {
    if (balanceData) {
      setMtkBalance(balanceData.formatted);
      console.log("MTK Balance:", balanceData.formatted);
    }
  }, [balanceData]);

  // 当需要刷新余额时执行
  useEffect(() => {
    if (shouldRefreshBalance) {
      console.log("正在刷新 MTK 余额...");
      refetchBalance().then(() => {
        console.log("MTK 余额刷新完成");
        setShouldRefreshBalance(false);
      });
    }
  }, [shouldRefreshBalance, refetchBalance]);

  // 设置定期刷新余额（可选）
  useEffect(() => {
    if (!connected || !account?.address) return;

    // 每60秒刷新一次余额，作为备用机制
    const intervalId = setInterval(() => {
      refetchBalance();
    }, 60000);

    return () => clearInterval(intervalId);
  }, [connected, account, refetchBalance]);

  if (!connected || !account) {
    return null;
  }

  return (
    <div className="text-sm mt-2">
      MTK 余额: {mtkBalance} {tokenSymbol}
    </div>
  );
}

export function WalletConnect() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        // 注意: 如果您的应用使用服务器端渲染，这一步很重要
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        // 如果组件未准备好，显示骨架屏
        if (!ready) {
          return <Skeleton className="h-10 w-32" />;
        }

        return (
          <div>
            {(() => {
              if (!connected) {
                return (
                  <Button
                    onClick={openConnectModal}
                    type="button"
                    className="text-white"
                  >
                    连接钱包
                  </Button>
                );
              }

              if (chain.unsupported) {
                return (
                  <Button
                    onClick={openChainModal}
                    type="button"
                    variant="destructive"
                  >
                    错误网络
                  </Button>
                );
              }

              return (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Button
                    onClick={openChainModal}
                    type="button"
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 16,
                          height: 16,
                          borderRadius: 999,
                          overflow: "hidden",
                        }}
                      >
                        {chain.iconUrl && (
                          <Image
                            alt={chain.name ?? "Chain icon"}
                            src={chain.iconUrl}
                            width="16"
                            height="16"
                          />
                        )}
                      </div>
                    )}
                    {chain.name}
                  </Button>

                  <Button
                    onClick={openAccountModal}
                    type="button"
                    variant="outline"
                  >
                    {account.displayName}
                  </Button>

                  {/* 使用单独的组件来处理代币余额显示 */}
                  <TokenBalanceDisplay
                    account={account}
                    connected={connected}
                  />
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
