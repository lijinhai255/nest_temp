"use client";

import { useState, useEffect } from "react";
import { useCounterContract } from "@/hooks/useContract";
import { useEthersSigner } from "@/hooks/useEthersSigner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function CounterPage() {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const signer = useEthersSigner({ chainId: 11155111 }); // Sepolia chainId
  const counterContract = useCounterContract(signer);
  console.log("signer", signer);
  console.log("counterContract", counterContract);
  // 获取当前计数
  const fetchCount = async () => {
    try {
      const currentCount = await counterContract.x();
      setCount(Number(currentCount));
    } catch (error) {
      console.error("Error fetching count:", error);
    }
  };

  // 增加计数
  const handleIncrement = async () => {
    if (!signer) return;

    setLoading(true);
    try {
      const tx = await counterContract.inc();
      await tx.wait();
      await fetchCount();
    } catch (error) {
      console.error("Error incrementing:", error);
    } finally {
      setLoading(false);
    }
  };

  // 增加特定数值
  const handleIncrementBy = async () => {
    if (!signer) return;

    setLoading(true);
    try {
      const tx = await counterContract.incBy(3); // 增加3
      await tx.wait();
      await fetchCount();
    } catch (error) {
      console.error("Error incrementing by value:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (counterContract) {
      fetchCount();
    }
  }, [counterContract]);

  return (
    <div className="section_container">
      <div className="max-w-xl mx-auto">
        <Card className="border-[3px] border-black rounded-3xl overflow-hidden shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
          {/* 标题区域 */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 border-b-[3px] border-black">
            <h2 className="text-24-black text-center">Counter Contract</h2>
            <p className="text-center text-gray-600 mt-1">
              Interact with blockchain counter on Sepolia
            </p>
          </div>

          {/* 计数器显示区域 */}
          <div className="p-8 bg-white">
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-blue-100 transform -rotate-6"></div>
                <div className="relative bg-white border-[3px] border-black rounded-full h-32 w-32 flex items-center justify-center z-10 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <span className="text-30-bold">{count}</span>
                </div>
              </div>
            </div>

            <div className="text-center mb-6">
              <span className="category-tag">
                {`${counterContract?.target}`.slice(0, 6)}...
                {`${counterContract?.target}`.slice(-4)}
              </span>
            </div>

            <Separator className="border-dashed border-gray-300 my-6" />

            {/* 按钮区域 */}
            <div className="grid grid-cols-2 gap-6">
              <Button
                disabled={loading}
                onClick={handleIncrement}
                className="border-[2px] border-black bg-blue-100 hover:bg-blue-200 text-black h-14 rounded-xl font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-black animate-spin"></div>
                    <span>处理中...</span>
                  </div>
                ) : (
                  "增加 1"
                )}
              </Button>

              <Button
                disabled={loading}
                onClick={handleIncrementBy}
                className="border-[2px] border-black bg-purple-100 hover:bg-purple-200 text-black h-14 rounded-xl font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-black animate-spin"></div>
                    <span>处理中...</span>
                  </div>
                ) : (
                  "增加 3"
                )}
              </Button>
            </div>
          </div>

          {/* 底部状态栏 */}
          <div className="bg-gray-50 px-6 py-3 border-t-[3px] border-black flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${
                  signer ? "bg-green-500" : "bg-red-500"
                } border border-black`}
              ></div>
              <span className="text-sm font-medium">
                {signer ? "已连接钱包" : "未连接钱包"}
              </span>
            </div>
            <div className="text-sm font-medium">Sepolia 测试网</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
