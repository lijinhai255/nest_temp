import React, { useState, useEffect } from "react";
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
import { MintParams } from "@/store/usePositionManagerStore";
import { usePositionManagerWithClients } from "@/hooks/usePositionManagerWithClients";
import {
  formatPriceRange,
  formatFee,
  formatTokenPair,
  formatLiquidity,
  formatCurrentPrice,
} from "@/utils/poolFormatters";

interface PositionsTableProps {
  // 可以根据需要添加属性
}

const PositionsTable: React.FC<PositionsTableProps> = () => {
  const { isConnected } = useWallet();
  const [isAddPositionOpen, setIsAddPositionOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // 使用 position manager hook
  const { mint, fetchAllPositions, positions } =
    usePositionManagerWithClients();

  // 示例当前价格
  const currentPrice = 3042.0;

  // 加载用户持仓
  useEffect(() => {
    const loadPositions = async () => {
      try {
        setLoading(true);
        await fetchAllPositions();
      } catch (error) {
        console.error("Failed to fetch positions:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isConnected) {
      loadPositions();
    }
  }, [isConnected]);

  // 处理添加持仓
  const handleAddPosition = async (params: MintParams) => {
    try {
      await mint(params);
      // 添加成功后刷新持仓列表
      await fetchAllPositions();
    } catch (error) {
      console.error("Failed to add position:", error);
      throw error;
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Your Positions</h2>
        {isConnected && (
          <Button onClick={() => setIsAddPositionOpen(true)}>
            Add Position
          </Button>
        )}
      </div>

      <AddPosition
        isOpen={isAddPositionOpen}
        onClose={() => setIsAddPositionOpen(false)}
        onAddPosition={handleAddPosition}
        currentPrice={currentPrice}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pool</TableHead>
            <TableHead>Fee tier</TableHead>
            <TableHead>Price range</TableHead>
            <TableHead>Liquidity</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-10">
                Loading positions...
              </TableCell>
            </TableRow>
          ) : positions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-10">
                No positions found
              </TableCell>
            </TableRow>
          ) : (
            positions.map((position, index) => (
              <TableRow key={position.id.toString() + "-" + index}>
                <TableCell>
                  {formatTokenPair(position.token0, position.token1)}
                </TableCell>
                <TableCell>{formatFee(position.fee)}</TableCell>
                <TableCell>
                  {formatPriceRange(position.tickLower, position.tickUpper)}
                </TableCell>
                <TableCell>{formatLiquidity(position.liquidity)}</TableCell>
                <TableCell>
                  <Button variant="link" size="sm">
                    Remove
                  </Button>
                  <Button variant="ghost" size="sm">
                    Collect
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </>
  );
};

export default PositionsTable;
