"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPublicClient, http, Abi, Chain } from "viem";
import { mainnet, sepolia } from "viem/chains";
import { useAccount, useReadContract, useChainId } from "wagmi";
import { Toast as toast } from "@/components/ui/toast";
// Components
import NFTCard from "@/components/NFTCard";
import MintingSection from "@/components/MintingSection";

// Contract ABI and address
import CryptoMonkeysABIRaw from "@/lib/abi/CryptoMonkeys.json";

// 使用类型断言解决ABI类型问题
const CryptoMonkeysABI = {
  address: CryptoMonkeysABIRaw.address,
  abi: CryptoMonkeysABIRaw.abi as Abi,
};

// 添加重试函数
const retryOperation = async <T,>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  let lastError: Error | unknown;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      console.log(`操作失败，重试 ${i + 1}/${maxRetries}...`);
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  throw lastError;
};

const NFT = () => {
  const [totalMinted, setTotalMinted] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  const [ownedNFTs, setOwnedNFTs] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFilter, setCurrentFilter] = useState("all");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [contractVerified, setContractVerified] = useState(false);

  // 优化的请求状态追踪
  const contractVerificationInProgress = useRef(false);
  const nftFetchInProgress = useRef(false);
  const lastFetchedAddress = useRef<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const mintSuccessHandled = useRef(false); // 添加铸币成功处理标志

  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // 使用 useMemo 缓存链配置，避免重复创建
  const currentChain = useMemo((): Chain => {
    if (!chainId) return mainnet;

    switch (chainId) {
      case 1:
        return mainnet;
      case 11155111:
        return sepolia;
      default:
        return {
          id: chainId,
          name: `Chain ${chainId}`,
          nativeCurrency: {
            name: "Ether",
            symbol: "ETH",
            decimals: 18,
          },
          rpcUrls: {
            default: { http: [""] },
            public: { http: [""] },
          },
        };
    }
  }, [chainId]);

  // 使用 useMemo 缓存公共客户端，避免每次渲染都创建新实例
  const publicClient = useMemo(() => {
    try {
      return createPublicClient({
        chain: currentChain,
        transport: http(),
      });
    } catch (error) {
      console.error("创建公共客户端失败:", error);
      return null;
    }
  }, [currentChain]);

  // 验证合约 - 只在必要时执行，添加更严格的条件检查
  useEffect(() => {
    if (
      !publicClient ||
      contractVerificationInProgress.current ||
      contractVerified ||
      !mountedRef.current
    ) {
      return;
    }

    const verifyContract = async () => {
      try {
        contractVerificationInProgress.current = true;
        setErrorMessage(null);

        const bytecode = await publicClient.getBytecode({
          address: CryptoMonkeysABI.address as `0x${string}`,
        });

        if (!mountedRef.current) return;

        if (!bytecode || bytecode === "0x") {
          console.error("合约地址无效或合约不存在");
          setErrorMessage("合约地址无效或合约不存在，请检查配置");
          setContractVerified(false);
          return;
        }

        setContractVerified(true);
        setErrorMessage(null);
        console.log("合约验证成功");
      } catch (error) {
        if (!mountedRef.current) return;
        console.error("验证合约失败:", error);
        setErrorMessage("无法验证NFT合约，请检查网络连接和合约地址");
        setContractVerified(false);
      } finally {
        contractVerificationInProgress.current = false;
      }
    };

    verifyContract();
  }, [publicClient]);

  // 修复 useReadContract 配置 - 进一步增加缓存时间并禁用所有自动刷新
  const { data: contractOwner, error: ownerError } = useReadContract({
    address: CryptoMonkeysABI.address as `0x${string}`,
    abi: CryptoMonkeysABI.abi,
    functionName: "owner",
    chainId: chainId,
    query: {
      enabled: Boolean(contractVerified && publicClient),
      staleTime: 30 * 60 * 1000, // 30分钟
      gcTime: 60 * 60 * 1000, // 1小时
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
      refetchOnMount: false, // 禁用挂载时刷新
      retry: false, // 禁用重试
    },
  });

  const {
    data: totalMintedData,
    refetch: refetchTotalMinted,
    error: totalMintedError,
  } = useReadContract({
    address: CryptoMonkeysABI.address as `0x${string}`,
    abi: CryptoMonkeysABI.abi,
    functionName: "totalMinted",
    chainId: chainId,
    query: {
      enabled: Boolean(contractVerified && publicClient),
      staleTime: 5 * 60 * 1000, // 5分钟
      gcTime: 15 * 60 * 1000, // 15分钟
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
      refetchOnMount: false,
      retry: false,
    },
  });

  const { data: maxSupply, error: maxSupplyError } = useReadContract({
    address: CryptoMonkeysABI.address as `0x${string}`,
    abi: CryptoMonkeysABI.abi,
    functionName: "MAX_MONKEYS",
    chainId: chainId,
    query: {
      enabled: Boolean(contractVerified && publicClient),
      staleTime: 60 * 60 * 1000, // 1小时
      gcTime: 24 * 60 * 60 * 1000, // 24小时
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
      refetchOnMount: false,
      retry: false,
    },
  });

  // 记录合约读取错误 - 添加防抖，避免频繁日志
  useEffect(() => {
    const timer = setTimeout(() => {
      const errors = [];
      if (ownerError) errors.push(`读取合约所有者错误: ${ownerError.message}`);
      if (totalMintedError)
        errors.push(`读取总铸造数错误: ${totalMintedError.message}`);
      if (maxSupplyError)
        errors.push(`读取最大供应量错误: ${maxSupplyError.message}`);

      if (errors.length > 0) {
        console.error("合约读取错误:", errors);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [ownerError?.message, totalMintedError?.message, maxSupplyError?.message]);

  // 检查是否是合约所有者 - 优化条件检查，避免不必要的更新
  useEffect(() => {
    if (
      isConnected &&
      address &&
      contractOwner &&
      typeof contractOwner === "string"
    ) {
      const newIsOwner = address.toLowerCase() === contractOwner.toLowerCase();
      if (newIsOwner !== isOwner) {
        console.log(`更新所有者状态: ${isOwner} -> ${newIsOwner}`);
        setIsOwner(newIsOwner);
      }
    } else if (isOwner) {
      console.log("清除所有者状态");
      setIsOwner(false);
    }
  }, [address, contractOwner, isConnected, isOwner]);

  // 更新已铸造总数 - 添加类型检查和去重，避免无效更新
  useEffect(() => {
    if (totalMintedData && typeof totalMintedData === "bigint") {
      const newTotalMinted = Number(totalMintedData);
      if (newTotalMinted !== totalMinted) {
        console.log(`更新总铸造数: ${totalMinted} -> ${newTotalMinted}`);
        setTotalMinted(newTotalMinted);
      }
    }
  }, [totalMintedData, totalMinted]);

  // 优化的 fetchOwnedNFTs 函数 - 使用 useCallback 并优化依赖
  const fetchOwnedNFTs = useCallback(
    async (forceRefresh = false) => {
      // 检查是否需要跳过请求
      if (
        !isConnected ||
        !address ||
        !contractVerified ||
        !publicClient ||
        nftFetchInProgress.current ||
        !mountedRef.current
      ) {
        if ((!isConnected || !address) && mountedRef.current) {
          setOwnedNFTs([]);
          setLoading(false);
        }
        return;
      }

      // 如果地址没有变化且不是强制刷新，跳过
      if (!forceRefresh && lastFetchedAddress.current === address) {
        setLoading(false);
        return;
      }

      try {
        nftFetchInProgress.current = true;
        console.log(
          `开始获取NFT数据 - 地址: ${address}, 强制刷新: ${forceRefresh}`
        );

        if (mountedRef.current) {
          setLoading(true);
          setErrorMessage(null);
        }

        // 检查ABI中是否包含必要的函数
        const hasBalanceOf = CryptoMonkeysABI.abi.some(
          (item) =>
            item.type === "function" &&
            item.name === "balanceOf" &&
            item.inputs?.length === 1 &&
            item.inputs[0].type === "address"
        );

        if (!hasBalanceOf) {
          throw new Error("合约ABI中不包含balanceOf函数");
        }

        // 获取用户余额
        const balance = await retryOperation<bigint>(async () => {
          return await publicClient.readContract({
            address: CryptoMonkeysABI.address as `0x${string}`,
            abi: CryptoMonkeysABI.abi,
            functionName: "balanceOf",
            args: [address],
          });
        });

        if (!mountedRef.current) return;

        const balanceNumber = Number(balance);
        console.log(`用户余额: ${balanceNumber}`);

        if (balanceNumber === 0) {
          setOwnedNFTs([]);
          lastFetchedAddress.current = address;
          return;
        }

        // 检查是否有tokenOfOwnerByIndex函数
        const hasTokenOfOwnerByIndex = CryptoMonkeysABI.abi.some(
          (item) =>
            item.type === "function" && item.name === "tokenOfOwnerByIndex"
        );

        if (!hasTokenOfOwnerByIndex) {
          throw new Error("合约ABI中不包含tokenOfOwnerByIndex函数");
        }

        // 批量获取代币ID
        const tokenIdPromises = Array.from({ length: balanceNumber }, (_, i) =>
          retryOperation<bigint | null>(async () => {
            try {
              const tokenId = await publicClient.readContract({
                address: CryptoMonkeysABI.address as `0x${string}`,
                abi: CryptoMonkeysABI.abi,
                functionName: "tokenOfOwnerByIndex",
                args: [address, BigInt(i)],
              });
              return tokenId;
            } catch (err) {
              console.error(`获取代币ID ${i} 时出错:`, err);
              return null;
            }
          })
        );

        const results = await Promise.allSettled(tokenIdPromises);

        if (!mountedRef.current) return;

        const tokenIds: number[] = [];

        results.forEach((result) => {
          if (result.status === "fulfilled" && result.value !== null) {
            tokenIds.push(Number(result.value));
          }
        });

        console.log(`获取到的NFT ID列表:`, tokenIds);

        if (mountedRef.current) {
          setOwnedNFTs(tokenIds);
          lastFetchedAddress.current = address;
        }
      } catch (error) {
        if (!mountedRef.current) return;
        console.error("获取拥有的NFT时出错:", error);
        setErrorMessage("获取NFT数据失败，请稍后再试");
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
        nftFetchInProgress.current = false;
      }
    },
    [address, isConnected, contractVerified, publicClient]
  );

  // 专门处理铸币成功的回调 - 简化版本，只更新数据
  const handleMintSuccess = useCallback(() => {
    console.log("铸币成功回调被触发");

    // 防止短时间内重复调用
    if (mintSuccessHandled.current) {
      console.log("铸币成功处理已在进行中，跳过");
      return;
    }

    mintSuccessHandled.current = true;

    // 延迟执行刷新，给区块链时间确认交易
    setTimeout(() => {
      if (mountedRef.current) {
        console.log("执行铸币成功后的数据更新");

        // 清除之前的定时器
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
          debounceTimer.current = null;
        }

        setRefreshTrigger((prev) => prev + 1);
        setErrorMessage(null);

        // 使用防抖延迟更新数据
        debounceTimer.current = setTimeout(async () => {
          if (!mountedRef.current) return;

          console.log("开始执行延迟数据更新...");

          try {
            // 先刷新总铸造数据
            console.log("刷新总铸造数据...");
            await refetchTotalMinted();
            console.log("总铸造数据刷新完成");

            // 等待一段时间再刷新NFT数据
            await new Promise((resolve) => setTimeout(resolve, 2000));

            if (mountedRef.current) {
              console.log("开始刷新NFT数据...");
              await fetchOwnedNFTs(true);
              console.log("NFT数据刷新完成");
            }
          } catch (error) {
            if (mountedRef.current) {
              console.error("刷新数据失败:", error);
              setErrorMessage("刷新数据失败，请稍后再试");
            }
          }

          debounceTimer.current = null;
        }, 2000); // 2秒防抖延迟
      }

      // 重置处理标志
      setTimeout(() => {
        mintSuccessHandled.current = false;
      }, 10000); // 10秒后重置
    }, 3000); // 3秒延迟
  }, [refetchTotalMinted, fetchOwnedNFTs]);

  // 简化的地址变化监听 - 进一步优化条件和延迟
  useEffect(() => {
    if (
      isConnected &&
      address &&
      contractVerified &&
      publicClient &&
      mountedRef.current
    ) {
      console.log(`地址变化监听触发 - 地址: ${address}`);

      // 如果地址没有变化，直接返回
      if (address === lastFetchedAddress.current) {
        console.log("地址未变化，跳过NFT数据获取");
        setLoading(false);
        return;
      }

      // 增加延迟避免频繁调用
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          fetchOwnedNFTs(false).catch(console.error);
        }
      }, 2000); // 2秒延迟

      return () => clearTimeout(timer);
    }
  }, [address, isConnected, contractVerified, publicClient, fetchOwnedNFTs]);

  // 监听网络变化 - 优化重置逻辑
  useEffect(() => {
    if (chainId && mountedRef.current) {
      console.log(`网络变化 - 链ID: ${chainId}`);
      // 网络变化时重置状态
      setContractVerified(false);
      setErrorMessage(null);
      setOwnedNFTs([]);
      setLoading(true);
      contractVerificationInProgress.current = false;
      nftFetchInProgress.current = false;
      lastFetchedAddress.current = null;
      mintSuccessHandled.current = false;

      // 清除所有定时器
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
    }
  }, [chainId]);

  // 组件挂载状态管理
  useEffect(() => {
    mountedRef.current = true;
    console.log("NFT组件已挂载");

    return () => {
      console.log("NFT组件正在卸载");
      mountedRef.current = false;
      mintSuccessHandled.current = false;

      // 清理所有定时器
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
    };
  }, []);

  // 根据筛选条件显示NFT - 使用 useMemo 优化
  const displayedNFTs = useMemo(() => {
    const result =
      currentFilter === "owned"
        ? ownedNFTs
        : Array.from({ length: totalMinted }, (_, i) => i);

    console.log(`显示的NFT数量: ${result.length}, 筛选条件: ${currentFilter}`);
    return result;
  }, [currentFilter, ownedNFTs, totalMinted]);

  // 如果合约验证失败，显示错误信息
  if (!contractVerified && errorMessage) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <h2 className="text-xl font-bold mb-2">合约错误</h2>
          <p>{errorMessage}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-100 border border-black mt-6">
          <h3 className="text-lg font-semibold mb-4">合约信息</h3>
          <p className="mb-2">地址: {CryptoMonkeysABI.address}</p>
          <p>请检查合约地址是否正确，以及网络连接是否正常。</p>
          <p className="mt-2">
            当前网络: {currentChain.name} (ID: {currentChain.id})
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start mb-10">
        <div>
          <h1 className="text-4xl font-bold mb-2">CryptoMonkeys NFT</h1>
          <p className="text-black-300 mb-4">
            收集具有不同特征和稀有度的独特猴子NFT。
          </p>
          <p className="text-sm text-gray-500">
            当前网络: {currentChain.name} (ID: {currentChain.id})
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <p>{errorMessage}</p>
        </div>
      )}

      {/* 统计部分 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="bg-white p-6 rounded-lg shadow-100 border border-black">
          <h3 className="text-lg font-semibold">总供应量</h3>
          <p className="text-3xl font-bold">
            {maxSupply ? Number(maxSupply).toLocaleString() : "10,000"}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-100 border border-black">
          <h3 className="text-lg font-semibold">已铸造</h3>
          <p className="text-3xl font-bold">{totalMinted.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-100 border border-black">
          <h3 className="text-lg font-semibold">可用</h3>
          <p className="text-3xl font-bold">
            {maxSupply
              ? (Number(maxSupply) - totalMinted).toLocaleString()
              : (10000 - totalMinted).toLocaleString()}
          </p>
        </div>
      </div>

      {/* 铸造部分 */}
      <MintingSection
        isConnected={isConnected}
        isOwner={isOwner}
        contractAddress={CryptoMonkeysABI.address}
        abi={CryptoMonkeysABI.abi}
        onMintSuccess={handleMintSuccess}
      />

      {/* 收藏部分 */}
      <div className="mt-16">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">NFT收藏</h2>
          <div className="flex space-x-2">
            <button
              className={`px-4 py-2 rounded-md ${
                currentFilter === "all"
                  ? "bg-primary text-white"
                  : "bg-white border border-black"
              }`}
              onClick={() => setCurrentFilter("all")}
              disabled={nftFetchInProgress.current}
            >
              所有NFT
            </button>
            <button
              className={`px-4 py-2 rounded-md ${
                currentFilter === "owned"
                  ? "bg-primary text-white"
                  : "bg-white border border-black"
              }`}
              onClick={() => {
                if (!isConnected) {
                  toast({
                    title: "请先连接钱包",
                  });
                  return;
                }
                setCurrentFilter("owned");
              }}
              disabled={nftFetchInProgress.current}
            >
              我的NFT
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : !isConnected && currentFilter === "owned" ? (
          <div className="text-center py-16">
            <p className="text-xl text-black-300">连接您的钱包以查看您的NFT</p>
          </div>
        ) : displayedNFTs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-black-300">
              {currentFilter === "owned"
                ? "您还没有拥有任何CryptoMonkeys"
                : "还没有铸造任何NFT"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {displayedNFTs.map((tokenId) => (
              <NFTCard
                key={`${tokenId}-${refreshTrigger}`}
                tokenId={tokenId}
                contractAddress={CryptoMonkeysABI.address}
                abi={CryptoMonkeysABI.abi}
                isOwned={ownedNFTs.includes(tokenId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NFT;
