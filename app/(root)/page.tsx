"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/provider";
import { useStakingContract } from "@/hooks/useStakingContract";
import { ArrowDown, ArrowLeft, Loader2, RefreshCw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [stakeAmount, setStakeAmount] = useState("");
  const [isStaking, setIsStaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const { address, isConnected, balance } = useWallet();

  // 添加详细的日志输出
  // console.log("Home组件 - address:", address);
  // console.log("Home组件 - isConnected:", isConnected);
  // console.log("Home组件 - balance原始值:", balance);
  // console.log(
  //   "Home组件 - balance格式化:",
  //   balance ? balance : "未获取",
  //   balance
  // );
  console.log("balance", balance);

  const stakingContractData = useStakingContract();
  const {
    stakedAmount,
    pendingRewards,
    totalStaked,
    loading,
    error,
    stakeETH,
    claimRewards,
    refreshData,
  } = stakingContractData;

  // 🆕 添加 useStakingContract 的详细调试信息
  // useEffect(() => {
  //   console.log("=== useStakingContract 返回值 ===");
  //   console.log("完整对象:", stakingContractData);
  //   console.log("合约地址:", stakingContractData?.contractAddress);
  //   console.log("网络名称:", stakingContractData?.networkName);
  //   console.log("最小质押金额:", stakingContractData?.minStakeAmount);
  //   console.log("最大质押金额:", stakingContractData?.maxStakeAmount);
  //   console.log("已质押金额:", stakedAmount);
  //   console.log("待领取奖励:", pendingRewards);
  //   console.log("总质押量:", totalStaked);
  //   console.log("加载状态:", loading);
  //   console.log("错误信息:", error);
  //   console.log("池子数量:", stakingContractData?.poolCount);
  //   console.log("当前池子ID:", stakingContractData?.poolId);
  //   console.log("stakeETH 函数:", typeof stakeETH);
  //   console.log("claimRewards 函数:", typeof claimRewards);
  //   console.log("refreshData 函数:", typeof refreshData);
  //   console.log("================================");
  // }, [
  //   stakingContractData,
  //   stakedAmount,
  //   pendingRewards,
  //   totalStaked,
  //   loading,
  //   error,
  //   stakeETH,
  //   claimRewards,
  //   refreshData,
  // ]);

  // 格式化显示的余额
  const formattedStakedAmount = parseFloat(stakedAmount || "0");

  // 🔧 关键修改：奖励显示逻辑
  const formatPendingRewards = (rewards: string) => {
    const rawAmount = parseFloat(rewards || "0");
    console.log("原始奖励金额:", rawAmount);

    // 如果奖励太高，进行缩放
    if (rawAmount > 100) {
      const scaledAmount = rawAmount / 1000; // 除以1000
      console.log("缩放后奖励:", scaledAmount);
      return scaledAmount;
    }

    return rawAmount;
  };

  const formattedPendingRewards = formatPendingRewards(pendingRewards);

  // 确保balance是bigint类型，并正确格式化
  // 如果balance是undefined，显示0
  const formattedBalance = balance ? parseFloat(balance) : 0;

  console.log("Home组件 - formattedBalance:", formattedBalance);
  console.log("Home组件 - formattedStakedAmount:", formattedStakedAmount);
  console.log("Home组件 - formattedPendingRewards:", formattedPendingRewards);

  // 处理质押
  const handleStake = async () => {
    const amount = parseFloat(stakeAmount);
    if (isNaN(amount) || amount <= 0 || amount > formattedBalance) {
      console.log("质押金额无效:", amount, "可用余额:", formattedBalance);
      return;
    }

    try {
      setIsStaking(true);
      console.log("🚀 开始质押:", stakeAmount, "ETH");
      console.log("调用 stakeETH 函数:", typeof stakeETH);

      if (!stakeETH) {
        console.error("❌ stakeETH 函数不存在");
        return;
      }

      const result = await stakeETH(stakeAmount);
      console.log("✅ 质押成功:", result);
      setStakeAmount("");
    } catch (err) {
      console.error("❌ 质押失败:", err);
    } finally {
      setIsStaking(false);
    }
  };

  // 处理领取奖励
  const handleClaimRewards = async () => {
    if (formattedPendingRewards <= 0) {
      console.log("没有可领取的奖励");
      return;
    }

    try {
      setIsClaiming(true);
      console.log("🚀 开始领取奖励");
      console.log("调用 claimRewards 函数:", typeof claimRewards);

      if (!claimRewards) {
        console.error("❌ claimRewards 函数不存在");
        return;
      }

      const result = await claimRewards();
      console.log("✅ 领取成功:", result);
    } catch (err) {
      console.error("❌ 领取奖励失败:", err);
    } finally {
      setIsClaiming(false);
    }
  };

  // 当钱包连接状态改变时刷新数据
  useEffect(() => {
    if (isConnected && address) {
      console.log("钱包连接状态变化，刷新数据");
      if (refreshData) {
        refreshData();
      } else {
        console.warn("refreshData 函数不存在");
      }
    }
  }, [isConnected, address, refreshData]);

  return (
    <main className="min-h-screen  text-white">
      <div className="container mx-auto px-4 pb-12 pt-0">
        {/* 标题区域 */}
        <div className="flex flex-col items-center mb-16">
          <h1 className="text-5xl font-bold text-primary mb-2">YC Project</h1>
          <p className="text-2xl font-bold text-white mb-1">Staking Platform</p>
          <p className="text-zinc-400">Stake ETH to earn tokens</p>
        </div>
        {/* 质押平台主体 */}
        <div className="grid md:grid-cols-2 gap-8 mb-12 max-w-5xl mx-auto">
          {/* 左侧面板 - 质押操作 */}
          <Card className="rounded-2xl p-6 border ">
            {/* 已质押金额 */}
            <div className="bg-zinc-800 rounded-2xl p-6 mb-6 border ">
              <p className="text-zinc-400 mb-3">Stake Amount</p>
              <div className="flex items-center gap-3">
                <div className="size-10 bg-primary/20 rounded-full flex items-center justify-center">
                  <span className="text-primary font-bold">ETH</span>
                </div>
                <div>
                  <span className="text-3xl font-bold text-white">
                    {loading ? "Loading..." : formattedStakedAmount}
                  </span>
                  <span className="text-3xl font-bold text-primary">ETH</span>
                </div>
              </div>
            </div>

            {/* 质押表单 */}
            <div className="mb-8">
              <label className="text-zinc-400 uppercase text-sm font-bold mb-3 block">
                AMOUNT TO STAKE
                {/* 🆕 显示质押限制 */}
                {stakingContractData?.minStakeAmount &&
                  parseFloat(stakingContractData.minStakeAmount) > 0 && (
                    <span className="text-red-400 text-xs ml-2 normal-case">
                      (最少 {stakingContractData.minStakeAmount} ETH)
                    </span>
                  )}
              </label>
              <div className="relative mb-2">
                <Input
                  type="text"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="bg-zinc-700/70 text-white border-zinc-600 rounded-xl py-6 px-5 h-14 focus-visible:ring-primary/30 focus-visible:border-primary/50"
                  placeholder="0.0"
                  disabled={!isConnected || loading || isStaking}
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 font-bold text-zinc-400">
                  ETH
                </div>
              </div>
              <p className="text-sm text-zinc-400">
                Available: {formattedBalance.toFixed(4)} ETH
              </p>
              {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
            </div>

            {/* 质押按钮 */}
            <Button
              className="w-full rounded-xl py-4 px-6"
              disabled={
                !isConnected ||
                !stakeAmount ||
                parseFloat(stakeAmount) <= 0 ||
                parseFloat(stakeAmount) > formattedBalance ||
                loading ||
                isStaking ||
                !stakeETH
              }
              onClick={handleStake}
            >
              {isStaking ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowDown className="h-5 w-5" />
                  Stake ETH
                </>
              )}
            </Button>
          </Card>

          {/* 右侧面板 - 奖励信息 */}
          <Card className=" rounded-2xl p-6 border ">
            {/* 待领取奖励 */}
            <div className="bg-zinc-800 rounded-2xl p-6 mb-6 border ">
              <p className="text-zinc-400 mb-3">
                Pending Rewards
                {/* 🆕 添加测试标识 */}
                {parseFloat(pendingRewards || "0") > 100 && (
                  <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                    测试网
                  </span>
                )}
              </p>
              <div className="flex items-center gap-3">
                <div className="size-10 bg-secondary/20 rounded-full flex items-center justify-center">
                  <span className="text-secondary font-bold">MN</span>
                </div>
                <div>
                  <span className="text-3xl font-bold text-white">
                    {loading
                      ? "Loading..."
                      : formattedPendingRewards.toFixed(4)}{" "}
                  </span>
                  <span className="text-3xl font-bold text-secondary">
                    MetaNode
                  </span>
                </div>
              </div>
              {/* 🆕 显示原始数值（调试用） */}
              {parseFloat(pendingRewards || "0") > 100 && (
                <p className="text-xs text-zinc-500 mt-2">
                  原始值: {parseFloat(pendingRewards || "0").toFixed(4)}
                </p>
              )}
            </div>

            {/* 奖励说明 */}
            <div className="bg-primary/10 rounded-2xl p-6 mb-8 border border-primary/20">
              <div className="flex items-start gap-4">
                <div className="size-8 bg-primary/20 rounded-full flex items-center justify-center mt-1">
                  <Info className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-white font-medium mb-3">
                    How rewards work:
                  </p>
                  <ul className="space-y-2">
                    <li className="text-sm text-zinc-300 flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>
                        Rewards accumulate based on your staked amount and time
                      </span>
                    </li>
                    <li className="text-sm text-zinc-300 flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>You can claim rewards anytime</span>
                    </li>
                    <li className="text-sm text-zinc-300 flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Rewards are paid in MetaNode tokens</span>
                    </li>
                    {/* 🆕 添加测试网说明 */}
                    {parseFloat(pendingRewards || "0") > 100 && (
                      <li className="text-sm text-yellow-300 flex items-start gap-2">
                        <span className="text-yellow-400">•</span>
                        <span>测试网奖励已自动调整显示比例</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {/* 领取奖励按钮 */}
            <Button
              className="w-full rounded-xl py-4 px-6"
              onClick={handleClaimRewards}
              disabled={
                !isConnected ||
                formattedPendingRewards <= 0 ||
                loading ||
                isClaiming ||
                !claimRewards
              }
            >
              {isClaiming ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowLeft className="h-5 w-5" />
                  Claim Rewards
                </>
              )}
            </Button>
          </Card>
        </div>

        {/* 总质押信息 */}
        {totalStaked && (
          <div className="max-w-5xl mx-auto">
            <Card className="bg-zinc-800/80 backdrop-blur-sm rounded-2xl p-6 border ">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-zinc-400 mb-1">Total Staked</p>
                  <p className="text-2xl font-bold text-white">
                    {parseFloat(totalStaked).toFixed(4)}{" "}
                    <span className="text-primary">ETH</span>
                  </p>
                </div>
                <div>
                  <Button
                    onClick={() => {
                      console.log("🔄 手动刷新数据");
                      if (refreshData) {
                        refreshData();
                      } else {
                        console.warn("refreshData 函数不存在");
                      }
                    }}
                    className="bg-zinc-700 hover:bg-zinc-600 transition-all text-white py-2 px-4 rounded-lg flex items-center gap-2"
                    disabled={loading}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
