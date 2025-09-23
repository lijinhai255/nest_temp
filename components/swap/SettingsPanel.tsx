"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Settings, Shield, RefreshCw } from "lucide-react";
import { SwapSettings } from "./types";

interface SettingsPanelProps {
  settings: SwapSettings;
  setSettings: (settings: SwapSettings | ((prev: SwapSettings) => SwapSettings)) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  setSettings,
}) => {
  return (
    <Card className="bg-gray-50 border-gray-200">
      <CardContent className="p-4">
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-800 flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            交易设置
          </h4>
          
          {/* 滑点设置 */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">滑点容忍度</Label>
              <span className="text-sm text-gray-500">{settings.slippageTolerance}%</span>
            </div>
            <Slider
              value={[settings.slippageTolerance]}
              onValueChange={([value]) => setSettings(prev => ({ ...prev, slippageTolerance: value }))}
              max={5}
              min={0.1}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between space-x-2">
              {[0.1, 0.5, 1.0, 2.0].map((value) => (
                <Button
                  key={value}
                  variant={settings.slippageTolerance === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSettings(prev => ({ ...prev, slippageTolerance: value }))}
                  className="text-xs flex-1"
                >
                  {value}%
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* 交易截止时间 */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">交易截止时间</Label>
              <span className="text-sm text-gray-500">{settings.deadline} 分钟</span>
            </div>
            <Slider
              value={[settings.deadline]}
              onValueChange={([value]) => setSettings(prev => ({ ...prev, deadline: value }))}
              max={60}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between space-x-2">
              {[5, 10, 20, 30].map((value) => (
                <Button
                  key={value}
                  variant={settings.deadline === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSettings(prev => ({ ...prev, deadline: value }))}
                  className="text-xs flex-1"
                >
                  {value}m
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Gas 价格设置 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Gas 价格策略</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['slow', 'standard', 'fast'] as const).map((speed) => (
                <Button
                  key={speed}
                  variant={settings.gasPrice === speed ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSettings(prev => ({ ...prev, gasPrice: speed }))}
                  className="text-xs"
                >
                  <div className="flex flex-col items-center">
                    <span className="capitalize">
                      {speed === 'slow' ? '慢速' : speed === 'standard' ? '标准' : '快速'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {speed === 'slow' ? '~5min' : speed === 'standard' ? '~2min' : '~30s'}
                    </span>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* 高级选项 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">高级选项</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span className="text-sm">MEV 保护</span>
                </div>
                <Button
                  variant={settings.enableMEV ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSettings(prev => ({ ...prev, enableMEV: !prev.enableMEV }))}
                  className="text-xs"
                >
                  {settings.enableMEV ? "开启" : "关闭"}
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">自动刷新</span>
                </div>
                <Button
                  variant={settings.autoRefresh ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSettings(prev => ({ ...prev, autoRefresh: !prev.autoRefresh }))}
                  className="text-xs"
                >
                  {settings.autoRefresh ? "开启" : "关闭"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SettingsPanel;