"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CooldownTimer } from "@/components/CooldownTimer";
import { ContractStatusPanel } from "@/components/ContractStatusPanel"; // 🆕 添加导入
import {
  ArrowUp,
  Clock,
  InfoIcon,
  Loader2,
  RotateCcw,
  Bug,
  Copy,
  ExternalLink,
} from "lucide-react";
import { useStakingContract } from "@/hooks/useStakingContract";
import { useWallet } from "@/provider";
import { toast } from "@/hooks/use-toast";

export default function StakingPage() {
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const { isConnected, address } = useWallet();

  const {
    // 状态数据
    stakedAmount,
    requestAmount,
    pendingWithdrawAmount,
    unstakeLockedBlocks,
    withdrawPaused,
    loading,
    error,
    cooldownInfo,

    // 🆕 添加更多状态数据用于展示
    contractAddress,
    network,
    poolId,
    pendingRewards,
    totalStaked,
    minStakeAmount,
    balance,

    // 操作方法
    requestUnstake,
    withdrawETH,
    refreshData,
    fetchCooldownInfo,

    // 调试方法
    debugContract,
    stakingContractData,
  } = useStakingContract();
  // 🆕 添加 useStakingContract 的详细调试信息
  useEffect(() => {
    console.log("=== useStakingContract 返回值 ===");
    console.log("完整对象:", stakingContractData);
    console.log("合约地址:", stakingContractData?.contractAddress);
    console.log("网络名称:", stakingContractData?.networkName);
    console.log("最小质押金额:", stakingContractData?.minStakeAmount);
    console.log("最大质押金额:", stakingContractData?.maxStakeAmount);
    console.log("已质押金额:", stakedAmount);
    console.log("待领取奖励:", pendingRewards);
    console.log("总质押量:", totalStaked);
    console.log("加载状态:", loading);
    console.log("错误信息:", error);
    console.log("池子数量:", stakingContractData?.poolCount);
    console.log("当前池子ID:", stakingContractData?.poolId);
    console.log("================================");
  }, [
    stakingContractData,
    stakedAmount,
    pendingRewards,
    totalStaked,
    loading,
    error,
  ]);
  // 🔧 格式化显示金额（保留4位小数）
  const formatAmount = (amount) => {
    const num = parseFloat(amount);
    return isNaN(num) ? "0.0000" : num.toFixed(4);
  };

  // 🔧 计算冷却时间（假设每个区块15秒）
  const getCooldownTime = () => {
    const minutes = Math.ceil((unstakeLockedBlocks * 15) / 60);
    if (minutes < 60) {
      return `${minutes} min cooldown`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m cooldown`;
    }
  };

  // 🚀 处理解质押
  const handleUnstake = async () => {
    if (!isConnected) {
      toast({
        title: "钱包未连接",
        description: "请先连接您的钱包",
        variant: "destructive",
      });
      return;
    }

    if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) {
      toast({
        title: "输入无效",
        description: "请输入有效的解质押金额",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("🚀 开始解质押:", unstakeAmount, "ETH");
      const result = await requestUnstake(unstakeAmount);

      toast({
        title: "解质押请求成功",
        description: `交易哈希: ${result.hash.slice(
          0,
          10
        )}...${result.hash.slice(-8)}`,
      });

      setUnstakeAmount("");

      setTimeout(() => {
        fetchCooldownInfo();
      }, 2000);
    } catch (err) {
      console.error("❌ 解质押失败:", err);
      const errorMessage = err instanceof Error ? err.message : "解质押失败";

      toast({
        title: "解质押失败",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // 🚀 处理提取
  const handleWithdraw = async () => {
    if (!isConnected) {
      toast({
        title: "钱包未连接",
        description: "请先连接您的钱包",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(pendingWithdrawAmount) <= 0) {
      toast({
        title: "无法提取",
        description: "没有可提取的ETH",
        variant: "destructive",
      });
      return;
    }

    if (withdrawPaused) {
      toast({
        title: "提取暂停",
        description: "提取功能已暂停，请稍后再试",
        variant: "destructive",
      });
      return;
    }

    if (!cooldownInfo?.isReady) {
      toast({
        title: "冷却时间未结束",
        description: "请等待冷却时间结束后再提取",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("🚀 开始提取ETH");
      const result = await withdrawETH();

      toast({
        title: "提取成功",
        description: `已成功提取 ${formatAmount(pendingWithdrawAmount)} ETH`,
      });
    } catch (err) {
      console.error("❌ 提取失败:", err);
      const errorMessage = err instanceof Error ? err.message : "提取失败";

      toast({
        title: "提取失败",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // 🔧 处理刷新数据
  const handleRefresh = async () => {
    try {
      await refreshData();
      await fetchCooldownInfo();
      toast({
        title: "刷新成功",
        description: "合约状态已更新",
      });
    } catch (err) {
      toast({
        title: "刷新失败",
        description: "无法获取最新数据",
        variant: "destructive",
      });
    }
  };

  // 🔧 设置最大金额
  const handleMaxAmount = () => {
    if (parseFloat(stakedAmount) > 0) {
      setUnstakeAmount(stakedAmount);
      toast({
        title: "已设置最大金额",
        description: `设置为 ${formatAmount(stakedAmount)} ETH`,
      });
    }
  };

  // 🆕 冷却完成回调
  const handleCooldownComplete = () => {
    toast({
      title: "冷却时间结束",
      description: "现在可以提取ETH了！",
    });
    refreshData();
  };

  // 🔧 检查是否可以解质押
  const canUnstake = () => {
    const amount = parseFloat(unstakeAmount);
    const staked = parseFloat(stakedAmount);
    return amount > 0 && amount <= staked && !loading;
  };

  // 🔧 检查是否可以提取
  const canWithdraw = () => {
    return (
      parseFloat(pendingWithdrawAmount) > 0 &&
      !withdrawPaused &&
      !loading &&
      cooldownInfo?.isReady
    );
  };

  // 🆕 复制地址到剪贴板
  const copyToClipboard = (text, description) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "已复制",
      description: `${description} 已复制到剪贴板`,
    });
  };
  console.log("cooldownInfo", cooldownInfo);

  return (
    <main className="min-h-screen text-foreground font-work-sans">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 🎯 合约状态面板 - 置顶显示 */}
        <ContractStatusPanel
          contractAddress={contractAddress}
          network={network || "Sepolia"}
          poolId={poolId || 0}
          userAddress={address}
          isConnected={isConnected}
          stakingBalance={stakedAmount}
          pendingRewards={pendingRewards || "0"}
          totalStaked={totalStaked || "0"}
          minStakeAmount={minStakeAmount || "0.01"}
          unstakeLockedBlocks={unstakeLockedBlocks || 1000}
          requestWithdrawAmount={requestAmount}
          pendingWithdrawAmount={pendingWithdrawAmount}
          withdrawPaused={withdrawPaused}
          walletBalance={balance || "0"}
          onWithdraw={handleWithdraw}
          onRefresh={handleRefresh}
        />

        {/* 🆕 快速状态概览 */}
        <Card className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div
                className={`w-3 h-3 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
              <div className="text-sm">
                <span className="font-medium">状态: </span>
                <span
                  className={isConnected ? "text-green-600" : "text-red-600"}
                >
                  {isConnected ? "已连接" : "未连接"}
                </span>
              </div>
              {isConnected && (
                <div className="text-sm text-muted-foreground">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4 text-sm">
              <div>
                <span className="text-muted-foreground">可提取: </span>
                <span className="font-medium text-green-600">
                  {formatAmount(pendingWithdrawAmount)} ETH
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">锁定中: </span>
                <span className="font-medium text-orange-600">
                  {formatAmount(requestAmount)} ETH
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="text-foreground font-work-sans w-full">
          <div className="px-6 py-10">
            {/* 头部 */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  Unstake and withdraw your ETH
                </h2>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <span>合约: </span>
                    <code className="ml-1 px-2 py-1 bg-muted rounded text-xs">
                      {contractAddress?.slice(0, 6)}...
                      {contractAddress?.slice(-4)}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(contractAddress, "合约地址")
                      }
                      className="ml-1 h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div>网络: {network || "Sepolia"}</div>
                  <div>池子: #{poolId || 0}</div>
                </div>
              </div>

              {/* 🔧 调试按钮和刷新按钮 */}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  <span className="ml-1">刷新</span>
                </Button>

                <Button variant="outline" size="sm" onClick={debugContract}>
                  <Bug className="h-4 w-4" />
                  <span className="ml-1">调试</span>
                </Button>
              </div>
            </div>

            {/* 🔧 错误提示 */}
            {error && (
              <Card className="p-4 mb-6 border-destructive bg-destructive/10">
                <div className="text-destructive text-sm flex items-center">
                  <InfoIcon className="h-4 w-4 mr-2" />
                  {error}
                </div>
              </Card>
            )}

            {/* 🔧 连接提示 */}
            {!isConnected && (
              <Card className="p-4 mb-6 border-yellow-500 bg-yellow-500/10">
                <div className="text-yellow-600 text-sm flex items-center">
                  <InfoIcon className="h-4 w-4 mr-2" />
                  请先连接钱包以查看和操作您的质押
                </div>
              </Card>
            )}

            {/* 🆕 重要提示卡片 */}
            {parseFloat(pendingWithdrawAmount) > 0 && (
              <Card className="p-4 mb-6 border-green-500 bg-green-500/10">
                <div className="text-green-600 text-sm flex items-center justify-between">
                  <div className="flex items-center">
                    <InfoIcon className="h-4 w-4 mr-2" />
                    🎉 你有 {formatAmount(pendingWithdrawAmount)} ETH
                    可以立即提取！
                  </div>
                  <Button
                    size="sm"
                    onClick={handleWithdraw}
                    disabled={!canWithdraw()}
                    className="ml-4"
                  >
                    立即提取
                  </Button>
                </div>
              </Card>
            )}

            {/* 状态卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="text-muted-foreground mb-2 flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  Staked Amount
                </div>
                <div className="text-primary text-2xl font-bold">
                  {formatAmount(stakedAmount)} ETH
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  正在赚取奖励
                </div>
              </Card>

              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="text-muted-foreground mb-2 flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Available to Withdraw
                </div>
                <div className="text-primary text-2xl font-bold">
                  {formatAmount(pendingWithdrawAmount)} ETH
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {cooldownInfo?.isReady ? "✅ 可立即提取" : "⏳ 等待解锁"}
                </div>
              </Card>

              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="text-muted-foreground mb-2 flex items-center">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                  Pending Unstake
                </div>
                <div className="text-primary text-2xl font-bold">
                  {formatAmount(requestAmount)} ETH
                </div>
                <div className="text-xs text-muted-foreground mt-1">锁定中</div>
              </Card>
            </div>

            {/* Unstake 部分 */}
            <div className="mb-8">
              <h3 className="text-xl font-medium mb-4 flex items-center">
                <ArrowUp className="h-5 w-5 mr-2" />
                Unstake
              </h3>
              <div className="mb-2 text-muted-foreground">
                Amount to Unstake
              </div>
              <div className="relative mb-2">
                <Input
                  type="text"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                  placeholder="0.0"
                  disabled={loading || !isConnected}
                  className="pr-12 text-lg"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground font-medium">
                  ETH
                </div>
              </div>

              {/* 🆕 最大金额按钮和余额显示 */}
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-muted-foreground">
                  可用: {formatAmount(stakedAmount)} ETH
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMaxAmount}
                  disabled={
                    loading || !isConnected || parseFloat(stakedAmount) <= 0
                  }
                >
                  最大
                </Button>
              </div>

              <Button
                className="w-full h-12 text-base"
                onClick={handleUnstake}
                disabled={!canUnstake() || !isConnected}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <ArrowUp className="h-5 w-5 mr-2" />
                )}
                {loading ? "处理中..." : "Unstake ETH"}
              </Button>
            </div>

            {/* 🆕 冷却时间显示 */}
            {parseFloat(requestAmount) > 0 && cooldownInfo && (
              <div className="mb-8">
                <h3 className="text-xl font-medium mb-4 flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Cooldown Status
                </h3>
                <CooldownTimer
                  cooldownInfo={cooldownInfo}
                  onComplete={handleCooldownComplete}
                />
              </div>
            )}

            {/* Withdraw 部分 */}
            <div>
              <h3 className="text-xl font-medium mb-4 flex items-center">
                <ArrowUp className="h-5 w-5 mr-2" />
                Withdraw
              </h3>
              <Card className="flex justify-between items-center mb-4 p-4 hover:shadow-md transition-shadow">
                <div>
                  <div className="text-muted-foreground mb-1">
                    Ready to Withdraw
                  </div>
                  <div className="text-primary text-2xl font-bold">
                    {formatAmount(pendingWithdrawAmount)} ETH
                  </div>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Clock className="h-4 w-4 mr-1" />
                  <span
                    className={cooldownInfo?.isReady ? "text-green-600" : ""}
                  >
                    {cooldownInfo?.isReady ? "Ready" : getCooldownTime()}
                  </span>
                </div>
              </Card>

              <div className="flex items-center text-muted-foreground mb-4 p-3 bg-muted/50 rounded-lg">
                <InfoIcon className="h-4 w-4 mr-2" />
                <div className="text-sm">
                  After unstaking, you need to wait {getCooldownTime()} to
                  withdraw.
                  {withdrawPaused && (
                    <span className="ml-2 text-yellow-600 font-medium">
                      (提取功能已暂停)
                    </span>
                  )}
                </div>
              </div>

              <Button
                className="w-full h-12 text-base"
                onClick={handleWithdraw}
                disabled={!canWithdraw() || !isConnected}
                variant={canWithdraw() ? "default" : "secondary"}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <ArrowUp className="h-5 w-5 mr-2" />
                )}
                {loading
                  ? "处理中..."
                  : cooldownInfo?.isReady
                  ? "Withdraw ETH"
                  : "等待冷却时间"}
              </Button>
            </div>

            {/* 🆕 额外信息 */}
            <Card className="mt-6 p-4 bg-muted/30">
              <h4 className="font-medium mb-3 flex items-center">
                <InfoIcon className="h-4 w-4 mr-2" />
                操作说明
              </h4>
              <div className="text-sm text-muted-foreground space-y-2">
                <div className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  解质押需要等待 {unstakeLockedBlocks} 个区块确认 (
                  {getCooldownTime()})
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  解质押后的ETH将进入待提取状态
                </div>
                <div className="flex items-start">
                  <span className="text-purple-500 mr-2">•</span>
                  提取操作会将ETH返回到您的钱包
                </div>
              </div>
            </Card>

            {/* 🆕 快捷操作区域 */}
            <div className="mt-6">
              <div className="text-sm text-muted-foreground mb-3">
                快捷金额:
              </div>
              <div className="flex gap-3 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUnstakeAmount("0.01")}
                  disabled={loading || !isConnected}
                >
                  0.01 ETH
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUnstakeAmount("0.1")}
                  disabled={loading || !isConnected}
                >
                  0.1 ETH
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUnstakeAmount("1.0")}
                  disabled={loading || !isConnected}
                >
                  1.0 ETH
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMaxAmount}
                  disabled={
                    loading || !isConnected || parseFloat(stakedAmount) <= 0
                  }
                >
                  全部
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
