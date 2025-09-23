"use client";

import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { Token } from "@/hooks/useTokenOptions";
import { SwapSettings } from "./types";

interface TokenStatsPanelProps {
  allTokens: Token[];
  liquidityHealthScore: number;
  settings: SwapSettings;
  token0: Token | null;
  token1: Token | null;
}

const TokenStatsPanel: React.FC<TokenStatsPanelProps> = ({
  allTokens,
  liquidityHealthScore,
  settings,
  token0,
  token1,
}) => {
  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardContent className="p-4">
        <div className="space-y-3">
          <h4 className="font-semibold text-blue-800 flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            代币统计
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">可用代币:</span>
                <span className="font-medium">{allTokens.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">流动性评分:</span>
                <span className={`font-medium ${
                  liquidityHealthScore > 80 ? 'text-green-600' :
                  liquidityHealthScore > 60 ? 'text-yellow-600' :
                  liquidityHealthScore > 40 ? 'text-orange-600' : 'text-red-600'
                }`}>
                  {liquidityHealthScore || "N/A"}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">网络状态:</span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium text-green-600">正常</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gas 价格:</span>
                <span className="font-medium capitalize">{settings.gasPrice}</span>
              </div>
            </div>
            
            {token0 && (
              <div className="col-span-2 pt-2 border-t border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{token0.symbol} 余额:</span>
                  <div className="text-right">
                    <div className="font-medium">{parseFloat(token0.balance).toFixed(4)}</div>
                    <div className="text-xs text-gray-500">
                      ≈ ${(parseFloat(token0.balance) * 1.0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {token1 && (
              <div className="col-span-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{token1.symbol} 余额:</span>
                  <div className="text-right">
                    <div className="font-medium">{parseFloat(token1.balance).toFixed(4)}</div>
                    <div className="text-xs text-gray-500">
                      ≈ ${(parseFloat(token1.balance) * 1.0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TokenStatsPanel;