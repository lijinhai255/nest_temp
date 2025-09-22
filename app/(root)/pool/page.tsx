"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

import { useWallet } from "@/provider";
import PositionsTable from "@/components/PositionsTable";
import PoolTable from "@/components/PoolTable";

export default function Pool() {
  const [isPositionsOpen, setIsPositionsOpen] = useState("pool");
  const { isConnected } = useWallet();

  // 切换我的仓位显示状态
  const togglePositionsView = (type: string) => {
    setIsPositionsOpen(type);
  };

  return (
    <main className="min-h-screen p-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            {isConnected && (
              <>
                <Button
                  variant={isPositionsOpen === "pool" ? "default" : "outline"}
                  onClick={() => togglePositionsView("pool")}
                >
                  All Polls
                </Button>
                <Button
                  variant={
                    isPositionsOpen === "position" ? "default" : "outline"
                  }
                  onClick={() => togglePositionsView("position")}
                >
                  All Position
                </Button>
              </>
            )}
          </div>
        </div>

        {isPositionsOpen === "pool" && <PoolTable />}
        {isPositionsOpen === "position" && <PositionsTable />}
      </div>
    </main>
  );
}
