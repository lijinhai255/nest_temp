"use client";

import { useState, useEffect } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { toast } from "@/hooks/use-toast";
import { Abi } from "viem";

interface MintingSectionProps {
  isConnected: boolean;
  isOwner: boolean;
  contractAddress: string;
  abi: Abi;
  onMintSuccess?: () => void; // 添加铸造成功回调
}

const MintingSection = ({
  isConnected,
  isOwner,
  contractAddress,
  abi,
  onMintSuccess,
}: MintingSectionProps) => {
  const [specificTokenId, setSpecificTokenId] = useState<string>("");
  const [recipientAddress, setRecipientAddress] = useState<string>("");
  const [transferTokenId, setTransferTokenId] = useState<string>("");
  const [transferRecipient, setTransferRecipient] = useState<string>("");
  const { address: account } = useAccount(); // 修复变量名

  // 合约写入函数
  const {
    data: publicMintHash,
    writeContract: writePublicMint,
    isPending: isPublicMintPending,
  } = useWriteContract();
  const {
    data: specificMintHash,
    writeContract: writeSpecificMint,
    isPending: isSpecificMintPending,
  } = useWriteContract();
  const {
    data: transferHash,
    writeContract: writeTransfer,
    isPending: isTransferPending,
  } = useWriteContract();

  // 等待交易确认
  const {
    isLoading: isPublicMintLoading,
    isSuccess: isPublicMintSuccess,
    isError: isPublicMintError,
  } = useWaitForTransactionReceipt({
    hash: publicMintHash,
  });

  const {
    isLoading: isSpecificMintLoading,
    isSuccess: isSpecificMintSuccess,
    isError: isSpecificMintError,
  } = useWaitForTransactionReceipt({
    hash: specificMintHash,
  });

  const {
    isLoading: isTransferLoading,
    isSuccess: isTransferSuccess,
    isError: isTransferError,
  } = useWaitForTransactionReceipt({
    hash: transferHash,
  });

  // 使用useEffect监听交易状态变化
  useEffect(() => {
    if (isPublicMintSuccess) {
      toast({
        title: "成功",
        description: "NFT铸造成功！",
        variant: "default",
      });
      // 调用铸造成功回调
      if (onMintSuccess) {
        onMintSuccess();
      }
    }
    if (isPublicMintError) {
      toast({
        title: "错误",
        description: "铸造失败。请重试。",
        variant: "destructive",
      });
    }
  }, [isPublicMintSuccess, isPublicMintError, onMintSuccess]);

  useEffect(() => {
    if (isSpecificMintSuccess) {
      toast({
        title: "成功",
        description: `NFT #${specificTokenId} 已铸造给 ${recipientAddress}！`,
        variant: "default",
      });
      setSpecificTokenId("");
      setRecipientAddress("");
      // 调用铸造成功回调
      if (onMintSuccess) {
        onMintSuccess();
      }
    }
    if (isSpecificMintError) {
      toast({
        title: "错误",
        description: "铸造失败。请重试。",
        variant: "destructive",
      });
    }
  }, [
    isSpecificMintSuccess,
    isSpecificMintError,
    specificTokenId,
    recipientAddress,
    onMintSuccess,
  ]);

  useEffect(() => {
    if (isTransferSuccess) {
      toast({
        title: "成功",
        description: `NFT #${transferTokenId} 已成功转移给 ${transferRecipient}！`,
        variant: "default",
      });
      setTransferTokenId("");
      setTransferRecipient("");
      // 调用铸造成功回调
      if (onMintSuccess) {
        onMintSuccess();
      }
    }
    if (isTransferError) {
      toast({
        title: "错误",
        description: "转移失败。请重试。",
        variant: "destructive",
      });
    }
  }, [
    isTransferSuccess,
    isTransferError,
    transferTokenId,
    transferRecipient,
    onMintSuccess,
  ]);

  const handlePublicMint = () => {
    if (!isConnected) {
      toast({
        title: "错误",
        description: "请先连接您的钱包",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("contractAddress", contractAddress);
      writePublicMint({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: "publicMint",
      });
      toast({
        title: "提交成功",
        description: "NFT铸造交易已提交！",
        variant: "default",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      toast({
        title: "错误",
        description: `铸造NFT失败: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  const handleSpecificMint = () => {
    if (!isConnected) {
      toast({
        title: "错误",
        description: "请先连接您的钱包",
        variant: "destructive",
      });
      return;
    }

    if (!isOwner) {
      toast({
        title: "错误",
        description: "只有合约所有者可以使用此功能",
        variant: "destructive",
      });
      return;
    }

    if (!recipientAddress || !specificTokenId) {
      toast({
        title: "错误",
        description: "请输入接收地址和代币ID",
        variant: "destructive",
      });
      return;
    }

    try {
      writeSpecificMint({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: "mint",
        args: [recipientAddress as `0x${string}`, BigInt(specificTokenId)],
      });
      toast({
        title: "提交成功",
        description: "特定NFT铸造交易已提交！",
        variant: "default",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      toast({
        title: "错误",
        description: `铸造特定NFT失败: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  const handleTransferNFT = () => {
    if (!isConnected) {
      toast({
        title: "错误",
        description: "请先连接您的钱包",
        variant: "destructive",
      });
      return;
    }

    if (!transferTokenId || !transferRecipient) {
      toast({
        title: "错误",
        description: "请输入代币ID和接收地址",
        variant: "destructive",
      });
      return;
    }

    try {
      if (!account) {
        toast({
          title: "错误",
          description: "无法获取当前钱包地址",
          variant: "destructive",
        });
        return;
      }

      writeTransfer({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: "safeTransferFrom",
        // 正确的参数顺序: from, to, tokenId
        args: [
          account as `0x${string}`,
          transferRecipient as `0x${string}`,
          BigInt(transferTokenId),
        ],
      });

      toast({
        title: "提交成功",
        description: "NFT转移交易已提交！",
        variant: "default",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      toast({
        title: "错误",
        description: `转移NFT失败: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  const isLoading =
    isPublicMintPending ||
    isPublicMintLoading ||
    isSpecificMintPending ||
    isSpecificMintLoading ||
    isTransferPending ||
    isTransferLoading;

  // 组件的其余部分保持不变
  return (
    // ...现有的JSX代码
    <div className="bg-white-100 p-6 rounded-lg border border-black shadow-100">
      <h2 className="text-2xl font-bold mb-6">铸造您的CryptoMonkey</h2>

      {/* 公开铸币部分 */}
      <div className="mb-8">
        <div className="bg-white p-6 rounded-lg border border-black shadow-100">
          <h3 className="text-xl font-semibold mb-2">公开铸币</h3>
          <p className="text-black-300 mb-4">
            任何人都可以铸造一个具有下一个可用代币ID的CryptoMonkey。
          </p>

          <button
            onClick={handlePublicMint}
            disabled={
              isPublicMintPending ||
              isPublicMintLoading ||
              isLoading ||
              !isConnected
            }
            className={`w-full py-3 px-4 rounded-md font-bold ${
              !isConnected ||
              isPublicMintPending ||
              isPublicMintLoading ||
              isLoading
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-primary text-white hover:bg-primary/90"
            }`}
          >
            {isPublicMintPending || isPublicMintLoading
              ? "铸造中..."
              : "立即铸造"}
          </button>
        </div>
      </div>

      {/* 转移NFT部分 */}
      <div className="mb-8">
        <div className="bg-white p-6 rounded-lg border border-black shadow-100">
          <h3 className="text-xl font-semibold mb-2">转移NFT</h3>
          <p className="text-black-300 mb-4">将您拥有的NFT转移给其他地址。</p>

          <div className="space-y-4 mb-4">
            <div>
              <label
                htmlFor="transferTokenId"
                className="block text-sm font-medium mb-1"
              >
                代币ID
              </label>
              <input
                type="number"
                id="transferTokenId"
                value={transferTokenId}
                onChange={(e) => setTransferTokenId(e.target.value)}
                placeholder="输入您拥有的代币ID"
                min="0"
                className="w-full px-4 py-2 border border-black rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label
                htmlFor="transferRecipient"
                className="block text-sm font-medium mb-1"
              >
                接收地址
              </label>
              <input
                type="text"
                id="transferRecipient"
                value={transferRecipient}
                onChange={(e) => setTransferRecipient(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-2 border border-black rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <button
            onClick={handleTransferNFT}
            disabled={
              isTransferPending ||
              isTransferLoading ||
              isLoading ||
              !transferTokenId ||
              !transferRecipient
            }
            className={`w-full py-3 px-4 rounded-md font-bold ${
              isTransferPending ||
              isTransferLoading ||
              isLoading ||
              !transferTokenId ||
              !transferRecipient
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-primary text-white hover:bg-primary/90"
            }`}
          >
            {isTransferPending || isTransferLoading ? "转移中..." : "转移NFT"}
          </button>
        </div>
      </div>

      {/* 管理员铸币部分 - 只对所有者可见 */}
      {isOwner && (
        <div className="border-t border-gray-200 pt-8">
          <h3 className="text-xl font-semibold mb-4">管理员铸币选项</h3>

          {/* 特定代币ID铸币 */}
          <div className="bg-white p-6 rounded-lg border border-black shadow-100 mb-6">
            <h4 className="font-semibold mb-2">铸造特定ID</h4>
            <p className="text-black-300 mb-4">将特定代币ID铸造给任何地址。</p>

            <div className="space-y-4 mb-4">
              <div>
                <label
                  htmlFor="recipient"
                  className="block text-sm font-medium mb-1"
                >
                  接收地址
                </label>
                <input
                  type="text"
                  id="recipient"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-2 border border-black rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label
                  htmlFor="tokenId"
                  className="block text-sm font-medium mb-1"
                >
                  代币ID
                </label>
                <input
                  type="number"
                  id="tokenId"
                  value={specificTokenId}
                  onChange={(e) => setSpecificTokenId(e.target.value)}
                  placeholder="输入代币ID (0-9999)"
                  min="0"
                  max="9999"
                  className="w-full px-4 py-2 border border-black rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <button
              onClick={handleSpecificMint}
              disabled={
                isSpecificMintPending ||
                isSpecificMintLoading ||
                isLoading ||
                !recipientAddress ||
                !specificTokenId
              }
              className={`w-full py-3 px-4 rounded-md font-bold ${
                isSpecificMintPending ||
                isSpecificMintLoading ||
                isLoading ||
                !recipientAddress ||
                !specificTokenId
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-primary text-white hover:bg-primary/90"
              }`}
            >
              {isSpecificMintPending || isSpecificMintLoading
                ? "铸造中..."
                : "铸造特定代币"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MintingSection;
