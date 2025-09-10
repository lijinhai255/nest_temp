"use client";

import { useEffect, useState } from "react";
import PERFORMANCE_METRICS from "@/lib/performanceMetrics";

/**
 * 性能监控组件
 * 用于收集、展示和分析网页性能指标
 */
const PerformanceMonitor = ({
  showDetails = false,
  onDataCollected = null,
}) => {
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState(null);

  useEffect(() => {
    // 确保代码只在客户端执行
    if (typeof window !== "undefined") {
      // 收集性能指标数据
      collectPerformanceMetrics();
    }
  }, []);

  /**
   * 收集性能指标数据
   */
  const collectPerformanceMetrics = () => {
    setLoading(true);

    // 使用Performance API收集数据
    if (window.performance && "getEntriesByType" in window.performance) {
      // 使用PerformanceObserver API监听性能指标
      if ("PerformanceObserver" in window) {
        // 监听绘制相关指标 (FCP)
        try {
          const paintObserver = new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
              if (entry.name === "first-contentful-paint") {
                setMetrics((prev) => ({ ...prev, FCP: entry.startTime }));
              }
            }
          });
          paintObserver.observe({ type: "paint", buffered: true });
        } catch (e) {
          console.error("Paint metrics observation error:", e);
        }

        // 监听布局偏移 (CLS)
        try {
          let clsValue = 0;
          const clsObserver = new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
                setMetrics((prev) => ({ ...prev, CLS: clsValue }));
              }
            }
          });
          clsObserver.observe({ type: "layout-shift", buffered: true });
        } catch (e) {
          console.error("CLS observation error:", e);
        }

        // 监听最大内容绘制 (LCP)
        try {
          const lcpObserver = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            setMetrics((prev) => ({ ...prev, LCP: lastEntry.startTime }));
          });
          lcpObserver.observe({
            type: "largest-contentful-paint",
            buffered: true,
          });
        } catch (e) {
          console.error("LCP observation error:", e);
        }

        // 监听首次输入延迟 (FID)
        try {
          const fidObserver = new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
              setMetrics((prev) => ({
                ...prev,
                FID: entry.processingStart - entry.startTime,
              }));
            }
          });
          fidObserver.observe({ type: "first-input", buffered: true });
        } catch (e) {
          console.error("FID observation error:", e);
        }

        // 监听长任务，计算TBT
        try {
          let totalBlockingTime = 0;
          const longTaskObserver = new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
              // 长任务超过50ms的部分计入TBT
              const blockingTime = entry.duration - 50;
              if (blockingTime > 0) {
                totalBlockingTime += blockingTime;
                setMetrics((prev) => ({ ...prev, TBT: totalBlockingTime }));
              }
            }
          });
          longTaskObserver.observe({ type: "longtask", buffered: true });
        } catch (e) {
          console.error("Long task observation error:", e);
        }
      }

      // 获取导航计时数据
      const navEntry = performance.getEntriesByType("navigation")[0];
      if (navEntry) {
        // TTFB
        setMetrics((prev) => ({ ...prev, TTFB: navEntry.responseStart }));

        // 完全加载时间
        setMetrics((prev) => ({
          ...prev,
          TLT: navEntry.loadEventEnd - navEntry.fetchStart,
        }));
      }

      // 模拟一些难以直接获取的指标（实际项目中可能需要更复杂的计算或使用专门的库）
      setTimeout(() => {
        // 这里只是模拟，实际项目中应该使用更准确的方法
        setMetrics((prev) => ({
          ...prev,
          TTI: prev.FCP ? prev.FCP + 2000 : 3500, // 模拟TTI
          SI: prev.FCP ? prev.FCP * 1.2 : 3000, // 模拟速度指数
        }));

        setLoading(false);
        console.log("metrics", metrics);

        if (onDataCollected) {
          onDataCollected(metrics);
        }
      }, 1000);
    } else {
      console.error("Performance API not supported");
      setLoading(false);
    }
  };

  /**
   * 获取指标评级
   */
  const getMetricRating = (metricName, value) => {
    if (!value || !PERFORMANCE_METRICS[metricName]) return null;

    const thresholds = PERFORMANCE_METRICS[metricName].thresholds;

    // 特殊处理CLS，因为它不是时间单位
    if (metricName === "CLS") {
      if (value <= 0.1) return thresholds[0];
      if (value <= 0.25) return thresholds[1];
      return thresholds[2];
    }

    // 其他基于时间的指标（毫秒转换为秒）
    const valueInSeconds = value / 1000;

    if (
      valueInSeconds <=
      parseFloat(thresholds[0].range.split("-")[1].replace("s", ""))
    ) {
      return thresholds[0];
    } else if (
      valueInSeconds <=
      parseFloat(thresholds[1].range.split("-")[1].replace("s", ""))
    ) {
      return thresholds[1];
    } else {
      return thresholds[2];
    }
  };

  /**
   * 渲染指标卡片
   */
  const renderMetricCard = (metricKey) => {
    const metricInfo = PERFORMANCE_METRICS[metricKey];
    const value = metrics[metricKey];
    const rating = getMetricRating(metricKey, value);

    if (!metricInfo) return null;

    return (
      <div
        className={`bg-white rounded-md p-4 shadow hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-pointer ${
          activeMetric === metricKey ? "border-l-4 border-primary" : ""
        }`}
        key={metricKey}
        onClick={() =>
          setActiveMetric(activeMetric === metricKey ? null : metricKey)
        }
      >
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-base font-medium text-black-100 m-0">
            {metricInfo.name} ({metricKey})
          </h3>
          {rating && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: rating.color }}
            >
              {rating.rating}
            </span>
          )}
        </div>

        <div className="text-2xl font-bold my-2 text-black-200">
          {value !== undefined
            ? metricKey === "CLS"
              ? value.toFixed(3)
              : `${(value / 1000).toFixed(2)}s`
            : "加载中..."}
        </div>

        <div className="text-sm text-black-300 mb-3 leading-relaxed">
          {metricInfo.description}
        </div>

        {activeMetric === metricKey && showDetails && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-medium mb-2 text-black-100">
              性能分段:
            </h4>
            <ul className="pl-5 mb-3">
              {metricInfo.thresholds.map((threshold, idx) => (
                <li
                  key={idx}
                  className="mb-1 text-sm font-medium"
                  style={{ color: threshold.color }}
                >
                  {threshold.range}: {threshold.rating}
                </li>
              ))}
            </ul>

            <h4 className="text-sm font-medium mb-2 text-black-100">
              优化建议:
            </h4>
            <ul className="pl-5">
              {metricInfo.optimizationTips.map((tip, idx) => (
                <li
                  key={idx}
                  className="mb-2 text-sm text-black-300 leading-relaxed"
                >
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-5 bg-white-100 rounded-lg shadow">
      <h2 className="text-center text-2xl font-semibold mb-6 text-black-100">
        网页性能监控
      </h2>

      {loading ? (
        <div className="text-center py-8 text-lg text-black-300">
          收集性能数据中...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
          {Object.keys(PERFORMANCE_METRICS).map((key) => renderMetricCard(key))}
        </div>
      )}

      <div className="flex justify-center mt-5">
        <button
          onClick={collectPerformanceMetrics}
          disabled={loading}
          className="bg-primary text-white px-5 py-2 rounded-md font-medium hover:bg-opacity-90 transition-colors disabled:bg-opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? "收集中..." : "重新收集数据"}
        </button>
      </div>
    </div>
  );
};

export default PerformanceMonitor;
