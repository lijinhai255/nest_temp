import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/provider";
import AddPosition from "@/components/AddPosition";
import { MintParams, PositionInfo } from "@/store/usePositionManagerStore";
import { usePositionManagerWithClients } from "@/hooks/usePositionManagerWithClients";
import {
  formatPriceRange,
  formatFee,
  formatTokenPair,
  formatLiquidity,
  formatCurrentPrice,
} from "@/utils/poolFormatters";
import { Address } from "viem";
import AddPositionDialog from "@/components/AddPositionDialog";

// 🆕 定义组件 Props 接口
interface PositionsTableProps {
  className?: string;
  showAddButton?: boolean;
  maxPositions?: number;
  onPositionClick?: (position: PositionInfo) => void;
  onPositionRemove?: (positionId: bigint) => Promise<void>;
  onPositionCollect?: (positionId: bigint) => Promise<void>;
}

// 🆕 定义加载状态类型
type LoadingState = "idle" | "loading" | "success" | "error";

// 🆕 定义错误类型 - 简化错误对象避免内存泄漏
interface PositionError {
  message: string;
  code?: string;
  timestamp: number; // 添加时间戳用于清理
}

// 🆕 定义操作状态类型 - 使用 Map 替代 Set 以便清理
interface OperationState {
  isRemoving: Map<string, number>; // 值为时间戳
  isCollecting: Map<string, number>; // 值为时间戳
  isAdding: boolean;
}

const PositionsTable: React.FC<PositionsTableProps> = ({
  className = "",
  showAddButton = true,
  maxPositions,
  onPositionClick,
  onPositionRemove,
  onPositionCollect,
}) => {
  const { isConnected, address } = useWallet();
  const [isAddPositionOpen, setIsAddPositionOpen] = useState<boolean>(false);
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [error, setError] = useState<PositionError | null>(null);

  // 🔧 使用 Map 和时间戳管理操作状态
  const [operationState, setOperationState] = useState<OperationState>({
    isRemoving: new Map(),
    isCollecting: new Map(),
    isAdding: false,
  });

  // 🆕 使用 ref 避免重复请求
  const isLoadingRef = useRef<boolean>(false);
  const lastLoadTimeRef = useRef<number>(0);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 🆕 组件卸载标志
  const isMountedRef = useRef<boolean>(true);

  // 使用 position manager hook
  const {
    mint,
    fetchAllPositions,
    fetchUserPositions,
    positions,
    userPositions,
    collect,
    burn,
    isLoading: hookLoading,
    error: hookError,
  } = usePositionManagerWithClients();

  // 🆕 获取要显示的持仓列表 - 优化 useMemo 依赖
  const displayPositions: PositionInfo[] = React.useMemo(() => {
    const positionsToShow = address ? userPositions : positions;
    return maxPositions
      ? positionsToShow.slice(0, maxPositions)
      : positionsToShow;
  }, [positions, userPositions, address, maxPositions]);

  // 🔧 优化错误处理 - 避免存储大对象
  const handleError = useCallback((error: unknown, operation: string): void => {
    if (!isMountedRef.current) return;

    console.error(`${operation} failed:`, error);

    let errorMessage = `${operation} 失败`;
    let errorCode: string | undefined;

    if (error instanceof Error) {
      errorMessage = error.message;
      errorCode = "OPERATION_ERROR";
    } else if (typeof error === "string") {
      errorMessage = error;
    } else if (error && typeof error === "object" && "message" in error) {
      errorMessage = String(error.message);
    }

    // 🔧 简化错误对象，避免存储完整的 error 对象
    setError({
      message: errorMessage,
      code: errorCode,
      timestamp: Date.now(),
    });

    // 🆕 自动清理错误状态
    setTimeout(() => {
      if (isMountedRef.current) {
        setError(null);
      }
    }, 10000); // 10秒后自动清理错误
  }, []);

  // 🔧 清除错误
  const clearError = useCallback((): void => {
    if (isMountedRef.current) {
      setError(null);
    }
  }, []);

  // 🔧 清理过期的操作状态
  const cleanupOperationState = useCallback((): void => {
    if (!isMountedRef.current) return;

    const now = Date.now();
    const CLEANUP_THRESHOLD = 5 * 60 * 1000; // 5分钟

    setOperationState((prev) => {
      const newRemoving = new Map(prev.isRemoving);
      const newCollecting = new Map(prev.isCollecting);

      // 清理超过5分钟的操作记录
      for (const [key, timestamp] of newRemoving.entries()) {
        if (now - timestamp > CLEANUP_THRESHOLD) {
          newRemoving.delete(key);
        }
      }

      for (const [key, timestamp] of newCollecting.entries()) {
        if (now - timestamp > CLEANUP_THRESHOLD) {
          newCollecting.delete(key);
        }
      }

      return {
        ...prev,
        isRemoving: newRemoving,
        isCollecting: newCollecting,
      };
    });
  }, []);

  // 🔧 优化加载函数 - 防止重复调用
  const loadPositions = useCallback(async (): Promise<void> => {
    if (!isConnected || !isMountedRef.current) {
      setLoadingState("idle");
      return;
    }

    // 防止重复请求
    if (isLoadingRef.current) {
      return;
    }

    // 防止频繁请求（1秒内只允许一次）
    const now = Date.now();
    if (now - lastLoadTimeRef.current < 1000) {
      return;
    }

    try {
      isLoadingRef.current = true;
      lastLoadTimeRef.current = now;
      setLoadingState("loading");
      clearError();

      if (address) {
        await fetchUserPositions(address as unknown as Address);
      } else {
        await fetchAllPositions();
      }

      if (isMountedRef.current) {
        setLoadingState("success");
      }
    } catch (error) {
      if (isMountedRef.current) {
        setLoadingState("error");
        handleError(error, "加载持仓");
      }
    } finally {
      isLoadingRef.current = false;
    }
  }, [
    isConnected,
    address,
    fetchAllPositions,
    fetchUserPositions,
    handleError,
    clearError,
  ]);

  // 🔧 优化 useEffect - 移除 loadPositions 依赖
  useEffect(() => {
    if (isConnected && address) {
      loadPositions();
    }
  }, [isConnected, address]); // 只依赖必要的值

  // 🆕 定期清理操作状态
  useEffect(() => {
    cleanupTimeoutRef.current = setInterval(cleanupOperationState, 60000); // 每分钟清理一次

    return () => {
      if (cleanupTimeoutRef.current) {
        clearInterval(cleanupTimeoutRef.current);
      }
    };
  }, [cleanupOperationState]);

  // 🆕 组件卸载时清理
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (cleanupTimeoutRef.current) {
        clearInterval(cleanupTimeoutRef.current);
      }
    };
  }, []);

  // 🔧 优化处理添加持仓
  const handleAddPosition = useCallback(
    async (params: MintParams): Promise<void> => {
      if (!isMountedRef.current) return;

      try {
        setOperationState((prev) => ({ ...prev, isAdding: true }));
        clearError();

        await mint(params);

        if (isMountedRef.current) {
          await loadPositions();
          setIsAddPositionOpen(false);
        }
      } catch (error) {
        if (isMountedRef.current) {
          handleError(error, "添加持仓");
        }
        throw error;
      } finally {
        if (isMountedRef.current) {
          setOperationState((prev) => ({ ...prev, isAdding: false }));
        }
      }
    },
    [mint, loadPositions, handleError, clearError]
  );

  // 🔧 优化处理移除持仓
  const handleRemovePosition = useCallback(
    async (positionId: bigint): Promise<void> => {
      if (!isMountedRef.current) return;

      const positionIdStr = positionId.toString();
      const now = Date.now();

      try {
        setOperationState((prev) => ({
          ...prev,
          isRemoving: new Map([...prev.isRemoving, [positionIdStr, now]]),
        }));
        clearError();

        if (onPositionRemove) {
          await onPositionRemove(positionId);
        } else {
          await burn(positionId);
        }

        if (isMountedRef.current) {
          await loadPositions();
        }
      } catch (error) {
        if (isMountedRef.current) {
          handleError(error, "移除持仓");
        }
      } finally {
        if (isMountedRef.current) {
          setOperationState((prev) => {
            const newRemoving = new Map(prev.isRemoving);
            newRemoving.delete(positionIdStr);
            return { ...prev, isRemoving: newRemoving };
          });
        }
      }
    },
    [burn, onPositionRemove, loadPositions, handleError, clearError]
  );

  // 🔧 优化处理收集手续费
  const handleCollectFees = useCallback(
    async (positionId: bigint): Promise<void> => {
      if (!isMountedRef.current) return;

      const positionIdStr = positionId.toString();
      const now = Date.now();

      try {
        setOperationState((prev) => ({
          ...prev,
          isCollecting: new Map([...prev.isCollecting, [positionIdStr, now]]),
        }));
        clearError();

        if (onPositionCollect) {
          await onPositionCollect(positionId);
        } else if (address) {
          await collect(positionId, address as unknown as Address);
        } else {
          throw new Error("钱包地址未连接");
        }

        if (isMountedRef.current) {
          await loadPositions();
        }
      } catch (error) {
        if (isMountedRef.current) {
          handleError(error, "收集手续费");
        }
      } finally {
        if (isMountedRef.current) {
          setOperationState((prev) => {
            const newCollecting = new Map(prev.isCollecting);
            newCollecting.delete(positionIdStr);
            return { ...prev, isCollecting: newCollecting };
          });
        }
      }
    },
    [
      collect,
      onPositionCollect,
      address,
      loadPositions,
      handleError,
      clearError,
    ]
  );

  // 处理持仓点击
  const handlePositionClick = useCallback(
    (position: PositionInfo): void => {
      if (onPositionClick && isMountedRef.current) {
        onPositionClick(position);
      }
    },
    [onPositionClick]
  );

  // 渲染错误状态
  const renderError = () => {
    if (!error) return null;

    return (
      <TableRow>
        <TableCell colSpan={5} className="text-center py-10">
          <div className="text-red-600">
            <div className="font-medium">❌ {error.message}</div>
            {error.code && (
              <div className="text-sm text-gray-500 mt-1">
                错误代码: {error.code}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                clearError();
                loadPositions();
              }}
            >
              重试
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  // 渲染加载状态
  const renderLoading = () => (
    <TableRow>
      <TableCell colSpan={5} className="text-center py-10">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-4 h-4 border border-gray-300 border-t-transparent rounded-full animate-spin"></div>
          <span>加载持仓中...</span>
        </div>
      </TableCell>
    </TableRow>
  );

  // 渲染空状态
  const renderEmpty = () => (
    <TableRow>
      <TableCell colSpan={5} className="text-center py-10">
        <div className="text-gray-500">
          <div className="text-lg mb-2">📊 暂无持仓</div>
          <div className="text-sm">
            {isConnected ? "您还没有任何流动性持仓" : "请连接钱包查看持仓"}
          </div>
          {isConnected && showAddButton && (
            <Button
              className="mt-3"
              onClick={() => setIsAddPositionOpen(true)}
              disabled={operationState.isAdding}
            >
              添加第一个持仓
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  // 渲染持仓行
  const renderPositionRow = (
    position: PositionInfo,
    index: number
  ) => {
    const positionIdStr = position.id.toString();
    const isRemoving = operationState.isRemoving.has(positionIdStr);
    const isCollecting = operationState.isCollecting.has(positionIdStr);

    return (
      <TableRow
        key={`${positionIdStr}-${index}`}
        className={onPositionClick ? "cursor-pointer hover:bg-gray-50" : ""}
        onClick={() => handlePositionClick(position)}
      >
        <TableCell>
          {formatTokenPair(position.token0, position.token1)}
        </TableCell>
        <TableCell>{formatFee(position.fee)}</TableCell>
        <TableCell>
          {formatPriceRange(position.tickLower, position.tickUpper)}
        </TableCell>
        <TableCell>{formatLiquidity(position.liquidity)}</TableCell>
        <TableCell>
          <div className="flex space-x-2">
            <Button
              variant="link"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleRemovePosition(position.id);
              }}
              disabled={isRemoving || isCollecting}
            >
              {isRemoving ? "移除中..." : "移除"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleCollectFees(position.id);
              }}
              disabled={isRemoving || isCollecting}
            >
              {isCollecting ? "收集中..." : "收集"}
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  // 渲染表格内容
  const renderTableContent = ()=> {
    if (loadingState === "loading" || hookLoading) {
      return renderLoading();
    }

    if (error || hookError) {
      return renderError();
    }

    if (displayPositions.length === 0) {
      return renderEmpty();
    }

    return displayPositions.map((position, index) =>
      renderPositionRow(position, index)
    );
  };

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">您的持仓</h2>
        {isConnected && showAddButton && (
          <AddPositionDialog
            onPositionAdded={loadPositions}
            triggerText={operationState.isAdding ? "添加中..." : "添加持仓"}
            triggerClassName={
              operationState.isAdding ? "opacity-50 cursor-not-allowed" : ""
            }
          />
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>池子</TableHead>
            <TableHead>费率等级</TableHead>
            <TableHead>价格区间</TableHead>
            <TableHead>流动性</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{renderTableContent()}</TableBody>
      </Table>

      {displayPositions.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 flex justify-between">
          <span>显示 {displayPositions.length} 个持仓</span>
          {maxPositions && positions.length > maxPositions && (
            <span>共 {positions.length} 个持仓</span>
          )}
        </div>
      )}
    </div>
  );
};

export default PositionsTable;
