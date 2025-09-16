"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { usePublicClient } from "wagmi";
import { formatEther, formatGwei } from "viem";
import type { Log, Transaction, TransactionReceipt } from "viem";

// 🔧 核心数据类型
interface ContractCallDetail {
  id: string;
  timestamp: string;
  blockNumber: bigint;
  blockHash: string;
  transactionIndex: number;
  txHash: string;

  // 合约信息
  contractAddress: string;
  contractName: string;

  // 函数调用信息
  functionName: string;
  functionSignature?: string;
  functionParams?: FunctionParam[];

  // 交易详情
  from: string;
  to: string;
  value: bigint;
  gasLimit: bigint;
  gasUsed: bigint;
  gasPrice: bigint;
  effectiveGasPrice?: bigint;

  // 执行结果
  status: "success" | "reverted" | "failed";
  error?: string;
  revertReason?: string;

  // 事件和返回值
  events: ContractEvent[];
  logs: Log[];
  returnData?: unknown;

  // 性能指标
  duration?: number;
  confirmations?: number;
}

interface FunctionParam {
  name: string;
  type: string;
  value: unknown;
  decodedValue?: string;
}

interface ContractEvent {
  name: string;
  signature: string;
  topics: string[];
  data: string;
  decodedData?: Record<string, EventParam>;
  logIndex: number;
}

interface EventParam {
  type: string;
  value: unknown;
  formatted: string;
}

interface AbiFunction {
  name: string;
  type: "function";
  inputs: AbiInput[];
  outputs: AbiOutput[];
  stateMutability: string;
}

interface AbiEvent {
  name: string;
  type: "event";
  inputs: AbiEventInput[];
}

interface AbiInput {
  name: string;
  type: string;
  internalType?: string;
}

interface AbiOutput {
  name: string;
  type: string;
  internalType?: string;
}

interface AbiEventInput extends AbiInput {
  indexed?: boolean;
}

export type AbiItem =
  | AbiFunction
  | AbiEvent
  | { type: string; [key: string]: unknown };

interface ExtendedContractConfig {
  address: string;
  name: string;
  abi: AbiItem[];

  // 🔧 扩展配置
  description?: string;
  tags?: string[];
  priority?: "high" | "medium" | "low";

  // 监听配置
  watchEvents?: string[]; // 指定监听的事件，空则监听所有
  watchFunctions?: string[]; // 指定监听的函数，空则监听所有

  // 过滤配置
  filters?: {
    minValue?: bigint; // 最小交易价值
    maxGasPrice?: bigint; // 最大Gas价格
    fromAddresses?: string[]; // 指定发送者地址
    excludeAddresses?: string[]; // 排除的地址
  };

  // 通知配置
  notifications?: {
    onSuccess?: boolean;
    onFailure?: boolean;
    onHighGas?: boolean;
    onLargeValue?: boolean;
  };
}

interface ContractInterface {
  interface: EthersInterface;
  config: ExtendedContractConfig;
}

interface EthersInterface {
  parseTransaction: (tx: { data: string; value: string }) => ParsedTransaction;
  parseLog: (log: { topics: string[]; data: string }) => ParsedLog;
  fragments: unknown[];
}

interface ParsedTransaction {
  name: string;
  signature: string;
  args: unknown[];
  fragment: {
    inputs: AbiInput[];
  };
}

interface ParsedLog {
  name: string;
  signature: string;
  args: unknown[];
  fragment: {
    inputs: AbiEventInput[];
  };
}

interface AdvancedContractMonitorProps {
  contracts: ExtendedContractConfig[];
  className?: string;
  maxRecords?: number;

  // 回调函数
  onCallDetected?: (detail: ContractCallDetail) => void;
  onContractAdded?: (contract: ExtendedContractConfig) => void;
  onContractRemoved?: (address: string) => void;

  // 高级配置
  realTimeMode?: boolean; // 实时模式 vs 批量模式
  batchSize?: number; // 批量处理大小
  pollingInterval?: number; // 轮询间隔（毫秒）
}

const AdvancedContractMonitor: React.FC<AdvancedContractMonitorProps> = ({
  contracts = [],
  className = "",
  maxRecords = 200,
  onCallDetected,
  onContractAdded,
  onContractRemoved,
  realTimeMode = true,
  batchSize = 10,
  pollingInterval = 1000,
}) => {
  const publicClient = usePublicClient();

  // 状态管理
  const [callDetails, setCallDetails] = useState<ContractCallDetail[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [activeContracts, setActiveContracts] =
    useState<ExtendedContractConfig[]>(contracts);
  const [stats, setStats] = useState({
    totalCalls: 0,
    successRate: 0,
    avgGasUsed: 0,
    totalValue: BigInt(0),
    uniqueCallers: new Set<string>(),
  });

  // 监听器管理
  const unsubscribeFunctions = useRef<Map<string, () => void>>(new Map());
  const processedTxs = useRef<Set<string>>(new Set());
  const contractInterfaces = useRef<Map<string, ContractInterface>>(new Map());
  const pendingTxs = useRef<Map<string, Transaction>>(new Map());

  // 🔧 初始化合约接口
  const initializeContractInterfaces = useCallback(async () => {
    console.log("🔧 初始化合约接口...");

    try {
      const { ethers } = await import("ethers");

      for (const contract of activeContracts) {
        const iface = new ethers.Interface(contract.abi);
        contractInterfaces.current.set(contract.address.toLowerCase(), {
          interface: iface as unknown as EthersInterface,
          config: contract,
        });

        console.log(`✅ ${contract.name} 接口已初始化`);
      }
    } catch (error) {
      console.error("❌ 初始化合约接口失败:", error);
    }
  }, [activeContracts]);

  // 🔧 高级函数调用解析
  const parseAdvancedFunctionCall = useCallback(
    (
      contractAddress: string,
      input: string,
      value: bigint
    ): {
      name: string;
      signature?: string;
      params?: FunctionParam[];
    } => {
      if (!input || input === "0x" || input.length < 10) {
        return { name: "fallback" };
      }

      const contractInfo = contractInterfaces.current.get(
        contractAddress.toLowerCase()
      );
      if (!contractInfo) {
        return { name: `unknown(${input.slice(0, 10)})` };
      }

      try {
        const decoded = contractInfo.interface.parseTransaction({
          data: input,
          value: value.toString(),
        });

        const params: FunctionParam[] = decoded.args.map(
          (arg: unknown, index: number) => {
            const input = decoded.fragment.inputs[index];
            return {
              name: input.name || `param${index}`,
              type: input.type,
              value: arg,
              decodedValue: formatParameterValue(arg, input.type),
            };
          }
        );

        return {
          name: decoded.name,
          signature: decoded.signature,
          params,
        };
      } catch (error) {
        console.warn("解析函数调用失败:", error);
        return { name: `unknown(${input.slice(0, 10)})` };
      }
    },
    []
  );

  // 🔧 参数值格式化
  const formatParameterValue = useCallback(
    (value: unknown, type: string): string => {
      try {
        if (type.includes("uint") || type.includes("int")) {
          return String(value);
        } else if (type === "address") {
          return String(value);
        } else if (type === "bool") {
          return value ? "true" : "false";
        } else if (type.includes("bytes")) {
          return String(value);
        } else if (type === "string") {
          return String(value);
        } else if (type.includes("[]")) {
          return Array.isArray(value) ? `[${value.length} items]` : "[0 items]";
        } else {
          return String(value);
        }
      } catch (error) {
        return "解析失败";
      }
    },
    []
  );

  // 🔧 高级事件解析
  const parseAdvancedEvents = useCallback(
    (contractAddress: string, logs: Log[]): ContractEvent[] => {
      const contractInfo = contractInterfaces.current.get(
        contractAddress.toLowerCase()
      );
      if (!contractInfo) return [];

      const events: ContractEvent[] = [];

      for (const log of logs) {
        if (log.address.toLowerCase() !== contractAddress.toLowerCase())
          continue;

        try {
          const decoded = contractInfo.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });

          const decodedData: Record<string, EventParam> = {};
          decoded.args.forEach((arg: unknown, index: number) => {
            const eventInput = decoded.fragment.inputs[index];
            decodedData[eventInput.name] = {
              type: eventInput.type,
              value: arg,
              formatted: formatParameterValue(arg, eventInput.type),
            };
          });

          events.push({
            name: decoded.name,
            signature: decoded.signature,
            topics: log.topics as string[],
            data: log.data,
            decodedData,
            logIndex: log.logIndex || 0,
          });
        } catch (error) {
          console.warn("解析事件失败:", error);
          events.push({
            name: "UnknownEvent",
            signature: "unknown",
            topics: log.topics as string[],
            data: log.data,
            logIndex: log.logIndex || 0,
          });
        }
      }

      return events;
    },
    [formatParameterValue]
  );

  // 🔧 检查过滤条件
  const shouldProcessTransaction = useCallback(
    (
      contract: ExtendedContractConfig,
      transaction: Transaction,
      receipt: TransactionReceipt
    ): boolean => {
      const filters = contract.filters;
      if (!filters) return true;

      // 检查最小价值
      if (filters.minValue && transaction.value < filters.minValue) {
        return false;
      }

      // 检查最大Gas价格
      if (
        filters.maxGasPrice &&
        transaction.gasPrice &&
        transaction.gasPrice > filters.maxGasPrice
      ) {
        return false;
      }

      // 检查发送者地址
      if (filters.fromAddresses && filters.fromAddresses.length > 0) {
        if (
          !filters.fromAddresses.some(
            (addr) => addr.toLowerCase() === transaction.from.toLowerCase()
          )
        ) {
          return false;
        }
      }

      // 检查排除地址
      if (filters.excludeAddresses && filters.excludeAddresses.length > 0) {
        if (
          filters.excludeAddresses.some(
            (addr) => addr.toLowerCase() === transaction.from.toLowerCase()
          )
        ) {
          return false;
        }
      }

      return true;
    },
    []
  );

  // 🔧 发送通知
  const sendNotification = useCallback(
    (contract: ExtendedContractConfig, detail: ContractCallDetail) => {
      const notifications = contract.notifications;
      if (!notifications) return;

      let shouldNotify = false;
      let message = "";

      if (notifications.onSuccess && detail.status === "success") {
        shouldNotify = true;
        message = `${contract.name} 调用成功`;
      } else if (notifications.onFailure && detail.status !== "success") {
        shouldNotify = true;
        message = `${contract.name} 调用失败`;
      } else if (notifications.onHighGas && detail.gasUsed > BigInt(500000)) {
        shouldNotify = true;
        message = `${contract.name} 高Gas消耗: ${detail.gasUsed.toString()}`;
      } else if (notifications.onLargeValue && detail.value > BigInt(0)) {
        shouldNotify = true;
        message = `${contract.name} 大额交易: ${formatEther(detail.value)} ETH`;
      }

      if (shouldNotify) {
        toast({
          title: "合约监听通知",
          description: message,
        });
      }
    },
    []
  );

  // 🔧 核心事件处理器 - 修复类型问题
  const processContractEvent = useCallback(
    async (contract: ExtendedContractConfig, log: Log) => {
      try {
        const txHash = log.transactionHash;
        if (!txHash) return;

        // 避免重复处理
        if (processedTxs.current.has(txHash)) return;
        processedTxs.current.add(txHash);

        console.log(`🔍 处理合约事件: ${contract.name} - ${txHash}`);

        // 获取完整交易信息
        const [transaction, receipt, block] = await Promise.all([
          publicClient?.getTransaction({ hash: txHash }),
          publicClient?.getTransactionReceipt({ hash: txHash }),
          publicClient?.getBlock({
            blockHash: log.blockHash as `0x${string}`, // 类型断言，因为我们知道这里不会是 null
          }),
        ]);

        if (!transaction || !receipt || !block) {
          console.warn("获取交易信息失败");
          return;
        }

        // 检查过滤条件
        if (!shouldProcessTransaction(contract, transaction, receipt)) {
          console.log("交易被过滤器排除");
          return;
        }

        // 解析函数调用
        const functionCall = parseAdvancedFunctionCall(
          contract.address,
          transaction.input,
          transaction.value
        );

        // 解析所有相关事件
        const events = parseAdvancedEvents(contract.address, receipt.logs);

        // 获取确认数
        const latestBlock = await publicClient?.getBlockNumber();
        const confirmations = latestBlock
          ? Number(latestBlock - receipt.blockNumber)
          : 0;

        // 构建详细信息
        const detail: ContractCallDetail = {
          id: `${txHash}-${log.logIndex || 0}`,
          timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
          blockNumber: receipt.blockNumber,
          blockHash: receipt.blockHash,
          transactionIndex: receipt.transactionIndex,
          txHash,

          contractAddress: contract.address,
          contractName: contract.name,

          functionName: functionCall.name,
          functionSignature: functionCall.signature,
          functionParams: functionCall.params,

          from: transaction.from,
          to: transaction.to || "",
          value: transaction.value,
          gasLimit: transaction.gas,
          gasUsed: receipt.gasUsed,
          gasPrice: transaction.gasPrice || BigInt(0),
          effectiveGasPrice: receipt.effectiveGasPrice || undefined, // 处理可能的 null 值

          status: receipt.status === "success" ? "success" : "reverted",

          events,
          logs: receipt.logs.filter(
            (l) => l.address.toLowerCase() === contract.address.toLowerCase()
          ),

          confirmations,
        };

        // 🔧 修复：使用函数式更新确保状态正确更新
        setCallDetails((prevDetails) => {
          // 检查是否已存在（双重保护）
          if (prevDetails.some((d) => d.id === detail.id)) {
            return prevDetails;
          }

          const newDetails = [detail, ...prevDetails].slice(0, maxRecords);

          // 立即更新统计信息
          const totalCalls = newDetails.length;
          const successCount = newDetails.filter(
            (d) => d.status === "success"
          ).length;
          const totalGasUsed = newDetails.reduce(
            (sum, d) => sum + Number(d.gasUsed),
            0
          );
          const totalValue = newDetails.reduce(
            (sum, d) => sum + d.value,
            BigInt(0)
          );
          const uniqueCallers = new Set(newDetails.map((d) => d.from));

          // 使用 setTimeout 确保统计信息在下一个事件循环中更新
          setTimeout(() => {
            setStats({
              totalCalls,
              successRate:
                totalCalls > 0
                  ? Math.round((successCount / totalCalls) * 100)
                  : 100,
              avgGasUsed:
                totalCalls > 0 ? Math.round(totalGasUsed / totalCalls) : 0,
              totalValue,
              uniqueCallers,
            });
          }, 0);

          return newDetails;
        });

        // 发送回调
        onCallDetected?.(detail);

        // 发送通知
        sendNotification(contract, detail);

        console.log(`✅ 合约调用详情已记录: ${detail.functionName}`);
      } catch (error) {
        console.error("处理合约事件失败:", error);
      }
    },
    [
      publicClient,
      shouldProcessTransaction,
      parseAdvancedFunctionCall,
      parseAdvancedEvents,
      maxRecords,
      onCallDetected,
      sendNotification,
    ]
  );

  // 🔧 设置事件监听器
  const setupEventListeners = useCallback(async () => {
    if (!publicClient || activeContracts.length === 0) return;

    console.log("🎯 设置高级事件监听器...");

    for (const contract of activeContracts) {
      try {
        // 监听该合约的所有事件
        const unsubscribe = publicClient.watchContractEvent({
          address: contract.address as `0x${string}`,
          abi: contract.abi,
          onLogs: async (logs) => {
            console.log(`📡 ${contract.name} 事件触发:`, logs.length);

            if (realTimeMode) {
              // 实时模式：立即处理每个事件
              for (const log of logs) {
                await processContractEvent(contract, log);
              }
            } else {
              // 批量模式：收集事件后批量处理
              const batches = [];
              for (let i = 0; i < logs.length; i += batchSize) {
                batches.push(logs.slice(i, i + batchSize));
              }

              for (const batch of batches) {
                await Promise.all(
                  batch.map((log) => processContractEvent(contract, log))
                );
                // 批量间隔
                if (batches.length > 1) {
                  await new Promise((resolve) => setTimeout(resolve, 100));
                }
              }
            }
          },
        });

        unsubscribeFunctions.current.set(contract.address, unsubscribe);
        console.log(`✅ ${contract.name} 事件监听已设置`);
      } catch (error) {
        console.error(`❌ 设置 ${contract.name} 事件监听失败:`, error);
      }
    }
  }, [
    publicClient,
    activeContracts,
    realTimeMode,
    batchSize,
    processContractEvent,
  ]);

  // 🔧 开始监听
  const startMonitoring = useCallback(async () => {
    if (isMonitoring) return;

    console.log("🚀 开始高级合约监听...");
    setIsMonitoring(true);

    // 初始化合约接口
    await initializeContractInterfaces();

    // 设置事件监听器
    await setupEventListeners();

    toast({
      title: "监听已开始",
      description: `正在监听 ${activeContracts.length} 个合约`,
    });
  }, [
    isMonitoring,
    activeContracts.length,
    initializeContractInterfaces,
    setupEventListeners,
  ]);

  // 🔧 停止监听
  const stopMonitoring = useCallback(() => {
    console.log("🛑 停止合约监听...");

    // 清理所有监听器
    unsubscribeFunctions.current.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch (error) {
        console.warn("清理监听器失败:", error);
      }
    });
    unsubscribeFunctions.current.clear();

    setIsMonitoring(false);
    processedTxs.current.clear();

    toast({
      title: "监听已停止",
      description: "所有合约监听已停止",
    });
  }, []);

  // 🔧 动态添加合约
  const addContract = useCallback(
    (contract: ExtendedContractConfig) => {
      setActiveContracts((prev) => {
        if (
          prev.some(
            (c) => c.address.toLowerCase() === contract.address.toLowerCase()
          )
        ) {
          toast({
            title: "合约已存在",
            description: "该合约地址已在监听列表中",
            variant: "destructive",
          });
          return prev;
        }

        const newContracts = [...prev, contract];
        onContractAdded?.(contract);

        toast({
          title: "合约已添加",
          description: `${contract.name} 已添加到监听列表`,
        });

        return newContracts;
      });
    },
    [onContractAdded]
  );

  // 🔧 移除合约
  const removeContract = useCallback(
    (address: string) => {
      setActiveContracts((prev) => {
        const filtered = prev.filter(
          (c) => c.address.toLowerCase() !== address.toLowerCase()
        );

        // 清理该合约的监听器
        const unsubscribe = unsubscribeFunctions.current.get(address);
        if (unsubscribe) {
          unsubscribe();
          unsubscribeFunctions.current.delete(address);
        }

        // 清理接口缓存
        contractInterfaces.current.delete(address.toLowerCase());

        onContractRemoved?.(address);

        toast({
          title: "合约已移除",
          description: "合约已从监听列表中移除",
        });

        return filtered;
      });
    },
    [onContractRemoved]
  );

  // 🔧 清空记录
  const clearRecords = useCallback(() => {
    setCallDetails([]);
    processedTxs.current.clear();
    setStats({
      totalCalls: 0,
      successRate: 0,
      avgGasUsed: 0,
      totalValue: BigInt(0),
      uniqueCallers: new Set(),
    });

    toast({
      title: "记录已清空",
      description: "所有监听记录已删除",
    });
  }, []);

  // 🔧 组件卸载清理
  useEffect(() => {
    return () => {
      if (isMonitoring) {
        stopMonitoring();
      }
    };
  }, [isMonitoring, stopMonitoring]);

  // 🔧 合约配置变化时重新初始化
  useEffect(() => {
    if (isMonitoring) {
      // 重新初始化
      stopMonitoring();
      setTimeout(() => {
        startMonitoring();
      }, 1000);
    }
  }, [activeContracts]);

  // 🔧 格式化函数
  const formatAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  const formatValue = (value: unknown) => {
    if (value === null || value === undefined) return "无";
    if (typeof value === "bigint") {
      return value > BigInt(0) ? formatEther(value) + " ETH" : "0 ETH";
    }
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  console.log("activeContracts", activeContracts);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>高级合约监听器</span>
          <div className="flex items-center gap-2">
            <Badge variant={isMonitoring ? "default" : "secondary"}>
              {isMonitoring ? "监听中" : "未启动"}
            </Badge>

            {!isMonitoring ? (
              <Button
                size="sm"
                onClick={startMonitoring}
                disabled={activeContracts.length === 0}
                className="text-white"
              >
                开始监听
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={stopMonitoring}
                className="text-white"
              >
                停止监听
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={clearRecords}>
              清空记录
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 🔧 高级统计面板 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-500">总调用次数</h3>
            <p className="text-2xl font-bold text-blue-600">
              {stats.totalCalls}
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-500">成功率</h3>
            <p className="text-2xl font-bold text-green-600">
              {stats.successRate}%
            </p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-500">平均Gas</h3>
            <p className="text-2xl font-bold text-orange-600">
              {stats.avgGasUsed.toLocaleString()}
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-500">总价值</h3>
            <p className="text-2xl font-bold text-purple-600">
              {formatEther(stats.totalValue).slice(0, 8)} ETH
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-500">唯一调用者</h3>
            <p className="text-2xl font-bold text-gray-600">
              {stats.uniqueCallers.size}
            </p>
          </div>
        </div>

        {/* 🔧 合约配置面板 */}
        <div className="p-4 bg-gray-50 rounded-lg border">
          <h4 className="font-medium mb-3">
            监听合约 ({activeContracts.length})
          </h4>
          <div className="space-y-2">
            {activeContracts.map((contract, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-white rounded border"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{contract.name}</span>
                    {contract.priority && (
                      <Badge className={getPriorityColor(contract.priority)}>
                        {contract.priority}
                      </Badge>
                    )}
                    {contract.tags?.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-sm text-gray-500 mt-10">
                    <span className="font-mono">
                      {formatAddress(contract.address)}
                    </span>
                    {contract.description && (
                      <span className="ml-2">• {contract.description}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {
                      contract.abi.filter((item) => item.type === "function")
                        .length
                    }{" "}
                    函数
                  </Badge>
                  <Badge variant="outline">
                    {
                      contract.abi.filter((item) => item.type === "event")
                        .length
                    }{" "}
                    事件
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeContract(contract.address)}
                  >
                    移除
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 🔧 详细调用记录表格 */}
        <div>
          <h3 className="text-lg font-semibold mb-3">调用详情记录</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    时间/区块
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    合约
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    函数调用
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    调用者
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Gas/价值
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    状态
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    事件/返回值
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    交易
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {callDetails.length > 0 ? (
                  callDetails.map((detail) => (
                    <tr key={detail.id} className="hover:bg-gray-50">
                      {/* 时间/区块 */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div>
                          <div className="font-medium text-gray-900">
                            {new Date(detail.timestamp).toLocaleTimeString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            #{Number(detail.blockNumber).toLocaleString()}
                          </div>
                          {detail.confirmations !== undefined && (
                            <div className="text-xs text-green-600">
                              {detail.confirmations} 确认
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 合约信息 */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div>
                          <div className="font-medium text-gray-900">
                            {detail.contractName}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">
                            {formatAddress(detail.contractAddress)}
                          </div>
                        </div>
                      </td>

                      {/* 函数调用详情 */}
                      <td className="px-4 py-3 text-sm">
                        <div className="space-y-1">
                          <div className="font-mono font-semibold text-blue-600">
                            {detail.functionName}
                          </div>
                          {detail.functionSignature && (
                            <div className="text-xs text-gray-500">
                              {detail.functionSignature}
                            </div>
                          )}
                          {detail.functionParams &&
                            detail.functionParams.length > 0 && (
                              <div className="text-xs space-y-1">
                                {detail.functionParams.map((param, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-1"
                                  >
                                    <span className="text-purple-600 font-medium">
                                      {param.name}:
                                    </span>
                                    <span className="text-gray-600">
                                      {param.decodedValue ||
                                        String(param.value) ||
                                        "N/A"}
                                    </span>
                                    <span className="text-gray-400">
                                      ({param.type})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                      </td>

                      {/* 调用者信息 */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div>
                          <div className="font-mono text-gray-900">
                            {formatAddress(detail.from)}
                          </div>
                          {detail.to !== detail.contractAddress && (
                            <div className="text-xs text-gray-500">
                              → {formatAddress(detail.to)}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Gas和价值 */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="space-y-1">
                          <div className="text-xs">
                            <span className="text-gray-500">Used:</span>
                            <span className="ml-1 font-medium text-orange-600">
                              {Number(detail.gasUsed).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-xs">
                            <span className="text-gray-500">Price:</span>
                            <span className="ml-1 text-blue-600">
                              {formatGwei(detail.gasPrice)} Gwei
                            </span>
                          </div>
                          {detail.value > BigInt(0) && (
                            <div className="text-xs">
                              <span className="text-gray-500">Value:</span>
                              <span className="ml-1 font-medium text-green-600">
                                {formatEther(detail.value).slice(0, 8)} ETH
                              </span>
                            </div>
                          )}
                          {detail.effectiveGasPrice &&
                            detail.effectiveGasPrice !== detail.gasPrice && (
                              <div className="text-xs">
                                <span className="text-gray-500">
                                  Effective:
                                </span>
                                <span className="ml-1 text-purple-600">
                                  {formatGwei(detail.effectiveGasPrice)} Gwei
                                </span>
                              </div>
                            )}
                        </div>
                      </td>

                      {/* 执行状态 */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="space-y-1">
                          <Badge
                            variant={
                              detail.status === "success"
                                ? "default"
                                : "destructive"
                            }
                            className="text-xs"
                          >
                            {detail.status === "success"
                              ? "成功"
                              : detail.status === "reverted"
                              ? "回滚"
                              : "失败"}
                          </Badge>
                          {detail.error && (
                            <div
                              className="text-xs text-red-600 max-w-32 truncate"
                              title={detail.error}
                            >
                              {detail.error}
                            </div>
                          )}
                          {detail.revertReason && (
                            <div
                              className="text-xs text-orange-600 max-w-32 truncate"
                              title={detail.revertReason}
                            >
                              {detail.revertReason}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 事件和返回值 */}
                      <td className="px-4 py-3 text-sm">
                        <div className="space-y-1 max-w-48">
                          {detail.events.length > 0 ? (
                            detail.events.map((event, idx) => (
                              <div key={idx} className="text-xs">
                                <div className="font-medium text-green-600">
                                  {event.name}
                                </div>
                                {event.decodedData && (
                                  <div className="text-gray-600 space-y-1">
                                    {Object.entries(event.decodedData).map(
                                      ([key, value]) => (
                                        <div
                                          key={key}
                                          className="flex items-start gap-1"
                                        >
                                          <span className="text-purple-600">
                                            {key}:
                                          </span>
                                          <span className="break-all">
                                            {value.formatted ||
                                              String(value.value) ||
                                              "N/A"}
                                          </span>
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : detail.returnData ? (
                            <div className="text-xs text-gray-600">
                              <div className="font-medium">返回值:</div>
                              <div className="break-all">
                                {formatValue(detail.returnData)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">
                              无事件
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 交易链接 */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="space-y-1">
                          <a
                            href={`https://sepolia.etherscan.io/tx/${detail.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-blue-600 hover:text-blue-800 block"
                          >
                            {formatAddress(detail.txHash)}
                          </a>
                          <div className="text-xs text-gray-500">
                            Index: {detail.transactionIndex}
                          </div>
                          {detail.duration && (
                            <div className="text-xs text-orange-600">
                              {detail.duration}ms
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      {isMonitoring
                        ? "等待合约调用..."
                        : activeContracts.length > 0
                        ? "点击'开始监听'来监控合约调用"
                        : "请先添加要监听的合约"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 🔧 高级功能面板 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 监听模式配置 */}
          <div className="p-4 bg-blue-50 rounded-lg border">
            <h4 className="font-medium mb-3">监听配置</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>监听模式:</span>
                <Badge variant="outline">
                  {realTimeMode ? "实时模式" : "批量模式"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>批量大小:</span>
                <span className="font-medium">{batchSize}</span>
              </div>
              <div className="flex justify-between">
                <span>轮询间隔:</span>
                <span className="font-medium">{pollingInterval}ms</span>
              </div>
              <div className="flex justify-between">
                <span>最大记录:</span>
                <span className="font-medium">{maxRecords}</span>
              </div>
            </div>
          </div>

          {/* 性能统计 */}
          <div className="p-4 bg-green-50 rounded-lg border">
            <h4 className="font-medium mb-3">性能统计</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>活跃监听器:</span>
                <span className="font-medium text-green-600">
                  {unsubscribeFunctions.current.size}
                </span>
              </div>
              <div className="flex justify-between">
                <span>已处理交易:</span>
                <span className="font-medium">{processedTxs.current.size}</span>
              </div>
              <div className="flex justify-between">
                <span>缓存接口:</span>
                <span className="font-medium">
                  {contractInterfaces.current.size}
                </span>
              </div>
              <div className="flex justify-between">
                <span>待处理交易:</span>
                <span className="font-medium">{pendingTxs.current.size}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 🔧 调试和测试工具 */}
        <details className="p-4 bg-gray-50 rounded-lg border">
          <summary className="cursor-pointer font-medium text-gray-800 hover:text-gray-600">
            🔧 调试工具
          </summary>
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  console.log("🔍 当前状态:", {
                    isMonitoring,
                    activeContracts: activeContracts.length,
                    callDetails: callDetails.length,
                    stats,
                    unsubscribeFunctions: unsubscribeFunctions.current.size,
                    contractInterfaces: contractInterfaces.current.size,
                    processedTxs: processedTxs.current.size,
                  });
                }}
              >
                输出状态
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // 清理所有缓存
                  processedTxs.current.clear();
                  pendingTxs.current.clear();
                  contractInterfaces.current.clear();

                  toast({
                    title: "缓存已清理",
                    description: "所有内部缓存已清空",
                  });
                }}
              >
                清理缓存
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  // 重新初始化所有接口
                  contractInterfaces.current.clear();
                  await initializeContractInterfaces();

                  toast({
                    title: "接口已重新初始化",
                    description: "所有合约接口已重新加载",
                  });
                }}
              >
                重新初始化
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // 导出监听数据
                  const exportData = {
                    timestamp: new Date().toISOString(),
                    stats,
                    contracts: activeContracts.map((c) => ({
                      name: c.name,
                      address: c.address,
                      priority: c.priority,
                      tags: c.tags,
                    })),
                    callDetails: callDetails.slice(0, 50), // 只导出前50条
                  };

                  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `contract-monitor-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);

                  toast({
                    title: "数据已导出",
                    description: "监听数据已导出为JSON文件",
                  });
                }}
              >
                导出数据
              </Button>
            </div>

            {/* 详细调试信息 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-white rounded border">
                <h5 className="font-medium mb-2">合约接口状态</h5>
                {Array.from(contractInterfaces.current.entries()).map(
                  ([address, info]) => (
                    <div key={address} className="mb-2">
                      <div className="font-mono text-blue-600">
                        {formatAddress(address)}
                      </div>
                      <div className="text-gray-500">
                        {info.config.name} -{" "}
                        {(info.interface.fragments as unknown[]).length} 方法
                      </div>
                    </div>
                  )
                )}
              </div>

              <div className="p-3 bg-white rounded border">
                <h5 className="font-medium mb-2">监听器状态</h5>
                {Array.from(unsubscribeFunctions.current.keys()).map(
                  (address) => (
                    <div key={address} className="mb-1">
                      <span className="font-mono text-green-600">
                        {formatAddress(address)}
                      </span>
                      <span className="ml-2 text-gray-500">✅ 活跃</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </details>

        {/* 🔧 合约详情展开面板 */}
        {activeContracts.length > 0 && (
          <details className="p-4 bg-gray-50 rounded-lg border">
            <summary className="cursor-pointer font-medium text-gray-800 hover:text-gray-600">
              📋 合约详细信息
            </summary>
            <div className="mt-4 space-y-4">
              {activeContracts.map((contract, index) => (
                <div key={index} className="p-4 bg-white rounded border">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h5 className="font-medium text-lg">{contract.name}</h5>
                      <p className="text-sm text-gray-500 font-mono">
                        {contract.address}
                      </p>
                      {contract.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {contract.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {contract.priority && (
                        <Badge className={getPriorityColor(contract.priority)}>
                          {contract.priority}
                        </Badge>
                      )}
                      {contract.tags?.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 函数列表 */}
                    <div>
                      <h6 className="font-medium mb-2">
                        函数 (
                        {
                          contract.abi.filter(
                            (item) => item.type === "function"
                          ).length
                        }
                        )
                      </h6>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {contract.abi
                          .filter(
                            (item): item is AbiFunction =>
                              item.type === "function"
                          )
                          .slice(0, 100)
                          .map((func, idx) => (
                            <div
                              key={idx}
                              className="text-xs p-2 bg-gray-50 rounded"
                            >
                              <div className="font-mono text-blue-600">
                                {func.name}
                              </div>
                              <div className="text-gray-500">
                                {func.inputs
                                  ?.map((input) => input.type)
                                  .join(", ") || "void"}{" "}
                                →{" "}
                                {func.outputs
                                  ?.map((output) => output.type)
                                  .join(", ") || "void"}
                              </div>
                              <div className="text-purple-600">
                                [{func.stateMutability}]
                              </div>
                            </div>
                          ))}
                        {contract.abi.filter((item) => item.type === "function")
                          .length > 10 && (
                          <div className="text-xs text-gray-500 text-center">
                            ... 还有{" "}
                            {contract.abi.filter(
                              (item) => item.type === "function"
                            ).length - 10}{" "}
                            个函数
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 事件列表 */}
                    <div>
                      <h6 className="font-medium mb-2">
                        事件 (
                        {
                          contract.abi.filter((item) => item.type === "event")
                            .length
                        }
                        )
                      </h6>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {contract.abi
                          .filter(
                            (item): item is AbiEvent => item.type === "event"
                          )
                          .map((event, idx) => (
                            <div
                              key={idx}
                              className="text-xs p-2 bg-gray-50 rounded"
                            >
                              <div className="font-mono text-green-600">
                                {event.name}
                              </div>
                              <div className="text-gray-500">
                                {event.inputs
                                  ?.map(
                                    (input) =>
                                      `${input.type} ${input.name}${
                                        input.indexed ? " indexed" : ""
                                      }`
                                  )
                                  .join(", ") || "无参数"}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* 过滤器配置 */}
                  {contract.filters && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded border">
                      <h6 className="font-medium mb-2">过滤器配置</h6>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        {contract.filters.minValue && (
                          <div>
                            最小价值: {formatEther(contract.filters.minValue)}{" "}
                            ETH
                          </div>
                        )}
                        {contract.filters.maxGasPrice && (
                          <div>
                            最大Gas价格:{" "}
                            {formatGwei(contract.filters.maxGasPrice)} Gwei
                          </div>
                        )}
                        {contract.filters.fromAddresses && (
                          <div>
                            指定发送者: {contract.filters.fromAddresses.length}{" "}
                            个
                          </div>
                        )}
                        {contract.filters.excludeAddresses && (
                          <div>
                            排除地址: {contract.filters.excludeAddresses.length}{" "}
                            个
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 通知配置 */}
                  {contract.notifications && (
                    <div className="mt-4 p-3 bg-blue-50 rounded border">
                      <h6 className="font-medium mb-2">通知配置</h6>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {contract.notifications.onSuccess && (
                          <Badge variant="outline" className="text-green-600">
                            成功通知
                          </Badge>
                        )}
                        {contract.notifications.onFailure && (
                          <Badge variant="outline" className="text-red-600">
                            失败通知
                          </Badge>
                        )}
                        {contract.notifications.onHighGas && (
                          <Badge variant="outline" className="text-orange-600">
                            高Gas通知
                          </Badge>
                        )}
                        {contract.notifications.onLargeValue && (
                          <Badge variant="outline" className="text-purple-600">
                            大额通知
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
};

export default AdvancedContractMonitor;
