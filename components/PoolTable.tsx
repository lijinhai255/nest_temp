import React, { useMemo, useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  formatPriceRange,
  formatFee,
  formatTokenPair,
  formatLiquidity,
  formatCurrentPrice,
} from "@/utils/poolFormatters";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import CreatePool from "@/components/CreatePool";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/provider";

import { usePoolManagerWithClients } from "@/hooks/usePoolManagerWithClients";

interface PoolTableProps {
  itemsPerPage?: number;
}

const PoolTable: React.FC<PoolTableProps> = ({ itemsPerPage = 10 }) => {
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreatePoolOpen, setIsCreatePoolOpen] = useState(false);
  const { isConnected } = useWallet();

  const { fetchAllPools, poolsInfo, createAndInitializePoolIfNecessary } =
    usePoolManagerWithClients();

  // 添加 handlePoolCreated 函数，使用 createAndInitializePoolIfNecessary
  const handlePoolCreated = async () => {
    try {
      setLoading(true);

      // 重新获取所有池子信息
      await fetchAllPools();

      setCurrentPage(1);
    } catch (error) {
      console.error("Error creating or refreshing pools:", error);
    } finally {
      setLoading(false);
    }
  };

  // 只在组件挂载时获取一次数据
  useEffect(() => {
    const loadPools = async () => {
      try {
        setLoading(true);
        await fetchAllPools();
      } catch (error) {
        console.error("Failed to fetch pools:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPools();
  }, []);

  // 使用 useMemo 优化分页计算
  const { totalPages, currentPools, paginationInfo } = useMemo(() => {
    const totalPages = Math.ceil(poolsInfo.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPools = poolsInfo.slice(startIndex, endIndex);

    return {
      totalPages,
      currentPools,
      paginationInfo: {
        startIndex,
        endIndex: Math.min(endIndex, poolsInfo.length),
        total: poolsInfo.length,
      },
    };
  }, [poolsInfo, currentPage, itemsPerPage]);

  return (
    <div className={`bg-white rounded-lg shadow p-6`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium">All Pools</h2>
        <Dialog open={isCreatePoolOpen} onOpenChange={setIsCreatePoolOpen}>
          <DialogTrigger asChild>
            {isConnected && <Button>Add Pool</Button>}
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>创建新池子</DialogTitle>
              <DialogDescription>
                设置代币对和参数来创建新的流动性池
              </DialogDescription>
            </DialogHeader>
            <CreatePool onPoolCreated={handlePoolCreated} />
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Token</TableHead>
            <TableHead>Fee tier</TableHead>
            <TableHead>Set price range</TableHead>
            <TableHead>Current price</TableHead>
            <TableHead>Liquidity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-10">
                Loading pools...
              </TableCell>
            </TableRow>
          ) : currentPools.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-10">
                No pools found
              </TableCell>
            </TableRow>
          ) : (
            currentPools.map((pool, index) => (
              <TableRow
                key={`${pool.pool}-${index}`}
                className="cursor-pointer hover:bg-gray-50"
              >
                <TableCell>
                  {formatTokenPair(pool.token0, pool.token1)}
                </TableCell>
                <TableCell>{formatFee(pool.fee)}</TableCell>
                <TableCell>
                  {formatPriceRange(pool.tickLower, pool.tickUpper)}
                </TableCell>
                <TableCell>
                  {formatCurrentPrice(pool.sqrtPriceX96, pool.tick)}
                </TableCell>
                <TableCell>{formatLiquidity(pool.liquidity)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {!loading && poolsInfo.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500">
            {paginationInfo.startIndex + 1}-{paginationInfo.endIndex} of{" "}
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
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  aria-disabled={currentPage === totalPages || totalPages === 0}
                  className={
                    currentPage === totalPages || totalPages === 0
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default PoolTable;
