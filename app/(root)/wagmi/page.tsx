"use client";

import { useState, useEffect } from "react";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useSignMessage,
  useVerifyMessage,
  useBalance,
  usePublicClient,
  useWalletClient,
  useChainId,
  useWatchContractEvent,
  useSwitchChain,
} from "wagmi";
import { parseEther, formatEther, formatUnits } from "viem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import counterABI from "@/lib/abi/Counter.json";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

// ERC20 ABI (精简版)
const erc20ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
    ],
    name: "Transfer",
    type: "event",
  },
] as const;

// 常用测试网络的代币合约地址
const TEST_TOKENS = {
  // Sepolia 测试网
  11155111: {
    name: "MIK  (Sepolia 测试网)",
    address: "0x29c3A0FD12E14E88B73d6ff796AFEd06BF5e5d13",
    decimals: 6,
  },
  // Goerli 测试网
  5: {
    name: "USDT (测试)",
    address: "0x509Ee0d083DdF8AC028f2a56731412edD63223B9",
    decimals: 6,
  },
};

const Wagmi = () => {
  const account = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [incrementAmount, setIncrementAmount] = useState<string>("1");
  const [message, setMessage] = useState<string>("");
  const [signature, setSignature] = useState<string>("");
  const [verifyInputMessage, setVerifyInputMessage] = useState<string>("");
  const [verifyInputSignature, setVerifyInputSignature] = useState<string>("");
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean;
    recoveredAddress?: string;
  } | null>(null);

  const [addressToCheck, setAddressToCheck] = useState<string>("");
  const [tokenBalance, setTokenBalance] = useState<string | null>(null);
  const [isLoadingTokenBalance, setIsLoadingTokenBalance] = useState(false);

  const [recipientAddress, setRecipientAddress] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("0.01");
  const [transferHash, setTransferHash] = useState<string | null>(null);
  const [transferStatus, setTransferStatus] = useState<string | null>(null);

  const [transferEvents, setTransferEvents] = useState<
    Array<{
      from: string;
      to: string;
      value: string;
      blockNumber: number;
      transactionHash: string;
    }>
  >([]);

  const { data: ethBalance, refetch: refetchBalance } = useBalance({
    address: account.address,
  });

  const [verifyParams, setVerifyParams] = useState<{
    message: string;
    signature: `0x${string}`;
    address?: `0x${string}`;
  } | null>(null);

  const {
    data: counterValue,
    isLoading: isLoadingCounter,
    refetch,
  } = useReadContract({
    address: counterABI.address as `0x${string}`,
    abi: counterABI.abi,
    functionName: "x",
    query: { enabled: Boolean(account.address) },
  });

  const {
    data: hash,
    isPending: isPendingWrite,
    writeContract,
  } = useWriteContract();

  const {
    data: signData,
    isPending: isSignPending,
    signMessage,
    error: signError,
  } = useSignMessage();

  const {
    data: verifyData,
    isPending: isVerifying,
    error: verifyError,
  } = useVerifyMessage(
    verifyParams
      ? {
          message: verifyParams.message,
          signature: verifyParams.signature,
          address: verifyParams.address,
        }
      : undefined
  );

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  // 获取当前链上的代币地址
  function getTokenAddressForCurrentChain(): string | undefined {
    return TEST_TOKENS[chainId as keyof typeof TEST_TOKENS]?.address;
  }

  // 获取当前链上的代币名称
  function getTokenNameForCurrentChain(): string {
    return TEST_TOKENS[chainId as keyof typeof TEST_TOKENS]?.name || "未知代币";
  }

  useWatchContractEvent({
    address: getTokenAddressForCurrentChain() as `0x${string}`,
    abi: erc20ABI,
    eventName: "Transfer",
    onLogs(logs) {
      console.log(
        "Transfer logs:",
        JSON.stringify(logs, (key, value) =>
          typeof value === "bigint" ? value.toString() : value
        )
      );

      interface TransferLog {
        args: {
          from: `0x${string}`;
          to: `0x${string}`;
          value: bigint;
        };
        blockNumber: bigint | null;
        transactionHash: `0x${string}` | null;
      }

      logs.forEach((log) => {
        try {
          const typedLog = log as unknown as TransferLog;

          if (
            typedLog.args &&
            typedLog.args.from &&
            typedLog.args.to &&
            typedLog.args.value !== undefined
          ) {
            setTransferEvents((prev) => {
              const newEvent = {
                from: typedLog.args.from,
                to: typedLog.args.to,
                value: formatUnits(
                  typedLog.args.value,
                  TEST_TOKENS[chainId as keyof typeof TEST_TOKENS]?.decimals ||
                    18
                ),
                blockNumber: typedLog.blockNumber
                  ? Number(typedLog.blockNumber)
                  : 0,
                transactionHash: typedLog.transactionHash || "unknown",
              };

              return [newEvent, ...prev.slice(0, 9)];
            });
          }
        } catch (error) {
          console.error(
            "Error processing transfer event:",
            error instanceof Error ? error.message : String(error)
          );
        }
      });
    },
  });

  useEffect(() => {
    if (isConfirmed) {
      toast({
        title: "交易成功",
        description: "合约状态已更新",
      });
      refetch();
    }
  }, [isConfirmed, refetch]);

  useEffect(() => {
    if (signData) {
      setSignature(signData);
      setVerifyInputMessage(message);
      setVerifyInputSignature(signData);
      toast({
        title: "签名成功",
        description: "消息已成功签名",
      });
    }
    if (signError) {
      toast({
        title: "签名失败",
        description: signError.message || "签名过程出错",
        variant: "destructive",
      });
    }
  }, [signData, signError, message]);

  useEffect(() => {
    if (verifyData !== undefined) {
      setVerificationResult({
        isValid: verifyData,
        recoveredAddress: verifyData ? account.address : undefined,
      });

      toast({
        title: verifyData ? "验证成功" : "验证失败",
        description: verifyData ? "签名有效" : "签名无效",
        variant: verifyData ? "default" : "destructive",
      });

      setVerifyParams(null);
    }
    if (verifyError) {
      setVerificationResult({
        isValid: false,
      });
      toast({
        title: "验证失败",
        description: verifyError.message || "验证过程出错",
        variant: "destructive",
      });

      setVerifyParams(null);
    }
  }, [verifyData, verifyError, account.address]);

  const handleIncrement = () => {
    writeContract({
      address: counterABI.address as `0x${string}`,
      abi: counterABI.abi,
      functionName: "inc",
    });
  };

  const handleIncrementBy = () => {
    if (
      !incrementAmount ||
      isNaN(Number(incrementAmount)) ||
      Number(incrementAmount) <= 0
    ) {
      toast({
        title: "输入错误",
        description: "请输入大于0的数值",
        variant: "destructive",
      });
      return;
    }

    writeContract({
      address: counterABI.address as `0x${string}`,
      abi: counterABI.abi,
      functionName: "incBy",
      args: [BigInt(incrementAmount)],
    });
  };

  const handleSignMessage = () => {
    const messageToSign =
      message ||
      `我确认要将计数器增加 ${incrementAmount} 单位。\n地址: ${
        counterABI.address
      }\n时间: ${new Date().toISOString()}`;
    setMessage(messageToSign);

    signMessage({ message: messageToSign });
  };

  const createDefaultMessage = () => {
    const defaultMsg = `我确认要将计数器增加 ${incrementAmount} 单位。\n地址: ${
      counterABI.address
    }\n时间: ${new Date().toISOString()}`;
    setMessage(defaultMsg);
  };

  const handleVerifySignature = () => {
    if (!verifyInputMessage || !verifyInputSignature) {
      toast({
        title: "输入错误",
        description: "请输入消息和签名",
        variant: "destructive",
      });
      return;
    }

    setVerificationResult(null);

    const signature = verifyInputSignature.startsWith("0x")
      ? (verifyInputSignature as `0x${string}`)
      : (`0x${verifyInputSignature}` as `0x${string}`);

    setVerifyParams({
      message: verifyInputMessage,
      signature: signature,
      address: account.address,
    });
  };

  const useCurrentSignature = () => {
    setVerifyInputMessage(message);
    setVerifyInputSignature(signature);
  };

  const checkTokenBalance = async () => {
    if (!addressToCheck || !publicClient) {
      toast({
        title: "输入错误",
        description: "请输入有效的地址",
        variant: "destructive",
      });
      return;
    }

    const tokenAddress = getTokenAddressForCurrentChain();
    if (!tokenAddress) {
      toast({
        title: "错误",
        description: "当前网络没有配置测试代币",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoadingTokenBalance(true);
      const balance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20ABI,
        functionName: "balanceOf",
        args: [addressToCheck as `0x${string}`],
      });

      // 修复类型错误：确保 balance 是 bigint 类型
      if (typeof balance === "bigint") {
        const decimals =
          TEST_TOKENS[chainId as keyof typeof TEST_TOKENS]?.decimals || 18;
        setTokenBalance(formatUnits(balance, decimals));
      } else {
        // 如果不是 bigint，尝试转换
        const decimals =
          TEST_TOKENS[chainId as keyof typeof TEST_TOKENS]?.decimals || 18;
        setTokenBalance(formatUnits(BigInt(String(balance)), decimals));
      }

      toast({
        title: "查询成功",
        description: `余额已更新`,
      });
    } catch (error: unknown) {
      toast({
        title: "查询失败",
        description:
          error instanceof Error ? error.message : "无法获取代币余额",
        variant: "destructive",
      });
      setTokenBalance(null);
    } finally {
      setIsLoadingTokenBalance(false);
    }
  };

  const sendEth = async () => {
    if (!walletClient || !recipientAddress || !transferAmount) {
      toast({
        title: "输入错误",
        description: "请输入有效的接收地址和金额",
        variant: "destructive",
      });
      return;
    }

    try {
      setTransferStatus("pending");

      const hash = await walletClient.sendTransaction({
        to: recipientAddress as `0x${string}`,
        value: parseEther(transferAmount),
      });

      setTransferHash(hash);
      setTransferStatus("submitted");

      toast({
        title: "交易已提交",
        description: "ETH转账交易已提交到区块链",
      });

      const receipt = await publicClient?.waitForTransactionReceipt({
        hash,
      });

      if (receipt?.status === "success") {
        setTransferStatus("confirmed");
        toast({
          title: "交易成功",
          description: "ETH转账已确认",
        });
        refetchBalance();
      } else {
        setTransferStatus("failed");
        toast({
          title: "交易失败",
          description: "ETH转账交易失败",
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      setTransferStatus("failed");
      toast({
        title: "转账失败",
        description: error instanceof Error ? error.message : "发送ETH时出错",
        variant: "destructive",
      });
    }
  };

  const handleSwitchNetwork = (chainId: number) => {
    try {
      switchChain({ chainId });
    } catch (error: unknown) {
      toast({
        title: "切换网络失败",
        description:
          error instanceof Error ? error.message : "无法切换到目标网络",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          以太坊交互示例
        </h1>

        {/* 网络信息 */}
        <div className="mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium text-gray-700">
                当前网络: {chainId}
              </h2>
              {account.address && (
                <p className="text-sm text-gray-600 mt-1">
                  钱包地址: <span className="font-mono">{account.address}</span>
                </p>
              )}
              {ethBalance && (
                <p className="text-sm text-gray-600 mt-1">
                  ETH余额:{" "}
                  <span className="font-medium">
                    {formatEther(ethBalance.value)} ETH
                  </span>
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSwitchNetwork(5)}
              >
                切换到 Goerli
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSwitchNetwork(11155111)}
              >
                切换到 Sepolia
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="counter" className="mb-6">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="counter">Counter合约</TabsTrigger>
            <TabsTrigger value="signature">签名验证</TabsTrigger>
            <TabsTrigger value="balance">余额查询</TabsTrigger>
            <TabsTrigger value="transfer">发送交易</TabsTrigger>
          </TabsList>

          {/* Counter合约交互 */}
          <TabsContent value="counter">
            <Card>
              <CardHeader>
                <CardTitle>Counter 合约交互</CardTitle>
              </CardHeader>
              <CardContent>
                {/* 计数器值显示 */}
                <div className="mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
                  <h2 className="text-lg text-gray-700 mb-2">当前计数器值:</h2>
                  <div className="flex items-center">
                    {isLoadingCounter ? (
                      <div className="h-12 w-24 bg-gray-200 animate-pulse rounded-md"></div>
                    ) : (
                      <span className="text-4xl font-bold text-blue-600">
                        {counterValue?.toString() || "0"}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-4 text-gray-600"
                      onClick={() => refetch()}
                    >
                      刷新
                    </Button>
                  </div>
                </div>

                {/* 操作区域 */}
                <div className="space-y-6">
                  {/* 简单递增 */}
                  <div className="p-4 border border-gray-200 rounded-md">
                    <h3 className="font-medium mb-3 text-gray-800">增加 1</h3>
                    <Button
                      onClick={handleIncrement}
                      disabled={isPendingWrite || isConfirming}
                    >
                      {isPendingWrite || isConfirming
                        ? "处理中..."
                        : "递增 (+1)"}
                    </Button>
                  </div>

                  {/* 自定义递增 */}
                  <div className="p-4 border border-gray-200 rounded-md">
                    <h3 className="font-medium mb-3 text-gray-800">
                      自定义增加值
                    </h3>
                    <div className="flex gap-3">
                      <Input
                        type="number"
                        value={incrementAmount}
                        onChange={(e) => setIncrementAmount(e.target.value)}
                        placeholder="输入增加值"
                        className="max-w-[200px]"
                        min="1"
                      />
                      <Button
                        onClick={handleIncrementBy}
                        disabled={isPendingWrite || isConfirming}
                        variant="secondary"
                      >
                        {isPendingWrite || isConfirming ? "处理中..." : "递增"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 交易状态 */}
                {hash && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-md">
                    <h3 className="font-medium mb-2 text-gray-800">交易状态</h3>
                    <div className="flex flex-col gap-1">
                      <p className="text-sm text-gray-600">
                        交易哈希:{" "}
                        <span className="font-mono text-xs break-all">
                          {hash}
                        </span>
                      </p>
                      <p className="text-sm">
                        状态:{" "}
                        {isConfirming ? (
                          <span className="text-yellow-600">确认中...</span>
                        ) : isConfirmed ? (
                          <span className="text-green-600">已确认</span>
                        ) : (
                          <span className="text-blue-600">已提交</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 签名验证 */}
          <TabsContent value="signature">
            <Card>
              <CardHeader>
                <CardTitle>消息签名与验证</CardTitle>
              </CardHeader>
              <CardContent>
                {/* 签名区域 */}
                <div className="p-4 border border-gray-200 rounded-md mb-6">
                  <h3 className="font-medium mb-3 text-gray-800">交易签名</h3>
                  <div className="space-y-3">
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="输入要签名的消息"
                      className="min-h-[100px] font-mono text-sm"
                    />
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={createDefaultMessage}
                        className="text-gray-600"
                      >
                        生成默认消息
                      </Button>
                      <Button
                        onClick={handleSignMessage}
                        disabled={isSignPending || !account.address}
                      >
                        {isSignPending ? "签名中..." : "签名消息"}
                      </Button>
                    </div>

                    {signature && (
                      <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                        <h4 className="text-sm font-medium mb-1 text-gray-600">
                          签名结果:
                        </h4>
                        <p className="font-mono text-xs break-all">
                          {signature}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 验证签名区域 */}
                <div className="p-4 border border-gray-200 rounded-md">
                  <h3 className="font-medium mb-3 text-gray-800">验证签名</h3>
                  <div className="space-y-3">
                    <Textarea
                      value={verifyInputMessage}
                      onChange={(e) => setVerifyInputMessage(e.target.value)}
                      placeholder="输入原始消息"
                      className="min-h-[80px] font-mono text-sm"
                    />
                    <Textarea
                      value={verifyInputSignature}
                      onChange={(e) => setVerifyInputSignature(e.target.value)}
                      placeholder="输入签名"
                      className="min-h-[80px] font-mono text-sm"
                    />
                    <div className="flex gap-3">
                      {signature && (
                        <Button
                          variant="outline"
                          onClick={useCurrentSignature}
                          className="text-gray-600"
                        >
                          使用当前签名
                        </Button>
                      )}
                      <Button
                        onClick={handleVerifySignature}
                        disabled={
                          isVerifying ||
                          !verifyInputMessage ||
                          !verifyInputSignature ||
                          !account.address
                        }
                      >
                        {isVerifying ? "验证中..." : "验证签名"}
                      </Button>
                    </div>

                    {verificationResult !== null && (
                      <div
                        className={`mt-3 p-3 rounded border ${
                          verificationResult.isValid
                            ? "bg-green-50 border-green-200"
                            : "bg-red-50 border-red-200"
                        }`}
                      >
                        <h4 className="text-sm font-medium mb-1">验证结果:</h4>
                        {verificationResult.isValid ? (
                          <>
                            <p className="text-green-600 font-medium">
                              ✓ 签名有效
                            </p>
                            {verificationResult.recoveredAddress && (
                              <p className="text-sm mt-1">
                                签名者地址:{" "}
                                <span className="font-mono text-xs break-all">
                                  {verificationResult.recoveredAddress}
                                </span>
                              </p>
                            )}
                            <p className="text-sm mt-1 text-green-600">
                              ✓ 签名者是当前连接的钱包
                            </p>
                          </>
                        ) : (
                          <p className="text-red-600 font-medium">✗ 签名无效</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 余额查询 */}
          <TabsContent value="balance">
            <Card>
              <CardHeader>
                <CardTitle>查询代币余额</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="addressToCheck">地址</Label>
                    <div className="flex gap-3 mt-1">
                      <Input
                        id="addressToCheck"
                        value={addressToCheck}
                        onChange={(e) => setAddressToCheck(e.target.value)}
                        placeholder="输入要查询的地址"
                        className="flex-1"
                      />
                      <Button
                        onClick={checkTokenBalance}
                        disabled={isLoadingTokenBalance || !addressToCheck}
                      >
                        {isLoadingTokenBalance ? "查询中..." : "查询余额"}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      当前查询的代币: {getTokenNameForCurrentChain()}
                    </p>
                  </div>

                  {tokenBalance !== null && (
                    <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
                      <h3 className="font-medium mb-2 text-gray-800">
                        查询结果
                      </h3>
                      <p className="text-2xl font-bold">
                        {tokenBalance} {getTokenNameForCurrentChain()}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        地址:{" "}
                        <span className="font-mono">{addressToCheck}</span>
                      </p>
                    </div>
                  )}

                  <div className="p-4 border border-gray-200 rounded-md">
                    <h3 className="font-medium mb-3 text-gray-800">
                      {getTokenNameForCurrentChain()} 转账事件
                    </h3>
                    {transferEvents.length > 0 ? (
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {transferEvents.map((event, index) => (
                          <div
                            key={`${event.transactionHash}-${index}`}
                            className="p-2 border border-gray-200 rounded text-sm"
                          >
                            <p>
                              <span className="font-medium">从:</span>{" "}
                              <span className="font-mono">{`${event.from.slice(
                                0,
                                6
                              )}...${event.from.slice(-4)}`}</span>
                            </p>
                            <p>
                              <span className="font-medium">到:</span>{" "}
                              <span className="font-mono">{`${event.to.slice(
                                0,
                                6
                              )}...${event.to.slice(-4)}`}</span>
                            </p>
                            <p>
                              <span className="font-medium">金额:</span>{" "}
                              {event.value} {getTokenNameForCurrentChain()}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              区块: {event.blockNumber}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">暂无转账事件</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 发送交易 */}
          <TabsContent value="transfer">
            <Card>
              <CardHeader>
                <CardTitle>发送ETH</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="recipientAddress">接收地址</Label>
                    <Input
                      id="recipientAddress"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      placeholder="输入接收ETH的地址"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="transferAmount">金额 (ETH)</Label>
                    <Input
                      id="transferAmount"
                      type="number"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      placeholder="输入要发送的ETH数量"
                      className="mt-1"
                      step="0.001"
                      min="0"
                    />
                    {ethBalance && (
                      <p className="text-sm text-gray-500 mt-1">
                        可用余额: {formatEther(ethBalance.value)} ETH
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={sendEth}
                    disabled={
                      transferStatus === "pending" ||
                      !recipientAddress ||
                      !transferAmount ||
                      !account.address
                    }
                    className="w-full"
                  >
                    {transferStatus === "pending" ? "发送中..." : "发送ETH"}
                  </Button>

                  {transferHash && (
                    <div className="p-4 bg-white-100 rounded-md border border-black-100">
                      <h3 className="font-medium mb-2 text-black-200">
                        交易状态
                      </h3>
                      <p className="text-sm">
                        交易哈希:{" "}
                        <span className="font-mono text-xs break-all">
                          {transferHash}
                        </span>
                      </p>
                      <p className="text-sm mt-2">
                        状态:{" "}
                        {transferStatus === "pending" ? (
                          <span className="text-yellow-600">处理中...</span>
                        ) : transferStatus === "submitted" ? (
                          <span className="text-blue-600">已提交</span>
                        ) : transferStatus === "confirmed" ? (
                          <span className="text-green-600">已确认</span>
                        ) : (
                          <span className="text-red-600">失败</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 合约信息 */}
        <div className="mt-8 text-sm text-black-300">
          <p>
            Counter合约地址:{" "}
            <span className="font-mono">{counterABI.address}</span>
          </p>
          {TEST_TOKENS[chainId as keyof typeof TEST_TOKENS] && (
            <p>
              {getTokenNameForCurrentChain()}地址:{" "}
              <span className="font-mono">
                {getTokenAddressForCurrentChain()}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Wagmi;
