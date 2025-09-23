"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Activity,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { Token } from "@/hooks/useTokenOptions";
import { SwapQuote, SwapSettings } from "./types";

interface SwapDetailsProps {
  quote: SwapQuote;
  token0: Token | null;
  token1: Token | null;
  outputAmount: string;
  settings: SwapSettings;
  getPriceImpactLevel: (value: number) => string;
  showDetailedAnalysis: boolean;
  setShowDetailedAnalysis: (value: boolean) => void;
  isAdvancedMode: boolean;
}

const SwapDetails: React.FC<SwapDetailsProps> = ({
  quote,
  token0,
  token1,
  outputAmount,
  settings,
  getPriceImpactLevel,
  showDetailedAnalysis,
  setShowDetailedAnalysis,
  isAdvancedMode,
}) => {
  return (
    <Card className="bg-gradient-to-r from-gray-50 to-blue-50 border-gray-200">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-800 flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              交易详情
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetailedAnalysis(!showDetailedAnalysis)}
              className="text-xs"
            >
              {showDetailedAnalysis ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">汇率:</span>
              <span className="font-medium">
                1 {token0?.symbol} = {quote.currentPriceFormatted || "N/A"} {token1?.symbol}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">价格影响:</span>
              <div className="flex items-center space-x-2">
                <span className={`font-medium ${
                  getPriceImpactLevel(quote.priceImpactV3) === "low" ? "text-green-600" :
                  getPriceImpactLevel(quote.priceImpactV3) === "medium" ? "text-yellow-600" :
                  getPriceImpactLevel(quote.priceImpactV3) === "high" ? "text-orange-600" : "text-red-600"
                }`}>
                  {quote.priceImpactV3Formatted || "N/A"}
                </span>
                {getPriceImpactLevel(quote.priceImpactV3) === "low" ? 
                  <CheckCircle className="h-3 w-3 text-green-600" /> :
                  getPriceImpactLevel(quote.priceImpactV3) === "medium" ? 
                  <AlertCircle className="h-3 w-3 text-yellow-600" /> :
                  <XCircle className="h-3 w-3 text-red-600" />
                }
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">最小接收:</span>
              <span className="font-medium">
                {(parseFloat(outputAmount) * (1 - settings.slippageTolerance / 100)).toFixed(6)} {token1?.symbol}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">交易费用:</span>
              <span className="font-medium">
                {quote.feeAmountFormatted || "0.3%"}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">预估 Gas:</span>
              <div className="text-right">
                <div className="font-medium">
                  {quote.gasEstimateFormatted || "N/A"}
                </div>
                <div className="text-xs text-gray-500">
                  ≈ ${((quote.gasEstimate || 0) * 0.00002).toFixed(4)}
                </div>
              </div>
            </div>

            {showDetailedAnalysis && (
              <>
                <Separator className="my-2" />
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">路由路径:</span>
                    <span className="font-medium text-xs">
                      {quote.isMultiHop ? "多跳交易" : "直接交易"}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">流动性状态:</span>
                    <Badge variant={
                      quote.liquidityStatus === 'sufficient' ? 'default' :
                      quote.liquidityStatus === 'low' ? 'secondary' : 'destructive'
                    }>
                      {quote.liquidityStatus === 'sufficient' ? '充足' :
                       quote.liquidityStatus === 'low' ? '较低' : '不足'}
                    </Badge>
                  </div>
                  
                  {isAdvancedMode && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">MEV 风险:</span>
                      <Badge variant="outline" className="text-xs">
                        {settings.enableMEV ? '已保护' : '未保护'}
                      </Badge>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SwapDetails;