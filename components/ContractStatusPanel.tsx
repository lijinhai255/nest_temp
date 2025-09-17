"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Wallet,
  Coins,
  TrendingUp,
  ArrowDownToLine,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ContractStatusPanelProps {
  contractAddress: string;
  network: string;
  poolId: number;
  userAddress: string;
  isConnected: boolean;
  stakingBalance: string;
  pendingRewards: string;
  totalStaked: string;
  minStakeAmount: string;
  unstakeLockedBlocks: number;
  requestWithdrawAmount: string;
  pendingWithdrawAmount: string;
  withdrawPaused: boolean;
  walletBalance: string;
  onWithdraw?: () => void;
  onRefresh?: () => void;
}

export const ContractStatusPanel: React.FC<ContractStatusPanelProps> = ({
  contractAddress,
  network,
  poolId,
  userAddress,
  isConnected,
  stakingBalance,
  pendingRewards,
  totalStaked,
  minStakeAmount,
  unstakeLockedBlocks,
  requestWithdrawAmount,
  pendingWithdrawAmount,
  withdrawPaused,
  walletBalance,
  onWithdraw,
  onRefresh,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [estimatedUnlockTime, setEstimatedUnlockTime] = useState("");

  // 计算解锁时间
  useEffect(() => {
    const remainingBlocks = unstakeLockedBlocks;
    const estimatedSeconds = remainingBlocks * 12; // 假设每个区块12秒
    const hours = Math.floor(estimatedSeconds / 3600);
    const minutes = Math.floor((estimatedSeconds % 3600) / 60);
    setEstimatedUnlockTime(`约 ${hours}小时${minutes}分钟`);
  }, [unstakeLockedBlocks]);

  // 格式化金额
  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return isNaN(num) ? "0.0000" : num.toFixed(4);
  };

  // 状态分析
  const getStatusAnalysis = () => {
    return {
      canStake: parseFloat(walletBalance) >= parseFloat(minStakeAmount),
      hasStaking: parseFloat(stakingBalance) > 0,
      hasRewards: parseFloat(pendingRewards) > 0,
      hasWithdrawRequest: parseFloat(requestWithdrawAmount) > 0,
      canWithdraw: parseFloat(pendingWithdrawAmount) > 0,
      withdrawBlocked: withdrawPaused,
    };
  };

  const status = getStatusAnalysis();

  // 复制到剪贴板
  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "已复制",
      description: `${description} 已复制到剪贴板`,
    });
  };

  return (
    <Card className="mb-6 overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-blue-950/20 dark:via-background dark:to-purple-950/20 border-2">
      {/* 主要状态卡片 */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* 连接状态 */}
          <div className="flex items-center space-x-3 p-4 bg-white/50 dark:bg-black/20 rounded-lg border">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            ></div>
            <div>
              <div className="text-sm text-muted-foreground">连接状态</div>
              <div
                className={`font-medium ${
                  isConnected ? "text-green-600" : "text-red-600"
                }`}
              >
                {isConnected ? "已连接" : "未连接"}
              </div>
            </div>
          </div>

          {/* 钱包余额 */}
          <div className="flex items-center space-x-3 p-4 bg-white/50 dark:bg-black/20 rounded-lg border">
            <Wallet className="h-8 w-8 text-blue-500" />
            <div>
              <div className="text-sm text-muted-foreground">钱包余额</div>
              <div className="font-bold text-lg">
                {formatAmount(walletBalance)} ETH
              </div>
              <div className="text-xs text-muted-foreground">
                {status.canStake ? "✅ 可质押" : "❌ 余额不足"}
              </div>
            </div>
          </div>

          {/* 质押状态 */}
          <div className="flex items-center space-x-3 p-4 bg-white/50 dark:bg-black/20 rounded-lg border">
            <Coins className="h-8 w-8 text-green-500" />
            <div>
              <div className="text-sm text-muted-foreground">质押金额</div>
              <div className="font-bold text-lg">
                {formatAmount(stakingBalance)} ETH
              </div>
              <div className="text-xs text-muted-foreground">
                {status.hasStaking ? "✅ 赚取中" : "💡 开始质押"}
              </div>
            </div>
          </div>

          {/* 提取状态 */}
          <div className="flex items-center space-x-3 p-4 bg-white/50 dark:bg-black/20 rounded-lg border">
            <ArrowDownToLine className="h-8 w-8 text-purple-500" />
            <div>
              <div className="text-sm text-muted-foreground">可提取</div>
              <div className="font-bold text-lg">
                {formatAmount(pendingWithdrawAmount)} ETH
              </div>
              <div className="text-xs text-muted-foreground">
                {status.canWithdraw ? "✅ 可提取" : "⏳ 锁定中"}
              </div>
            </div>
          </div>
        </div>

        {/* 重要提示区域 */}
        <div className="space-y-3 mb-6">
          {/* 可提取资金提示 */}
          {status.canWithdraw && (
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium text-green-800 dark:text-green-200">
                    🎉 你有 {formatAmount(pendingWithdrawAmount)} ETH
                    可以立即提取！
                  </div>
                </div>
              </div>
              {onWithdraw && (
                <Button
                  size="sm"
                  onClick={onWithdraw}
                  className="bg-green-600 hover:bg-green-700"
                >
                  立即提取
                </Button>
              )}
            </div>
          )}

          {/* 有奖励可领取 */}
          {status.hasRewards && (
            <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-5 w-5 text-yellow-600" />
                <div>
                  <div className="font-medium text-yellow-800 dark:text-yellow-200">
                    💎 你有 {pendingRewards} MetaNode 奖励可以领取！
                  </div>
                </div>
              </div>
              <Button size="sm" variant="outline" className="border-yellow-300">
                领取奖励
              </Button>
            </div>
          )}

          {/* 余额不足提示 */}
          {!status.canStake && isConnected && (
            <div className="flex items-center p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
              <div className="font-medium text-red-800 dark:text-red-200">
                ⚠️ 钱包余额不足，无法质押。需要至少 {minStakeAmount} ETH
              </div>
            </div>
          )}

          {/* 提取功能暂停 */}
          {status.withdrawBlocked && (
            <div className="flex items-center p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
              <div className="font-medium text-red-800 dark:text-red-200">
                🚫 提取功能已暂停，请稍后再试或联系客服
              </div>
            </div>
          )}

          {/* 解质押锁定提示 */}
          {status.hasWithdrawRequest && !status.canWithdraw && (
            <div className="flex items-center p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600 mr-3" />
              <div className="font-medium text-blue-800 dark:text-blue-200">
                ⏳ 你的解质押请求正在锁定期内，预计 {estimatedUnlockTime}{" "}
                后可提取
              </div>
            </div>
          )}
        </div>

        {/* 展开/收起按钮 */}
        <div className="flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-2"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            <span>{isExpanded ? "收起详情" : "查看详情"}</span>
          </Button>

          <div className="flex space-x-2">
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-1" />
                刷新
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 详细信息展开面板 */}
      {isExpanded && (
        <div className="border-t bg-muted/30 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 合约信息 */}
            <div>
              <h4 className="font-semibold mb-4 flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                📋 合约信息
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-background rounded-lg border">
                  <span className="text-sm text-muted-foreground">
                    合约地址:
                  </span>
                  <div className="flex items-center space-x-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {contractAddress?.slice(0, 6)}...
                      {contractAddress?.slice(-4)}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(contractAddress, "合约地址")
                      }
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        window.open(
                          `https://sepolia.etherscan.io/address/${contractAddress}`,
                          "_blank"
                        )
                      }
                      className="h-6 w-6 p-0"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-background rounded-lg border">
                  <span className="text-sm text-muted-foreground">网络:</span>
                  <Badge variant="secondary">{network}</Badge>
                </div>

                <div className="flex justify-between items-center p-3 bg-background rounded-lg border">
                  <span className="text-sm text-muted-foreground">池子ID:</span>
                  <Badge variant="outline">
                    #{poolId} {poolId === 0 ? "(ETH池)" : ""}
                  </Badge>
                </div>

                {userAddress && (
                  <div className="flex justify-between items-center p-3 bg-background rounded-lg border">
                    <span className="text-sm text-muted-foreground">
                      用户地址:
                    </span>
                    <div className="flex items-center space-x-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(userAddress, "用户地址")}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 质押规则 */}
            <div>
              <h4 className="font-semibold mb-4 flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                📜 质押规则
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-background rounded-lg border">
                  <span className="text-sm text-muted-foreground">
                    最小质押金额:
                  </span>
                  <span className="font-medium">{minStakeAmount} ETH</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-background rounded-lg border">
                  <span className="text-sm text-muted-foreground">
                    解质押锁定:
                  </span>
                  <div className="text-right">
                    <div className="font-medium">
                      {unstakeLockedBlocks} 区块
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ({estimatedUnlockTime})
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-background rounded-lg border">
                  <span className="text-sm text-muted-foreground">
                    提取功能:
                  </span>
                  <Badge variant={withdrawPaused ? "destructive" : "default"}>
                    {withdrawPaused ? "❌ 已暂停" : "✅ 正常"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* 资金状态 */}
            <div>
              <h4 className="font-semibold mb-4 flex items-center">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                💰 资金状态
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-background rounded-lg border">
                  <span className="text-sm text-muted-foreground">
                    总质押量:
                  </span>
                  <span className="font-medium">
                    {formatAmount(totalStaked)} ETH={totalStaked}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-background rounded-lg border">
                  <span className="text-sm text-muted-foreground">
                    请求提取:
                  </span>
                  <span className="font-medium">
                    {formatAmount(requestWithdrawAmount)} ETH=
                    {requestWithdrawAmount}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-background rounded-lg border">
                  <span className="text-sm text-muted-foreground">
                    可立即提取:
                  </span>
                  <div className="text-right">
                    <span className="font-medium text-green-600">
                      {formatAmount(pendingWithdrawAmount)} ETH
                    </span>
                    {parseFloat(pendingWithdrawAmount) > 0 && (
                      <span className="ml-1">🎉</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-background rounded-lg border">
                  <span className="text-sm text-muted-foreground">锁定中:</span>
                  <span className="font-medium text-orange-600">
                    {(
                      parseFloat(requestWithdrawAmount) -
                      parseFloat(pendingWithdrawAmount)
                    ).toFixed(6)}{" "}
                    ETH
                  </span>
                </div>
              </div>
            </div>

            {/* 奖励信息 */}
            <div>
              <h4 className="font-semibold mb-4 flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                🎁 奖励信息
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-background rounded-lg border">
                  <span className="text-sm text-muted-foreground">
                    待领取奖励:
                  </span>
                  <div className="text-right">
                    <span className="font-medium text-yellow-600">
                      {pendingRewards} MetaNode
                    </span>
                    {status.hasRewards && <span className="ml-1">💎</span>}
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-background rounded-lg border">
                  <span className="text-sm text-muted-foreground">
                    奖励状态:
                  </span>
                  <Badge variant={status.hasRewards ? "default" : "secondary"}>
                    {status.hasRewards ? "可领取" : "继续质押"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* 操作说明 */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-3 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              💡 操作提示
            </h4>
            <div className="text-sm text-muted-foreground space-y-2">
              <div className="flex items-start">
                <span className="text-blue-500 mr-2 mt-0.5">•</span>
                <span>质押ETH后开始赚取MetaNode奖励，可随时领取</span>
              </div>
              <div className="flex items-start">
                <span className="text-orange-500 mr-2 mt-0.5">•</span>
                <span>
                  解质押需要等待 {unstakeLockedBlocks} 个区块 (
                  {estimatedUnlockTime}) 的锁定期
                </span>
              </div>
              <div className="flex items-start">
                <span className="text-green-500 mr-2 mt-0.5">•</span>
                <span>锁定期结束后，ETH将自动进入可提取状态</span>
              </div>
              <div className="flex items-start">
                <span className="text-purple-500 mr-2 mt-0.5">•</span>
                <span>提取操作会将ETH直接转回您的钱包地址</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
