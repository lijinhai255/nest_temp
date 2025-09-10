"use client";

import { useState } from "react";
import PerformanceMonitor from "@/components/PerformanceMonitor";
import PerformanceGuide from "@/components/PerformanceGuide";

export default function PerformanceDashboard() {
  const [activeTab, setActiveTab] = useState("monitor"); // monitor, guide
  const [collectedData, setCollectedData] = useState(null);
  const [showDetails, setShowDetails] = useState(true);

  const handleDataCollected = (data) => {
    setCollectedData(data);
    console.log("Performance data collected:", data);
  };

  console.log("collectedData", collectedData);

              return (
                <div className="min-h-screen bg-gray-50 py-8">
                  <div className="container mx-auto px-4">
                    <div className="max-w-6xl mx-auto mb-8">
                      <h1 className="text-3xl font-bold text-center text-black-200 mb-2">
                        网页性能优化中心
                      </h1>
                      <p className="text-center text-black-300 mb-6">
                        监控、分析和优化关键性能指标，提升用户体验
                      </p>

                      <div className="flex justify-center mb-8">
                        <div
                          className="inline-flex rounded-md shadow-sm"
                          role="group"
                        >
                          <button
                            type="button"
                            className={`px-6 py-3 text-sm font-medium border ${
                              activeTab === "monitor"
                                ? "bg-primary text-white border-primary"
                                : "bg-white text-black-300 border-gray-200 hover:bg-gray-100"
                            } rounded-l-lg`}
                            onClick={() => setActiveTab("monitor")}
                          >
                            性能监控
                          </button>
                          <button
                            type="button"
                            className={`px-6 py-3 text-sm font-medium border-t border-b border-r ${
                              activeTab === "guide"
                                ? "bg-primary text-white border-primary"
                                : "bg-white text-black-300 border-gray-200 hover:bg-gray-100"
                            } rounded-r-md`}
                            onClick={() => setActiveTab("guide")}
                          >
                            优化指南
                          </button>
                        </div>
                      </div>

                      {activeTab === "monitor" && (
                        <>
                          <div className="bg-white rounded-lg shadow-md p-4 mb-8">
                            <h2 className="text-xl font-semibold mb-4">
                              监控控制面板
                            </h2>
                            <div className="flex items-center mb-4">
                              <label className="inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={showDetails}
                                  onChange={() => setShowDetails(!showDetails)}
                                  className="sr-only peer"
                                />
                                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                <span className="ms-3 text-sm font-medium text-gray-700">
                                  显示详细优化建议
                                </span>
                              </label>
                            </div>
                          </div>

                          <PerformanceMonitor
                            showDetails={showDetails}
                            onDataCollected={handleDataCollected}
                          />
                          {collectedData && (
                            <div className="max-w-4xl mx-auto mt-12 bg-white rounded-lg shadow-md p-6">
                              <h2 className="text-xl font-semibold mb-4">
                                性能数据摘要
                              </h2>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 border rounded-md">
                                  <h3 className="font-medium mb-2">
                                    关键渲染指标
                                  </h3>
                                  <ul className="space-y-2 text-sm">
                                    <li className="flex justify-between">
                                      <span className="text-black-300">
                                        首次内容绘制 (FCP):
                                      </span>
                                      <span className="font-medium">
                                        {collectedData.FCP
                                          ? `${(
                                              collectedData.FCP / 1000
                                            ).toFixed(2)}s`
                                          : "未收集"}
                                      </span>
                                    </li>
                                    <li className="flex justify-between">
                                      <span className="text-black-300">
                                        最大内容绘制 (LCP):
                                      </span>
                                      <span className="font-medium">
                                        {collectedData.LCP
                                          ? `${(
                                              collectedData.LCP / 1000
                                            ).toFixed(2)}s`
                                          : "未收集"}
                                      </span>
                                    </li>
                                    <li className="flex justify-between">
                                      <span className="text-black-300">
                                        累积布局偏移 (CLS):
                                      </span>
                                      <span className="font-medium">
                                        {collectedData.CLS
                                          ? collectedData.CLS.toFixed(3)
                                          : "未收集"}
                                      </span>
                                    </li>
                                  </ul>
                                </div>
                                <div className="p-4 border rounded-md">
                                  <h3 className="font-medium mb-2">交互指标</h3>
                                  <ul className="space-y-2 text-sm">
                                    <li className="flex justify-between">
                                      <span className="text-black-300">
                                        首次输入延迟 (FID):
                                      </span>
                                      <span className="font-medium">
                                        {collectedData.FID
                                          ? `${(
                                              collectedData.FID / 1000
                                            ).toFixed(2)}s`
                                          : "未收集"}
                                      </span>
                                    </li>
                                    <li className="flex justify-between">
                                      <span className="text-black-300">
                                        交互到可用时间 (TTI):
                                      </span>
                                      <span className="font-medium">
                                        {collectedData.TTI
                                          ? `${(
                                              collectedData.TTI / 1000
                                            ).toFixed(2)}s`
                                          : "未收集"}
                                      </span>
                                    </li>
                                    <li className="flex justify-between">
                                      <span className="text-black-300">
                                        总阻塞时间 (TBT):
                                      </span>
                                      <span className="font-medium">
                                        {collectedData.TBT
                                          ? `${(
                                              collectedData.TBT / 1000
                                            ).toFixed(2)}s`
                                          : "未收集"}
                                      </span>
                                    </li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {activeTab === "guide" && <PerformanceGuide />}
                    </div>
                  </div>
                </div>
              );
}
