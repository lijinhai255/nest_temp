"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useReadContract } from "wagmi";
import { Abi } from "viem";

interface NFTCardProps {
  tokenId: number;
  contractAddress: string;
  abi: Abi;
  isOwned: boolean;
  refreshTrigger?: number;
}

interface NFTAttribute {
  trait_type: string;
  value: string | number;
}

interface NFTMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: NFTAttribute[];
}

// 添加重试函数
const retryFetch = async (url: string, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`服务器响应: ${response.status}`);
      }
      return response;
    } catch (error) {
      console.log(`获取 ${url} 失败，重试 ${i + 1}/${maxRetries}...`);
      lastError = error;
      
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  
  throw lastError;
};

const NFTCard = ({ tokenId, contractAddress, abi, isOwned, refreshTrigger = 0 }: NFTCardProps) => {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取代币所有者
  const { data: ownerAddressRaw, refetch: refetchOwner } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: "ownerOf",
    args: [BigInt(tokenId)],
  });

  // 安全地转换所有者地址
  const ownerAddress =
    typeof ownerAddressRaw === "string" ? ownerAddressRaw : undefined;

  // 获取代币URI
  const { data: tokenURIRaw, refetch: refetchTokenURI } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: "tokenURI",
    args: [BigInt(tokenId)],
  });

  // 安全地转换代币URI
  const tokenURI = typeof tokenURIRaw === "string" ? tokenURIRaw : undefined;

  // 监听刷新触发器变化，强制重新获取数据
  useEffect(() => {
    if (refreshTrigger > 0) {
      refetchOwner().catch(console.error);
      refetchTokenURI().catch(console.error);
      setLoading(true);
      setError(null);
    }
  }, [refreshTrigger, refetchOwner, refetchTokenURI]);

  // 获取元数据
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!tokenURI) return;

      try {
        setLoading(true);
        setError(null);

        // 处理IPFS URI
        let url = tokenURI;
        if (url.startsWith("ipfs://")) {
          url = url.replace("ipfs://", "https://ipfs.io/ipfs/");
        }

        // 使用重试机制获取元数据
        const response = await retryFetch(url);
        const data: NFTMetadata = await response.json();
        setMetadata(data);

        // 处理图片URL
        if (data.image) {
          let imageUrl = data.image;
          if (imageUrl.startsWith("ipfs://")) {
            imageUrl = imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/");
          }
          setImageUrl(imageUrl);
        }

        setLoading(false);
      } catch (error) {
        console.error("获取NFT元数据错误:", error);
        setError("无法加载NFT数据");
        setLoading(false);

        // 使用备用图片
        setImageUrl(
          `/placeholder-nft.png`
        );
      }
    };

    fetchMetadata();
  }, [tokenURI, tokenId]);

  // 格式化地址显示
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  return (
    <div
      className={`bg-white rounded-lg overflow-hidden border ${
        isOwned ? "border-primary" : "border-black"
      } shadow-100 hover:shadow-200 transition-shadow`}
    >
      <div className="relative aspect-square">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Image
            src={imageUrl || `/placeholder-nft.png`}
            alt={`CryptoMonkey #${tokenId}`}
            fill
            className="object-cover"
            onError={() => {
              setImageUrl(`/placeholder-nft.png`);
            }}
          />
        )}
        {isOwned && (
          <div className="absolute top-2 right-2 bg-primary text-white px-2 py-1 rounded-md text-xs font-bold">
            已拥有
          </div>
        )}
        
        {error && (
          <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-xs py-1 px-2 text-center">
            {error}
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-bold text-lg mb-1">CryptoMonkey #{tokenId}</h3>

        {metadata && !error && (
          <div className="space-y-1 mt-2">
            {metadata.attributes &&
              metadata.attributes.slice(0, 3).map((attr, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-black-300">{attr.trait_type}:</span>
                  <span className="font-medium">{attr.value}</span>
                </div>
              ))}
          </div>
        )}

        {ownerAddress && !error && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-black-300">所有者:</p>
            <p className="text-sm font-medium truncate" title={ownerAddress}>
              {formatAddress(ownerAddress)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NFTCard;