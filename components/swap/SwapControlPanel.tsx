"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  RefreshCw,
  TrendingUp,
  BarChart3,
  Settings,
} from "lucide-react";
import { SwapQuote } from "./types";

interface SwapControlPanelProps {
  showTokenStats: boolean;
  setShowTokenStats: (value: boolean) => void;
  showSlippageSettings: boolean;
  setShowSlippageSettings: (value: boolean) => void;
  refreshQuote: () => void;
  handleRefreshBalances: () => void;
  quote: SwapQuote | null;
  isRefreshing: boolean;
}

const SwapControlPanel: React.FC<SwapControlPanelProps> = ({
  showTokenStats,
  setShowTokenStats,
  showSlippageSettings,
  setShowSlippageSettings,
  refreshQuote,
  handleRefreshBalances,
  quote,
  isRefreshing,
}) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex space-x-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefreshBalances}
              className="h-8 w-8"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>刷新余额 (Ctrl+R)</p></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshQuote}
              disabled={!quote}
              className="h-8 w-8"
            >
              <TrendingUp className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>刷新报价</p></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowTokenStats(!showTokenStats)}
              className={`h-8 w-8 ${showTokenStats ? 'bg-blue-100 text-blue-600' : ''}`}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>代币统计</p></TooltipContent>
        </Tooltip>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowSlippageSettings(!showSlippageSettings)}
        className={`h-8 w-8 ${showSlippageSettings ? 'bg-gray-100' : ''}`}
      >
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default SwapControlPanel;