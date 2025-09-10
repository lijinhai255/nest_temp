"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAccount } from "wagmi";

// 定义性能指标类型
interface PerformanceMetric {
  id: string;
  userId: string;
  requestTimestamp: number;
  responseTimestamp: number;
  duration: number;
  endpoint: string;
  status: "success" | "error";
}

// 定义性能统计类型
interface PerformanceStats {
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  successRate: number;
  totalRequests: number;
}

const PerformanceMonitor = () => {
  const account = useAccount();
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [stats, setStats] = useState<PerformanceStats>({
    avgResponseTime: 0,
    minResponseTime: 0,
    maxResponseTime: 0,
    successRate: 100,
    totalRequests: 0,
  });
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [pollingInterval, setPollingInterval] = useState<number>(5000); // 默认5秒
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 计算性能统计数据
  const calculateStats = useCallback((metricsData: PerformanceMetric[]) => {
    if (metricsData.length === 0) {
      return {
        avgResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        successRate: 100,
        totalRequests: 0,
      };
    }

    const durations = metricsData.map((metric) => metric.duration);
    const successCount = metricsData.filter(
      (metric) => metric.status === "success"
    ).length;

    return {
      avgResponseTime: Math.round(
        durations.reduce((sum, val) => sum + val, 0) / durations.length
      ),
      minResponseTime: Math.min(...durations),
      maxResponseTime: Math.max(...durations),
      successRate: Math.round((successCount / metricsData.length) * 100),
      totalRequests: metricsData.length,
    };
  }, []);

  // 模拟API调用
  const makeApiCall = useCallback(
    async (endpoint: string) => {
      const userId = account.address || "anonymous";
      const requestTimestamp = performance.now();

      try {
        setIsLoading(true);

        // 模拟API调用 - 实际应用中替换为真实API调用
        const response = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
        });

        const responseTimestamp = performance.now();
        const duration = Math.round(responseTimestamp - requestTimestamp);

        const status = response.ok ? "success" : "error";

        // 创建新的性能指标记录
        const newMetric: PerformanceMetric = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          userId,
          requestTimestamp,
          responseTimestamp,
          duration,
          endpoint,
          status,
        };

        // 更新指标列表，保留最近20条记录
        setMetrics((prevMetrics) => {
          const updatedMetrics = [newMetric, ...prevMetrics].slice(0, 20);
          // 更新统计数据
          setStats(calculateStats(updatedMetrics));
          return updatedMetrics;
        });

        if (status === "error") {
          toast({
            title: "API调用失败",
            description: `请求 ${endpoint} 返回错误状态`,
            variant: "destructive",
          });
        }

        return { status, duration };
      } catch (error) {
        const responseTimestamp = performance.now();
        const duration = Math.round(responseTimestamp - requestTimestamp);

        // 创建错误指标记录
        const errorMetric: PerformanceMetric = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          userId,
          requestTimestamp,
          responseTimestamp,
          duration,
          endpoint,
          status: "error",
        };

        // 更新指标列表
        setMetrics((prevMetrics) => {
          const updatedMetrics = [errorMetric, ...prevMetrics].slice(0, 20);
          setStats(calculateStats(updatedMetrics));
          return updatedMetrics;
        });

        toast({
          title: "API调用异常",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        });

        return { status: "error" as const, duration };
      } finally {
        setIsLoading(false);
      }
    },
    [account.address, calculateStats]
  );

  // 手动触发API调用
  const handleManualApiCall = async () => {
    await makeApiCall("/api/health");
  };

  // 启动/停止轮询
  const togglePolling = () => {
    setIsPolling((prev) => !prev);
  };

  // 轮询效果
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isPolling) {
      // 立即执行一次
      makeApiCall("/api/health");

      // 设置定时器
      intervalId = setInterval(() => {
        makeApiCall("/api/health");
      }, pollingInterval);

      toast({
        title: "自动监控已启动",
        description: `每${pollingInterval / 1000}秒自动发起一次API请求`,
      });
    }

    // 清理函数
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPolling, pollingInterval, makeApiCall]);

  // 获取性能等级颜色
  const getDurationColor = (duration: number) => {
    if (duration < 100) return "text-green-600";
    if (duration < 300) return "text-yellow-600";
    return "text-red-600";
  };

  // 获取成功率颜色
  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return "text-green-600";
    if (rate >= 80) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>API性能监控</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualApiCall}
              disabled={isLoading}
            >
              {isLoading ? "请求中..." : "手动请求"}
            </Button>
            <Button
              variant={isPolling ? "destructive" : "default"}
              size="sm"
              onClick={togglePolling}
              className="text-white"
            >
              {isPolling ? "停止监控" : "开始自动监控"}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 性能指标卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">平均响应时间</h3>
            <p
              className={`text-2xl font-bold ${getDurationColor(
                stats.avgResponseTime
              )}`}
            >
              {stats.avgResponseTime} ms
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">成功率</h3>
            <p
              className={`text-2xl font-bold ${getSuccessRateColor(
                stats.successRate
              )}`}
            >
              {stats.successRate}%
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">请求总数</h3>
            <p className="text-2xl font-bold text-blue-600">
              {stats.totalRequests}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">最快响应</h3>
            <p className="text-xl font-bold text-green-600">
              {stats.minResponseTime} ms
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">最慢响应</h3>
            <p className="text-xl font-bold text-red-600">
              {stats.maxResponseTime} ms
            </p>
          </div>
        </div>

        {/* 历史记录表格 */}
        <div className="border border-gray-200 rounded-md overflow-hidden">
          <div className="bg-gray-50 p-3 border-b border-gray-200">
            <h3 className="font-medium">历史记录</h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    时间
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    端点
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    耗时
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {metrics.length > 0 ? (
                  metrics.map((metric) => (
                    <tr key={metric.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {new Date(metric.requestTimestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-mono">
                        {metric.endpoint}
                      </td>
                      <td
                        className={`px-4 py-2 whitespace-nowrap text-sm font-medium ${getDurationColor(
                          metric.duration
                        )}`}
                      >
                        {metric.duration} ms
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        {metric.status === "success" ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            成功
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            失败
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-4 text-center text-sm text-gray-500"
                    >
                      暂无记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 轮询设置 */}
        <div className="mt-4 flex items-center gap-2">
          <label htmlFor="pollingInterval" className="text-sm text-gray-600">
            轮询间隔:
          </label>
          <select
            id="pollingInterval"
            className="text-sm border border-gray-300 rounded-md p-1"
            value={pollingInterval}
            onChange={(e) => setPollingInterval(Number(e.target.value))}
            disabled={isPolling}
          >
            <option value={2000}>2秒</option>
            <option value={5000}>5秒</option>
            <option value={10000}>10秒</option>
            <option value={30000}>30秒</option>
          </select>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceMonitor;
