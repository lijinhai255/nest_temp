// components/CooldownTimer.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Clock, CheckCircle, AlertCircle, Info } from "lucide-react";
import { Card } from "@/components/ui/card";

interface CooldownInfo {
  currentBlock: number;
  isReady: boolean;
  remainingBlocks: number;
  remainingSeconds: number;
  unlockTime: number;
  unstakeTime: number;
}

interface CooldownTimerProps {
  cooldownInfo: CooldownInfo;
  onComplete?: () => void;
  className?: string;
}

export const CooldownTimer: React.FC<CooldownTimerProps> = ({
  cooldownInfo,
  onComplete,
  className = "",
}) => {
  const [timeLeft, setTimeLeft] = useState(cooldownInfo.remainingSeconds);
  const [isComplete, setIsComplete] = useState(cooldownInfo.isReady);

  useEffect(() => {
    setTimeLeft(cooldownInfo.remainingSeconds);
    setIsComplete(cooldownInfo.isReady);
  }, [cooldownInfo]);

  useEffect(() => {
    if (isComplete || timeLeft <= 0) {
      if (!isComplete && timeLeft <= 0) {
        setIsComplete(true);
        onComplete?.();
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          setIsComplete(true);
          onComplete?.();
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isComplete, onComplete]);

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "00:00:00";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp: number) => {
    if (timestamp === 0) return "未设置";
    return new Date(timestamp * 1000).toLocaleString("zh-CN");
  };

  // 🆕 检查是否有有效的解质押数据
  const hasValidUnstakeData = () => {
    return cooldownInfo.unstakeTime > 0 || cooldownInfo.unlockTime > 0;
  };

  // 🆕 如果没有有效的解质押数据，显示提示
  if (!hasValidUnstakeData()) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center text-muted-foreground">
          <Info className="w-5 h-5 mr-2" />
          <span>暂无解质押记录</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* 状态标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {isComplete ? (
              <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
            ) : (
              <Clock className="w-5 h-5 text-blue-400 mr-2" />
            )}
            <span className="font-medium text-foreground">
              {isComplete ? "✅ 冷却完成" : "⏳ 冷却中"}
            </span>
          </div>

          <div
            className={`text-sm font-mono ${
              isComplete ? "text-green-400" : "text-blue-400"
            }`}
          >
            {isComplete ? "已就绪" : formatTime(timeLeft)}
          </div>
        </div>

        {/* 进度条 */}
        {!isComplete && cooldownInfo.remainingBlocks > 0 && (
          <div className="space-y-2">
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300 bg-blue-500"
                style={{
                  width: `${Math.max(
                    0,
                    100 - (cooldownInfo.remainingBlocks / 100) * 100
                  )}%`,
                }}
              />
            </div>

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>剩余 {cooldownInfo.remainingBlocks} 区块</span>
              <span>当前区块: {cooldownInfo.currentBlock}</span>
            </div>
          </div>
        )}

        {/* 详细信息 */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <div className="text-muted-foreground">解质押时间:</div>
            <div className="font-mono text-foreground">
              {formatTimestamp(cooldownInfo.unstakeTime)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-muted-foreground">解锁时间:</div>
            <div className="font-mono text-foreground">
              {formatTimestamp(cooldownInfo.unlockTime)}
            </div>
          </div>
        </div>

        {/* 状态提示 */}
        {isComplete ? (
          <div className="flex items-center text-green-400 text-sm bg-green-500/10 rounded-md p-3">
            <CheckCircle className="w-4 h-4 mr-2" />
            <span>🎉 冷却时间已结束，现在可以提取ETH了！</span>
          </div>
        ) : (
          <div className="flex items-center text-blue-400 text-sm bg-blue-500/10 rounded-md p-3">
            <Clock className="w-4 h-4 mr-2" />
            <span>⏰ 请等待冷却时间结束后再进行提取操作</span>
          </div>
        )}

        {/* 🆕 调试信息 */}
        <details className="text-xs">
          <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
            调试信息
          </summary>
          <div className="mt-2 p-2 bg-muted/50 rounded text-muted-foreground font-mono">
            <div>当前区块: {cooldownInfo.currentBlock}</div>
            <div>剩余区块: {cooldownInfo.remainingBlocks}</div>
            <div>剩余秒数: {cooldownInfo.remainingSeconds}</div>
            <div>是否就绪: {cooldownInfo.isReady ? "是" : "否"}</div>
            <div>解质押时间: {cooldownInfo.unstakeTime}</div>
            <div>解锁时间: {cooldownInfo.unlockTime}</div>
          </div>
        </details>
      </div>
    </Card>
  );
};
