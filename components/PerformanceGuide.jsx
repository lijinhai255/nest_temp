"use client";

import { useState } from "react";
import {
  PERFORMANCE_METRICS_CALCULATION,
  GENERAL_OPTIMIZATION_STRATEGIES,
} from "@/lib/performanceCalculation";

const PerformanceGuide = () => {
  const [activeMetric, setActiveMetric] = useState(null);
  const [activeTab, setActiveTab] = useState("calculation"); // calculation, nextjs, react
  const [activeStrategy, setActiveStrategy] = useState("nextjs"); // nextjs, react

  const handleMetricClick = (metricKey) => {
    setActiveMetric(activeMetric === metricKey ? null : metricKey);
  };

  const renderCalculationContent = (metricKey) => {
    const metric = PERFORMANCE_METRICS_CALCULATION[metricKey];
    if (!metric) return null;

    return (
      <div className="mt-4 space-y-4">
        <div className="bg-white-100 p-4 rounded-md">
          <h4 className="text-lg font-medium text-black-200 mb-2">计算原理</h4>
          <p className="text-black-300 whitespace-pre-line">
            {metric.calculation}
          </p>
        </div>

        <div className="bg-white-100 p-4 rounded-md">
          <h4 className="text-lg font-medium text-black-200 mb-2">计算公式</h4>
          <p className="text-black-300 font-mono bg-gray-100 p-2 rounded whitespace-pre-line">
            {metric.formula}
          </p>
        </div>

        <div className="bg-white-100 p-4 rounded-md">
          <h4 className="text-lg font-medium text-black-200 mb-2">
            API 使用示例
          </h4>
          <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto text-sm">
            <code className="text-black-200">{metric.apiUsage}</code>
          </pre>
        </div>
      </div>
    );
  };

  const renderOptimizationContent = (metricKey, platform) => {
    const metric = PERFORMANCE_METRICS_CALCULATION[metricKey];
    if (!metric) return null;

    const optimizationKey =
      platform === "nextjs" ? "nextjsOptimization" : "reactOptimization";
    const optimizations = metric[optimizationKey];

    if (!optimizations || optimizations.length === 0) {
      return <p className="text-black-300 italic">暂无优化建议</p>;
    }

    return (
      <div className="mt-4">
        <h4 className="text-lg font-medium text-black-200 mb-2">
          {platform === "nextjs" ? "Next.js" : "React"} 优化建议
        </h4>
        <ul className="list-disc pl-5 space-y-2">
          {optimizations.map((tip, index) => (
            <li key={index} className="text-black-300">
              {tip}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderGeneralOptimizationStrategies = (platform) => {
    const strategies = GENERAL_OPTIMIZATION_STRATEGIES[platform];

    return (
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-black-100">
          {platform === "nextjs" ? "Next.js" : "React"} 通用性能优化策略
        </h3>

        {strategies.map((category, index) => (
          <div key={index} className="bg-white p-4 rounded-md shadow">
            <h4 className="text-lg font-medium text-black-200 mb-3 border-b pb-2">
              {category.category}
            </h4>
            <ul className="list-disc pl-5 space-y-2">
              {category.techniques.map((technique, techIndex) => (
                <li key={techIndex} className="text-black-300">
                  {technique}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-5">
      <h2 className="text-3xl font-bold text-center text-black-200 mb-6">
        Web 性能指标计算原理与优化指南
      </h2>

      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium border ${
              activeTab === "calculation"
                ? "bg-primary text-white border-primary"
                : "bg-white text-black-300 border-gray-200 hover:bg-gray-100"
            } rounded-l-lg`}
            onClick={() => setActiveTab("calculation")}
          >
            计算原理
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium border-t border-b border-r ${
              activeTab === "nextjs"
                ? "bg-primary text-white border-primary"
                : "bg-white text-black-300 border-gray-200 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab("nextjs")}
          >
            Next.js 优化
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium border-t border-b border-r ${
              activeTab === "react"
                ? "bg-primary text-white border-primary"
                : "bg-white text-black-300 border-gray-200 hover:bg-gray-100"
            } rounded-r-md`}
            onClick={() => setActiveTab("react")}
          >
            React 优化
          </button>
        </div>
      </div>

      {activeTab === "calculation" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {Object.keys(PERFORMANCE_METRICS_CALCULATION).map((metricKey) => {
            const metric = PERFORMANCE_METRICS_CALCULATION[metricKey];
            return (
              <div
                key={metricKey}
                className={`bg-white rounded-md p-4 shadow cursor-pointer transition-all duration-300 hover:shadow-md ${
                  activeMetric === metricKey ? "border-l-4 border-primary" : ""
                }`}
                onClick={() => handleMetricClick(metricKey)}
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-black-100">
                    {metric.name} ({metricKey})
                  </h3>
                  <span className="text-sm text-black-300">
                    {activeMetric === metricKey ? "收起" : "展开"}
                  </span>
                </div>

                {activeMetric === metricKey &&
                  renderCalculationContent(metricKey)}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "nextjs" && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {Object.keys(PERFORMANCE_METRICS_CALCULATION).map((metricKey) => {
              const metric = PERFORMANCE_METRICS_CALCULATION[metricKey];
              return (
                <div
                  key={metricKey}
                  className={`bg-white rounded-md p-4 shadow cursor-pointer transition-all duration-300 hover:shadow-md ${
                    activeMetric === metricKey
                      ? "border-l-4 border-primary"
                      : ""
                  }`}
                  onClick={() => handleMetricClick(metricKey)}
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-black-100">
                      {metric.name} ({metricKey})
                    </h3>
                    <span className="text-sm text-black-300">
                      {activeMetric === metricKey ? "收起" : "展开"}
                    </span>
                  </div>

                  {activeMetric === metricKey &&
                    renderOptimizationContent(metricKey, "nextjs")}
                </div>
              );
            })}
          </div>

          <div className="mt-10">
            {renderGeneralOptimizationStrategies("nextjs")}
          </div>
        </div>
      )}

      {activeTab === "react" && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {Object.keys(PERFORMANCE_METRICS_CALCULATION).map((metricKey) => {
              const metric = PERFORMANCE_METRICS_CALCULATION[metricKey];
              return (
                <div
                  key={metricKey}
                  className={`bg-white rounded-md p-4 shadow cursor-pointer transition-all duration-300 hover:shadow-md ${
                    activeMetric === metricKey
                      ? "border-l-4 border-primary"
                      : ""
                  }`}
                  onClick={() => handleMetricClick(metricKey)}
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-black-100">
                      {metric.name} ({metricKey})
                    </h3>
                    <span className="text-sm text-black-300">
                      {activeMetric === metricKey ? "收起" : "展开"}
                    </span>
                  </div>

                  {activeMetric === metricKey &&
                    renderOptimizationContent(metricKey, "react")}
                </div>
              );
            })}
          </div>

          <div className="mt-10">
            {renderGeneralOptimizationStrategies("react")}
          </div>
        </div>
      )}

      <div className="mt-8 p-4 bg-primary-100 rounded-md">
        <h3 className="text-lg font-semibold text-black-200 mb-2">
          性能优化小贴士
        </h3>
        <p className="text-black-300">
          性能优化是一个持续的过程，需要根据具体应用场景和用户需求进行针对性优化。
          建议使用Lighthouse、WebPageTest等工具进行性能测试，识别瓶颈，然后有针对性地应用上述优化策略。
        </p>
      </div>
    </div>
  );
};

export default PerformanceGuide;
