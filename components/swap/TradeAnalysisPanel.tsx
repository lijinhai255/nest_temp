"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield } from "lucide-react";
import { TradeAnalysis } from "./types";

interface TradeAnalysisPanelProps {
  tradeAnalysis: TradeAnalysis;
}

const TradeAnalysisPanel: React.FC<TradeAnalysisPanelProps> = ({
  tradeAnalysis,
}) => {
  return (
    <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-purple-800 flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              智能分析
            </h4>
            <Badge 
              variant={tradeAnalysis.riskLevel === 'low' ? 'default' : 
                     tradeAnalysis.riskLevel === 'medium' ? 'secondary' : 'destructive'}
            >
              {tradeAnalysis.riskLevel === 'low' ? '低风险' :
               tradeAnalysis.riskLevel === 'medium' ? '中风险' :
               tradeAnalysis.riskLevel === 'high' ? '高风险' : '极高风险'}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">建议操作:</span>
              <Badge variant="outline" className="capitalize">
                {tradeAnalysis.recommendation === 'buy' ? '买入' :
                 tradeAnalysis.recommendation === 'sell' ? '卖出' :
                 tradeAnalysis.recommendation === 'hold' ? '持有' : '等待'}
              </Badge>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">信心指数:</span>
                <span className="text-sm font-medium">{tradeAnalysis.confidence}%</span>
              </div>
              <Progress value={tradeAnalysis.confidence} className="h-2" />
            </div>
            
            <div className="space-y-1">
              <span className="text-sm text-gray-600">分析原因:</span>
              {tradeAnalysis.reasons.map((reason, index) => (
                <div key={index} className="text-xs text-gray-500 flex items-center">
                  <div className="w-1 h-1 bg-purple-400 rounded-full mr-2"></div>
                  {reason}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TradeAnalysisPanel;