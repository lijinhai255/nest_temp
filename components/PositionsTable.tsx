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
import {
  getPositionStatus,
  formatTokenAmount,
  getStatusText,
  getStatusColor,
  PositionStatus,
} from "@/utils/positionUtils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// 🆕 Define component Props interface

// 🆕 Define loading state types
type LoadingState = "idle" | "loading" | "success" | "error";

// 🆕 Define error types - simplified error object to avoid memory leaks
interface PositionError {
  message: string;
  code?: string;
  timestamp: number; // Add timestamp for cleanup
}

// 🆕 Define operation state types - use Map instead of Set for easier cleanup
interface OperationState {
  isRemoving: Map<string, number>; // Value is timestamp
  isCollecting: Map<string, number>; // Value is timestamp
  isAdding: boolean;
}

const PositionsTable: React.FC = () => {
  const { isConnected, address } = useWallet();
  const [isAddPositionOpen, setIsAddPositionOpen] = useState<boolean>(false);
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [error, setError] = useState<PositionError | null>(null);

  // 🔧 Use Map and timestamp to manage operation state
  const [operationState, setOperationState] = useState<OperationState>({
    isRemoving: new Map(),
    isCollecting: new Map(),
    isAdding: false,
  });

  // 🆕 Use ref to avoid duplicate requests
  const isLoadingRef = useRef<boolean>(false);
  const lastLoadTimeRef = useRef<number>(0);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 🆕 Component unmount flag
  const isMountedRef = useRef<boolean>(true);

  // 🆕 添加分页相关状态
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10); // 每页显示10条记录

  // Use position manager hook
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
  console.log("positions:", positions, "userPositions:", userPositions);

  // 🆕 Get positions list to display - optimize useMemo dependencies
  const displayPositions: PositionInfo[] = React.useMemo(() => {
    const positionsToShow = address ? userPositions : positions;
    return positionsToShow;
  }, [positions, userPositions, address]);

  // 🆕 Enhanced position data with status information
  const enhancedPositions = React.useMemo(() => {
    return displayPositions.map((position) => ({
      ...position,
      ...getPositionStatus(position),
    }));
  }, [displayPositions]);

  // 🆕 计算分页信息
  const paginatedPositions = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(
      startIndex + itemsPerPage,
      enhancedPositions.length
    );
    return enhancedPositions.slice(startIndex, endIndex);
  }, [enhancedPositions, currentPage, itemsPerPage]);

  // 🆕 计算总页数和分页信息
  const paginationInfo = React.useMemo(() => {
    const total = enhancedPositions.length;
    const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage - 1, total - 1);

    return {
      total,
      totalPages,
      startIndex,
      endIndex: total > 0 ? endIndex : 0,
    };
  }, [enhancedPositions.length, currentPage, itemsPerPage]);

  // 🆕 Status statistics
  const statusStats = React.useMemo(() => {
    const stats = enhancedPositions.reduce((acc, pos) => {
      acc[pos.status] = (acc[pos.status] || 0) + 1;
      return acc;
    }, {} as Record<PositionStatus, number>);

    return {
      active: stats.active || 0,
      pending_collection: stats.pending_collection || 0,
      closed: stats.closed || 0,
      total: enhancedPositions.length,
    };
  }, [enhancedPositions]);

  // 🔧 Optimize error handling - avoid storing large objects
  const handleError = useCallback((error: unknown, operation: string): void => {
    if (!isMountedRef.current) return;

    console.error(`${operation} failed:`, error);

    let errorMessage = `${operation} failed`;
    let errorCode: string | undefined;

    if (error instanceof Error) {
      errorMessage = error.message;
      errorCode = "OPERATION_ERROR";
    } else if (typeof error === "string") {
      errorMessage = error;
    } else if (error && typeof error === "object" && "message" in error) {
      errorMessage = String(error.message);
    }

    // 🔧 Simplified error object, avoid storing complete error object
    setError({
      message: errorMessage,
      code: errorCode,
      timestamp: Date.now(),
    });

    // 🆕 Auto cleanup error state
    setTimeout(() => {
      if (isMountedRef.current) {
        setError(null);
      }
    }, 10000); // Auto cleanup after 10 seconds
  }, []);

  // 🔧 Clear error
  const clearError = useCallback((): void => {
    if (isMountedRef.current) {
      setError(null);
    }
  }, []);

  // 🔧 Cleanup expired operation state
  const cleanupOperationState = useCallback((): void => {
    if (!isMountedRef.current) return;

    const now = Date.now();
    const CLEANUP_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    setOperationState((prev) => {
      const newRemoving = new Map(prev.isRemoving);
      const newCollecting = new Map(prev.isCollecting);

      // Clean up operation records older than 5 minutes
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

  // 🔧 Optimize loading function - prevent duplicate calls
  const loadPositions = useCallback(async (): Promise<void> => {
    if (!isConnected) {
      setLoadingState("idle");
      return;
    }

    // Prevent frequent requests (only allow once per second)
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
      setLoadingState("success");
      // 重置当前页为第一页
      setCurrentPage(1);
    } catch (error) {
      if (isMountedRef.current) {
        setLoadingState("error");
        handleError(error, "Load positions");
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

  // 🔧 Optimize useEffect - remove loadPositions dependency
  useEffect(() => {
    if (isConnected && address) {
      loadPositions();
    }
  }, [isConnected, address]); // Only depend on necessary values

  // 🆕 Periodically cleanup operation state
  useEffect(() => {
    cleanupTimeoutRef.current = setInterval(cleanupOperationState, 60000); // Cleanup every minute

    return () => {
      if (cleanupTimeoutRef.current) {
        clearInterval(cleanupTimeoutRef.current);
      }
    };
  }, [cleanupOperationState]);

  // 🆕 Cleanup on component unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (cleanupTimeoutRef.current) {
        clearInterval(cleanupTimeoutRef.current);
      }
    };
  }, []);

  // 🔧 Optimize handle remove position with status check
  const handleRemovePosition = useCallback(
    async (positionId: bigint): Promise<void> => {
      console.log("positionId", positionId);

      // 🆕 Add status check
      const position = displayPositions.find((p) => p.id === positionId);
      if (!position) {
        handleError(new Error("Position not found"), "Remove position");
        return;
      }

      const statusInfo = getPositionStatus(position);
      if (!statusInfo.canBurn) {
        handleError(
          new Error("Position has no liquidity to burn"),
          "Remove position"
        );
        return;
      }

      const positionIdStr = positionId.toString();
      const now = Date.now();

      try {
        setOperationState((prev) => ({
          ...prev,
          isRemoving: new Map([...prev.isRemoving, [positionIdStr, now]]),
        }));
        clearError();
        await burn(positionId);

        await loadPositions();
      } catch (error) {
        handleError(error, "Remove position");
      } finally {
        setOperationState((prev) => {
          const newRemoving = new Map(prev.isRemoving);
          newRemoving.delete(positionIdStr);
          return { ...prev, isRemoving: newRemoving };
        });
      }
    },
    [displayPositions, burn, loadPositions, handleError, clearError]
  );

  // 🔧 Optimize handle collect fees with status check
  const handleCollectFees = useCallback(
    async (positionId: bigint): Promise<void> => {
      // 🆕 Add status check
      const position = displayPositions.find((p) => p.id === positionId);
      if (!position) {
        handleError(new Error("Position not found"), "Collect fees");
        return;
      }

      const statusInfo = getPositionStatus(position);
      if (!statusInfo.canCollect) {
        handleError(
          new Error("Position has no fees to collect"),
          "Collect fees"
        );
        return;
      }

      const positionIdStr = positionId.toString();
      const now = Date.now();

      setOperationState((prev) => ({
        ...prev,
        isCollecting: new Map([...prev.isCollecting, [positionIdStr, now]]),
      }));
      try {
        clearError();

        await collect(positionId, address as unknown as Address);
        await loadPositions();
      } catch (error) {
        handleError(error, "Collect fees");
      } finally {
        setOperationState((prev) => {
          const newCollecting = new Map(prev.isCollecting);
          newCollecting.delete(positionIdStr);
          return { ...prev, isCollecting: newCollecting };
        });
      }
    },
    [displayPositions, collect, address, loadPositions, handleError, clearError]
  );

  // 🔧 Modified render position row using enhanced position data
  const renderPositionRow = (
    position: PositionInfo & ReturnType<typeof getPositionStatus>,
    index: number
  ) => {
    const positionIdStr = position.id.toString();
    const isRemoving = operationState.isRemoving.has(positionIdStr);
    const isCollecting = operationState.isCollecting.has(positionIdStr);

    return (
      <TableRow
        key={`${positionIdStr}-${index}`}
        className={"cursor-pointer hover:bg-gray-50"}
      >
        <TableCell>
          {formatTokenPair(position.token0, position.token1)}
        </TableCell>
        <TableCell>{formatFee(position.fee)}</TableCell>
        <TableCell>
          {formatPriceRange(position.tickLower, position.tickUpper)}
        </TableCell>
        <TableCell>{formatLiquidity(position.liquidity)}</TableCell>
        {/* 🆕 Add status column */}
        <TableCell>
          <span
            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
              position.status
            )}`}
          >
            {getStatusText(position.status)}
          </span>
        </TableCell>
        {/* 🆕 Add pending fees column */}
        <TableCell>
          <div className="text-xs space-y-1">
            <div
              className={
                position.tokensOwed0 > 0n
                  ? "text-green-600 font-medium"
                  : "text-gray-400"
              }
            >
              T0: {formatTokenAmount(position.tokensOwed0)}
            </div>
            <div
              className={
                position.tokensOwed1 > 0n
                  ? "text-green-600 font-medium"
                  : "text-gray-400"
              }
            >
              T1: {formatTokenAmount(position.tokensOwed1)}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex space-x-2">
            <Button
              variant="link"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleRemovePosition(position.id);
              }}
              disabled={isRemoving || isCollecting || !position.canBurn}
              title={
                position.canBurn ? "Burn position" : "No liquidity to burn"
              }
              className={
                !position.canBurn ? "opacity-50 cursor-not-allowed" : ""
              }
            >
              {isRemoving ? "Removing..." : "Remove"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleCollectFees(position.id);
              }}
              disabled={isRemoving || isCollecting || !position.canCollect}
              title={
                position.canCollect ? "Collect fees" : "No fees to collect"
              }
              className={
                !position.canCollect ? "opacity-50 cursor-not-allowed" : ""
              }
            >
              {isCollecting ? "Collecting..." : "Collect"}
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  // 🔧 Modified render table content using paginated position data
  const renderTableContent = () => {
    return paginatedPositions.map((position, index) =>
      renderPositionRow(position, index)
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">Your Positions</h2>
          {/* 🆕 Add status statistics */}
          {statusStats.total > 0 && (
            <div className="flex space-x-4 mt-2 text-sm">
              <span className="text-green-600 font-medium">
                Active: {statusStats.active}
              </span>
              <span className="text-yellow-600 font-medium">
                Pending Collection: {statusStats.pending_collection}
              </span>
              <span className="text-gray-600 font-medium">
                Closed: {statusStats.closed}
              </span>
              <span className="text-blue-600 font-medium">
                Total: {statusStats.total}
              </span>
            </div>
          )}
        </div>
        {isConnected && (
          <AddPositionDialog
            onPositionAdded={loadPositions}
            triggerText={operationState.isAdding ? "Adding..." : "Add Position"}
            triggerClassName={
              operationState.isAdding ? "opacity-50 cursor-not-allowed" : ""
            }
          />
        )}
      </div>

      {/* 🆕 Display error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex justify-between items-center">
            <span className="text-red-800 text-sm">{error.message}</span>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800 text-sm underline"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pool</TableHead>
            <TableHead>Fee Tier</TableHead>
            <TableHead>Price Range</TableHead>
            <TableHead>Liquidity</TableHead>
            <TableHead>Status</TableHead> {/* 🆕 New status column */}
            <TableHead>Pending Fees</TableHead>{" "}
            {/* 🆕 New pending fees column */}
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{renderTableContent()}</TableBody>
      </Table>

      {/* 替换为分页组件 */}
      {!hookLoading && enhancedPositions.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500">
            {paginationInfo.startIndex + 1}-{paginationInfo.endIndex + 1} of{" "}
            {paginationInfo.total} items
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  aria-disabled={currentPage === 1}
                  className={
                    currentPage === 1 ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>

              {/* 可以根据需要添加页码按钮 */}
              <PaginationItem>
                <PaginationLink isActive>{currentPage}</PaginationLink>
              </PaginationItem>

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(paginationInfo.totalPages, p + 1)
                    )
                  }
                  aria-disabled={
                    currentPage === paginationInfo.totalPages ||
                    paginationInfo.totalPages === 0
                  }
                  className={
                    currentPage === paginationInfo.totalPages ||
                    paginationInfo.totalPages === 0
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* 空状态显示 */}
      {enhancedPositions.length === 0 && !hookLoading && (
        <div className="text-center py-8 text-gray-500">
          {isConnected
            ? "You don't have any positions yet"
            : "Please connect wallet to view positions"}
        </div>
      )}

      {/* 加载状态显示 */}
      {hookLoading && (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      )}
    </div>
  );
};

export default PositionsTable;