"use client";

import {
  useEffect,
  JSXElementConstructor,
  ReactElement,
  ReactNode,
  ReactPortal,
} from "react";
import { Card } from "@/components/ui/card";
import { useWallet } from "@/provider";
import { useStakingContract } from "@/hooks/useStakingContract";
import {
  BarChart,
  PieChart,
  Activity,
  TrendingUp,
  Users,
  Info,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// 模拟历史数据 - 在实际应用中，这些数据应该从API或区块链获取
const mockHistoricalData = {
  dailyStaking: [
    { date: "2023-09-08", amount: 12.5 },
    { date: "2023-09-09", amount: 18.2 },
    { date: "2023-09-10", amount: 15.7 },
    { date: "2023-09-11", amount: 22.3 },
    { date: "2023-09-12", amount: 28.1 },
    { date: "2023-09-13", amount: 25.9 },
    { date: "2023-09-14", amount: 32.4 },
    { date: "2023-09-15", amount: 35.8 },
  ],
  rewards: [
    { date: "2023-09-08", amount: 2.1 },
    { date: "2023-09-09", amount: 3.5 },
    { date: "2023-09-10", amount: 2.8 },
    { date: "2023-09-11", amount: 4.2 },
    { date: "2023-09-12", amount: 5.3 },
    { date: "2023-09-13", amount: 4.9 },
    { date: "2023-09-14", amount: 6.1 },
    { date: "2023-09-15", amount: 7.2 },
  ],
};

export default function AnalyticsPage() {
  const { address, isConnected } = useWallet();
  const stakingContractData = useStakingContract();

  const {
    stakedAmount,
    pendingRewards,
    totalStaked,
    refreshData,
    poolCount,
    poolId,
  } = stakingContractData;

  // 格式化显示的数据
  const formattedStakedAmount = parseFloat(stakedAmount || "0");
  const formattedPendingRewards = parseFloat(pendingRewards || "0");
  const formattedTotalStaked = parseFloat(totalStaked || "0");

  // 计算一些统计数据
  const stakingAPY = 12.5; // 示例APY，实际应从合约获取
  const totalUsers = 156; // 示例用户数，实际应从合约获取
  const averageStake = totalUsers > 0 ? formattedTotalStaked / totalUsers : 0;

  // 当页面加载时刷新数据
  useEffect(() => {
    if (isConnected && address && refreshData) {
      refreshData();
    }
  }, [isConnected, address, refreshData]);

  // 渲染图表的函数
  const renderChart = (
    chartType:
      | string
      | number
      | bigint
      | boolean
      | ReactElement<unknown, string | JSXElementConstructor<unknown>>
      | Iterable<ReactNode>
      | Promise<
          | string
          | number
          | bigint
          | boolean
          | ReactPortal
          | ReactElement<unknown, string | JSXElementConstructor<unknown>>
          | Iterable<ReactNode>
          | null
          | undefined
        >
      | null
      | undefined
  ) => {
    // 这里是一个简单的图表渲染示例
    // 在实际应用中，您应该使用像Chart.js、recharts或ApexCharts等库
    return (
      <div className="relative h-64 w-full">
        {/* 模拟图表 - 在实际应用中替换为真实图表组件 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Activity size={48} className="mx-auto text-primary opacity-50" />
            <p className="mt-4 text-zinc-400">
              图表数据正在加载中...
              <br />
              <span className="text-xs">
                (在实际应用中，这里将显示{chartType}图表)
              </span>
            </p>
          </div>
        </div>

        {/* 图表轴线 */}
        <div className="absolute bottom-0 left-0 w-full h-px bg-zinc-700"></div>
        <div className="absolute bottom-0 left-0 w-px h-full bg-zinc-700"></div>

        {/* 模拟数据点 */}
        <div className="absolute bottom-0 left-0 w-full h-full flex items-end">
          {mockHistoricalData.dailyStaking.map((item, index) => (
            <div
              key={index}
              className="flex-1 mx-1"
              style={{ height: `${(item.amount / 40) * 100}%` }}
            >
              <div
                className="w-full h-full bg-primary/40 hover:bg-primary/60 transition-colors rounded-t-sm"
                title={`${item.date}: ${item.amount} ETH`}
              ></div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-zinc-900 text-white">
      <div className="container mx-auto px-4 py-12">
        {/* 标题区域 */}
        <div className="flex flex-col items-center mb-12">
          <h1 className="text-4xl font-bold text-primary mb-2">质押分析</h1>
          <p className="text-zinc-400">查看质押数据和趋势分析</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="bg-zinc-800/80 backdrop-blur-sm rounded-2xl p-6 border border-zinc-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 mb-1">总质押量</p>
                <p className="text-2xl font-bold text-white"></p>
              </div>
              <div className="size-12 bg-primary/10 rounded-full flex items-center justify-center">
                <TrendingUp size={24} className="text-primary" />
              </div>
            </div>
          </Card>

          <Card className="bg-zinc-800/80 backdrop-blur-sm rounded-2xl p-6 border border-zinc-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 mb-1">质押年化收益率</p>
                <p className="text-2xl font-bold text-white"></p>
              </div>
              <div className="size-12 bg-green-500/10 rounded-full flex items-center justify-center">
                <Activity size={24} className="text-green-500" />
              </div>
            </div>
          </Card>

          <Card className="bg-zinc-800/80 backdrop-blur-sm rounded-2xl p-6 border border-zinc-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 mb-1">质押用户数</p>
                <p className="text-2xl font-bold text-white"></p>
              </div>
              <div className="size-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                <Users size={24} className="text-blue-500" />
              </div>
            </div>
          </Card>

          <Card className="bg-zinc-800/80 backdrop-blur-sm rounded-2xl p-6 border border-zinc-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 mb-1">平均质押量</p>
                <p className="text-2xl font-bold text-white"></p>
              </div>
              <div className="size-12 bg-purple-500/10 rounded-full flex items-center justify-center">
                <BarChart size={24} className="text-purple-500" />
              </div>
            </div>
          </Card>
        </div>

        {/* 图表区域 */}
        <div className="mb-12">
          <Card className="bg-zinc-800/80 backdrop-blur-sm rounded-2xl p-6 border border-zinc-700">
            <Tabs defaultValue="daily" className="w-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">质押趋势</h2>
                <TabsList className="bg-zinc-700">
                  <TabsTrigger value="daily">日视图</TabsTrigger>
                  <TabsTrigger value="weekly">周视图</TabsTrigger>
                  <TabsTrigger value="monthly">月视图</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="daily" className="mt-0">
                {renderChart("日")}
              </TabsContent>

              <TabsContent value="weekly" className="mt-0">
                {renderChart("周")}
              </TabsContent>

              <TabsContent value="monthly" className="mt-0">
                {renderChart("月")}
              </TabsContent>

              <div className="mt-4 flex justify-between text-xs text-zinc-400">
                <span>9月8日</span>
                <span>9月10日</span>
                <span>9月12日</span>
                <span>9月14日</span>
                <span>9月15日</span>
              </div>
            </Tabs>
          </Card>
        </div>

        {/* 奖励分析 */}
        <div className="mb-12">
          <Card className="bg-zinc-800/80 backdrop-blur-sm rounded-2xl p-6 border border-zinc-700">
            <div className="mb-6">
              <h2 className="text-xl font-bold">奖励分析</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="relative h-64">
                  {/* 这里是奖励图表 */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <PieChart size={48} className="text-secondary opacity-50" />
                    <p className="absolute mt-24 text-zinc-400 text-center">
                      奖励分布图
                      <br />
                      <span className="text-xs">(实际应用中显示饼图)</span>
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="space-y-4">
                  <div className="p-4 bg-zinc-700/50 rounded-xl">
                    <div className="flex justify-between mb-2">
                      <span className="text-zinc-300">您的质押</span>
                      <span className="font-bold">
                        {formattedStakedAmount.toFixed(4)} ETH
                      </span>
                    </div>
                    <div className="w-full bg-zinc-600 h-2 rounded-full">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{
                          width: `${
                            (formattedStakedAmount / formattedTotalStaked) * 100
                          }%`,
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-zinc-400 mt-2">
                      占总质押量的{" "}
                      {(
                        (formattedStakedAmount / formattedTotalStaked) *
                        100
                      ).toFixed(2)}
                      %
                    </p>
                  </div>

                  <div className="p-4 bg-zinc-700/50 rounded-xl">
                    <div className="flex justify-between mb-2">
                      <span className="text-zinc-300">待领取奖励</span>
                      <span className="font-bold text-secondary">
                        {formattedPendingRewards.toFixed(4)} MN
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>预计年化收益: {stakingAPY}%</span>
                      <span>池子ID: {poolId}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-700/50 rounded-xl">
                    <div className="flex items-start gap-3">
                      <Info size={18} className="text-primary mt-0.5" />
                      <div>
                        <p className="text-sm text-zinc-300">
                          质押更多ETH可以获得更多奖励。当前池子有 {poolCount}{" "}
                          个可用质押池。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* 刷新按钮 */}
        <div className="flex justify-center">
          <button
            onClick={() => {
              if (refreshData) refreshData();
            }}
            className="bg-zinc-700 hover:bg-zinc-600 transition-all text-white py-2 px-6 rounded-lg flex items-center gap-2"
          ></button>
        </div>
      </div>
    </main>
  );
}
