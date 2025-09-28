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
import SparklineChart from "@/components/SparklineChart";
import { generateTokenPairSparklineData, getSparklineColor } from "@/utils/generateSparklineData";

interface PoolTableProps {
  itemsPerPage?: number;
}

const PoolTable: React.FC<PoolTableProps> = ({ itemsPerPage = 10 }) => {
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreatePoolOpen, setIsCreatePoolOpen] = useState(false);
  const { isConnected } = useWallet();

  const { fetchAllPools, poolsInfo } = usePoolManagerWithClients();
    console.log("poolsInfo", poolsInfo);

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

  // 生成模拟的 sparkline 数据
  const sparklineData = useMemo(() => {
    return poolsInfo.map(pool => ({
      data: generateTokenPairSparklineData(pool.token0?.symbol || 'Token0', pool.token1?.symbol || 'Token1'),
      color: getSparklineColor(generateTokenPairSparklineData(pool.token0?.symbol || 'Token0', pool.token1?.symbol || 'Token1'))
    }));
  }, [poolsInfo]);

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
            <TableHead className="w-[180px]">Token</TableHead>
            <TableHead className="w-[100px]">Fee tier</TableHead>
            <TableHead className="w-[200px]">Set price range</TableHead>
            <TableHead className="w-[150px]">Current price</TableHead>
            <TableHead className="w-[120px]">Liquidity</TableHead>
            <TableHead className="w-[120px]">Price Chart</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-10">
                Loading pools...
              </TableCell>
            </TableRow>
          ) : currentPools.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-10">
                No pools found
              </TableCell>
            </TableRow>
          ) : (
            currentPools.map((pool, index) => (
              <TableRow
                key={`${pool.pool}-${index}`}
                className="cursor-pointer hover:bg-gray-50"
              >
                <TableCell className="w-[180px] truncate" title={formatTokenPair(pool.token0, pool.token1)}>
                  {formatTokenPair(pool.token0, pool.token1)}
                </TableCell>
                <TableCell className="w-[100px] truncate" title={formatFee(pool.fee)}>
                  {formatFee(pool.fee)}
                </TableCell>
                <TableCell className="w-[200px] truncate" title={formatPriceRange(pool.tickLower, pool.tickUpper)}>
                  {formatPriceRange(pool.tickLower, pool.tickUpper)}
                </TableCell>
                <TableCell className="w-[150px] truncate" title={formatCurrentPrice(typeof pool.sqrtPriceX96 === 'string' ? BigInt(pool.sqrtPriceX96) : pool.sqrtPriceX96, pool.tick)}>
                  {formatCurrentPrice(typeof pool.sqrtPriceX96 === 'string' ? BigInt(pool.sqrtPriceX96) : pool.sqrtPriceX96, pool.tick)}
                </TableCell>
                <TableCell className="w-[120px] truncate" title={formatLiquidity(typeof pool.liquidity === 'string' ? BigInt(pool.liquidity) : pool.liquidity)}>
                  {formatLiquidity(typeof pool.liquidity === 'string' ? BigInt(pool.liquidity) : pool.liquidity)}
                </TableCell>
                <TableCell className="w-[120px]">
                  {sparklineData[index] && (
                    <SparklineChart
                      data={sparklineData[index].data}
                      width={100}
                      height={40}
                      color={sparklineData[index].color}
                    />
                  )}
                </TableCell>
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
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer hover:bg-gray-100"
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
                      : "cursor-pointer hover:bg-gray-100"
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
