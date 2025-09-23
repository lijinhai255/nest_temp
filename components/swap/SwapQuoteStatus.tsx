"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { SwapQuote } from "./types";

interface SwapQuoteStatusProps {
  quote: SwapQuote;
  isRefreshing: boolean;
  isQuoteStale: boolean;
}

const SwapQuoteStatus: React.FC<SwapQuoteStatusProps> = ({
  quote,
  isRefreshing,
  isQuoteStale,
}) => {
  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardContent className="p-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              quote.error ? "bg-red-500" :
              isRefreshing ? "bg-yellow-500 animate-pulse" :
              isQuoteStale ? "bg-orange-500" : "bg-green-500"
            }`}></div>
            <span className="font-medium">
              {quote.error ? "报价错误" :
               isRefreshing ? "更新中..." :
               isQuoteStale ? "报价过期" : "实时报价"}
            </span>
          </div>
          <div className="flex items-center space-x-1 text-gray-500">
            <Clock className="h-3 w-3" />
            <span className="text-xs">
              {new Date(quote.lastUpdated).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SwapQuoteStatus;