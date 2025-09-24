"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { parseUnits, formatUnits } from "viem";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDown, RefreshCw, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTokenOptions, Token } from "@/hooks/useTokenOptions";
import usePoolManagerWithClients from "@/hooks/usePoolManagerWithClients";
import useSwapRouterWithClients from "@/hooks/useSwapRouterWithClients";
import { PoolInfo } from "@/store/usePoolManagerStore";
import { useWallet } from "@/provider";

// 费率选项
const FEE_TIERS = [
  { value: 100, label: "0.01%", description: "最适合稳定币" },
  { value: 500, label: "0.05%", description: "低波动性代币对" },
  { value: 3000, label: "0.3%", description: "大多数代币对" },
  { value: 10000, label: "1%", description: "高波动性代币对" },
];

export const NewSwap = () => {
  const { toast } = useToast();
  const { address } = useWallet();

  // 使用 useTokenOptions 代替模拟数据
  const {
    inTokens,
    outTokens,
    isLoading: tokensLoading,
    error: tokensError,
    refetchBalances,
  } = useTokenOptions();

  // 获取所有的池子
  const {
    poolsInfo,
    isLoading: poolsLoading,
    fetchAllPools,
  } = usePoolManagerWithClients();

  // 使用 SwapRouter 进行交易
  const {
    exactInput,
    exactOutput,
    quoteExactInput,
    quoteExactOutput,
    isWritePending,
    writeData,
  } = useSwapRouterWithClients();

  // 状态管理
  const [inputToken, setInputToken] = useState<Token | null>(null);
  const [outputToken, setOutputToken] = useState<Token | null>(null);
  const [inputAmount, setInputAmount] = useState("");
  const [outputAmount, setOutputAmount] = useState("");
  const [selectedFee, setSelectedFee] = useState<number>(3000); // 默认 0.3% 费率
  const [isLoading, setIsLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [slippage, setSlippage] = useState<number>(0.5); // 默认滑点 0.5%
  const [deadline, setDeadline] = useState<number>(20); // 默认截止时间 20 分钟
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    // 每次组件加载时获取最新的池子信息
    fetchAllPools();
  }, []);

  // 初始化代币选择
  useEffect(() => {
    if (inTokens.length > 0 && !inputToken) {
      setInputToken(inTokens[0]);
    }

    if (outTokens.length > 1 && !outputToken) {
      // 选择第二个代币作为输出代币，避免与输入代币相同
      setOutputToken(outTokens[1] || outTokens[0]);
    }
  }, [inTokens, outTokens, inputToken, outputToken]);

  // 根据选择的代币对筛选可用的池子
  const availablePools = useMemo(() => {
    if (!inputToken || !outputToken || !poolsInfo || poolsInfo.length === 0) {
      return [];
    }

    // 筛选包含所选代币对的池子
    return poolsInfo.filter((pool) => {
      const matchesTokens =
        (pool.token0.toLowerCase() === inputToken.address.toLowerCase() &&
          pool.token1.toLowerCase() === outputToken.address.toLowerCase()) ||
        (pool.token0.toLowerCase() === outputToken.address.toLowerCase() &&
          pool.token1.toLowerCase() === inputToken.address.toLowerCase());

      return matchesTokens;
    });
  }, [inputToken, outputToken, poolsInfo]);

  // 根据选择的代币对获取可用的费率
  const availableFees = useMemo(() => {
    if (availablePools.length === 0) {
      // 如果没有可用池子，返回所有费率选项
      return FEE_TIERS;
    }

    // 从可用池子中提取唯一的费率
    const uniqueFees = Array.from(
      new Set(availablePools.map((pool) => pool.fee))
    );

    // 将唯一费率映射到费率选项
    return FEE_TIERS.filter((feeTier) => uniqueFees.includes(feeTier.value));
  }, [availablePools]);

  // 获取当前选择的池子
  const selectedPool = useMemo(() => {
    if (availablePools.length === 0) return null;

    // 根据选择的费率筛选池子
    const poolsWithSelectedFee = availablePools.filter(
      (pool) => pool.fee === selectedFee
    );

    return poolsWithSelectedFee.length > 0 ? poolsWithSelectedFee[0] : null;
  }, [availablePools, selectedFee]);

  // 简单的价格计算函数（作为备用）
  const calculateOutputAmount = useCallback(
    (
      amount: string,
      fromToken: Token | null,
      toToken: Token | null
    ): string => {
      if (!fromToken || !toToken || !amount || isNaN(parseFloat(amount))) {
        return "0";
      }

      // 如果有选定的池子，使用池子的价格
      if (selectedPool) {
        // 这里应该使用池子的 sqrtPriceX96 计算价格
        // 这是一个简化版本，实际应该使用更复杂的计算
        const inputValue = parseFloat(amount);
        let rate = 1;
        const fee = selectedFee / 1000000; // 费率百分比

        // 根据代币顺序确定价格方向
        if (
          selectedPool.token0.toLowerCase() === fromToken.address.toLowerCase()
        ) {
          // 如果输入代币是 token0，使用正向价格
          rate = Number(selectedPool.sqrtPriceX96) ** 2 / 2 ** 192;
        } else {
          // 如果输入代币是 token1，使用反向价格
          rate = 2 ** 192 / Number(selectedPool.sqrtPriceX96) ** 2;
        }

        // 应用费率
        const outputValue = inputValue * rate * (1 - fee);
        return outputValue.toFixed(toToken.decimals);
      }

      // 如果没有池子，使用简单的价格估算
      let rate = 1;

      // 根据代币符号设置简单汇率
      if (fromToken.symbol === "ETH" && toToken.symbol === "USDC") {
        rate = 3000;
      } else if (fromToken.symbol === "USDC" && toToken.symbol === "ETH") {
        rate = 1 / 3000;
      } else if (fromToken.symbol === "ETH" && toToken.symbol === "USDT") {
        rate = 3000;
      } else if (fromToken.symbol === "USDT" && toToken.symbol === "ETH") {
        rate = 1 / 3000;
      } else if (fromToken.symbol === "USDC" && toToken.symbol === "USDT") {
        rate = 1;
      } else if (fromToken.symbol === "USDT" && toToken.symbol === "USDC") {
        rate = 1;
      }

      const inputValue = parseFloat(amount);
      if (isNaN(inputValue)) return "0";

      const feePercentage = selectedFee / 1000000; // 费率百分比
      const outputValue = inputValue * rate * (1 - feePercentage);
      return outputValue.toFixed(toToken.decimals);
    },
    [selectedFee, selectedPool]
  );

  // 获取精确的输出金额报价
  const getExactOutputQuote = useCallback(
    async (inputToken: Token, outputToken: Token, inputAmount: string) => {
      if (
        !inputToken ||
        !outputToken ||
        !inputAmount ||
        parseFloat(inputAmount) <= 0
      ) {
        return "0";
      }

      // 确定使用的费率

      try {
        setQuoteLoading(true);
        // 使用 quoteExactInput 获取准确的输出金额
        const quoteParams = {
          tokenIn: inputToken.address as `0x${string}`,
          tokenOut: outputToken.address as `0x${string}`,
          indexPath: selectedPool ? [selectedPool.index] : [0],
          amountIn: parseUnits(inputAmount, inputToken.decimals),
          sqrtPriceLimitX96: 0n,
        };

        const expectedOutput = await quoteExactInput(quoteParams);
        return formatUnits(expectedOutput, outputToken.decimals);
      } catch (error) {
        console.error("获取报价失败:", error);
        // 如果报价失败，使用简单计算作为回退方案
        return calculateOutputAmount(inputAmount, inputToken, outputToken);
      } finally {
        setQuoteLoading(false);
      }
    },
    [selectedPool, selectedFee, quoteExactInput, calculateOutputAmount]
  );

  // 获取精确的输入金额报价
  const getExactInputQuote = useCallback(
    async (inputToken: Token, outputToken: Token, outputAmount: string) => {
      if (
        !inputToken ||
        !outputToken ||
        !outputAmount ||
        parseFloat(outputAmount) <= 0
      ) {
        return "0";
      }

      try {
        setQuoteLoading(true);
        // 使用 quoteExactOutput 获取准确的输入金额
        const quoteParams = {
          tokenIn: inputToken.address as `0x${string}`,
          tokenOut: outputToken.address as `0x${string}`,
          indexPath: selectedPool ? [selectedPool.index] : [0],
          amountOut: parseUnits(outputAmount, outputToken.decimals),
          sqrtPriceLimitX96: selectedPool ? selectedPool.sqrtPriceX96 : 0n,
        };

        const requiredInput = await quoteExactOutput(quoteParams);
        return formatUnits(requiredInput, inputToken.decimals);
      } catch (error) {
        console.error("获取反向报价失败:", error);

        // 如果报价失败，使用简单计算的反向计算
        let rate = 1;
        const feePercentage = selectedFee / 1000000; // 费率百分比

        // 如果有选定的池子，使用池子的价格
        if (selectedPool) {
          // 根据代币顺序确定价格方向
          if (
            selectedPool.token0.toLowerCase() ===
            inputToken.address.toLowerCase()
          ) {
            // 如果输入代币是 token0，使用正向价格
            rate = Number(selectedPool.sqrtPriceX96) ** 2 / 2 ** 192;
          } else {
            // 如果输入代币是 token1，使用反向价格
            rate = 2 ** 192 / Number(selectedPool.sqrtPriceX96) ** 2;
          }
        } else {
          // 使用简单的价格估算
          if (inputToken.symbol === "ETH" && outputToken.symbol === "USDC") {
            rate = 3000;
          } else if (
            inputToken.symbol === "USDC" &&
            outputToken.symbol === "ETH"
          ) {
            rate = 1 / 3000;
          } else if (
            inputToken.symbol === "ETH" &&
            outputToken.symbol === "USDT"
          ) {
            rate = 3000;
          } else if (
            inputToken.symbol === "USDT" &&
            outputToken.symbol === "ETH"
          ) {
            rate = 1 / 3000;
          } else if (
            inputToken.symbol === "USDC" &&
            outputToken.symbol === "USDT"
          ) {
            rate = 1;
          } else if (
            inputToken.symbol === "USDT" &&
            outputToken.symbol === "USDC"
          ) {
            rate = 1;
          }
        }

        if (rate <= 0) return "0";

        // 计算考虑费率的输入金额
        const calculatedInput = (
          parseFloat(outputAmount) /
          rate /
          (1 - feePercentage)
        ).toFixed(inputToken.decimals);

        return calculatedInput;
      } finally {
        setQuoteLoading(false);
      }
    },
    [selectedPool, selectedFee, quoteExactOutput]
  );

  // 处理输入金额变化
  const handleInputAmountChange = useCallback(
    async (value: string) => {
      setInputAmount(value);

      if (!value || isNaN(parseFloat(value)) || !inputToken || !outputToken) {
        setOutputAmount("");
        return;
      }

      // 先使用简单计算显示一个近似值
      const estimatedOutput = calculateOutputAmount(
        value,
        inputToken,
        outputToken
      );
      setOutputAmount(estimatedOutput);

      // 然后获取精确报价
      const exactOutput = await getExactOutputQuote(
        inputToken,
        outputToken,
        value
      );
      if (exactOutput !== "0") {
        setOutputAmount(exactOutput);
      }
    },
    [inputToken, outputToken, calculateOutputAmount, getExactOutputQuote]
  );

  // 处理输出金额变化
  const handleOutputAmountChange = useCallback(
    async (value: string) => {
      setOutputAmount(value);

      if (!value || isNaN(parseFloat(value)) || !inputToken || !outputToken) {
        setInputAmount("");
        return;
      }

      // 先使用简单计算显示一个近似值
      let rate = 1;
      const feePercentage = selectedFee / 1000000;

      if (selectedPool) {
        if (
          selectedPool.token0.toLowerCase() === inputToken.address.toLowerCase()
        ) {
          rate = Number(selectedPool.sqrtPriceX96) ** 2 / 2 ** 192;
        } else {
          rate = 2 ** 192 / Number(selectedPool.sqrtPriceX96) ** 2;
        }
      } else {
        // 简单价格估算
        if (inputToken.symbol === "ETH" && outputToken.symbol === "USDC") {
          rate = 3000;
        } else if (
          inputToken.symbol === "USDC" &&
          outputToken.symbol === "ETH"
        ) {
          rate = 1 / 3000;
        } else if (
          inputToken.symbol === "ETH" &&
          outputToken.symbol === "USDT"
        ) {
          rate = 3000;
        } else if (
          inputToken.symbol === "USDT" &&
          outputToken.symbol === "ETH"
        ) {
          rate = 1 / 3000;
        } else if (
          inputToken.symbol === "USDC" &&
          outputToken.symbol === "USDT"
        ) {
          rate = 1;
        } else if (
          inputToken.symbol === "USDT" &&
          outputToken.symbol === "USDC"
        ) {
          rate = 1;
        }
      }

      if (rate > 0) {
        const calculatedInput = (
          parseFloat(value) /
          rate /
          (1 - feePercentage)
        ).toFixed(inputToken.decimals);
        setInputAmount(calculatedInput);
      }

      // 然后获取精确报价
      const exactInput = await getExactInputQuote(
        inputToken,
        outputToken,
        value
      );
      if (exactInput !== "0") {
        setInputAmount(exactInput);
      }
    },
    [inputToken, outputToken, selectedPool, selectedFee, getExactInputQuote]
  );

  // 交换代币位置
  const handleSwapTokens = useCallback(() => {
    if (!inputToken || !outputToken) return;

    setInputToken(outputToken);
    setOutputToken(inputToken);
    setInputAmount(outputAmount);
    setOutputAmount(inputAmount);
  }, [inputToken, outputToken, inputAmount, outputAmount]);

  // 处理代币选择
  const handleSelectInputToken = useCallback(
    async (value: string) => {
      const token = inTokens.find((t) => t.address === value);
      if (token) {
        // 如果选择的输入代币与输出代币相同，则交换它们
        if (outputToken && token.address === outputToken.address) {
          setInputToken(token);
          setOutputToken(inputToken);
        } else {
          setInputToken(token);
        }

        if (inputAmount && outputToken) {
          // 更新输出金额
          const exactOutput = await getExactOutputQuote(
            token,
            outputToken,
            inputAmount
          );
          if (exactOutput !== "0") {
            setOutputAmount(exactOutput);
          } else {
            const calculatedOutput = calculateOutputAmount(
              inputAmount,
              token,
              outputToken
            );
            setOutputAmount(calculatedOutput);
          }
        }
      }
    },
    [
      inTokens,
      inputAmount,
      outputToken,
      inputToken,
      getExactOutputQuote,
      calculateOutputAmount,
    ]
  );

  const handleSelectOutputToken = useCallback(
    async (value: string) => {
      const token = outTokens.find((t) => t.address === value);
      if (token) {
        // 如果选择的输出代币与输入代币相同，则交换它们
        if (inputToken && token.address === inputToken.address) {
          setOutputToken(token);
          setInputToken(outputToken);
        } else {
          setOutputToken(token);
        }

        if (inputAmount && inputToken) {
          // 更新输出金额
          const exactOutput = await getExactOutputQuote(
            inputToken,
            token,
            inputAmount
          );
          if (exactOutput !== "0") {
            setOutputAmount(exactOutput);
          } else {
            const calculatedOutput = calculateOutputAmount(
              inputAmount,
              inputToken,
              token
            );
            setOutputAmount(calculatedOutput);
          }
        }
      }
    },
    [
      outTokens,
      inputAmount,
      inputToken,
      outputToken,
      getExactOutputQuote,
      calculateOutputAmount,
    ]
  );

  // 处理费率选择
  const handleFeeSelect = useCallback(
    async (fee: number) => {
      setSelectedFee(fee);

      // 更新输出金额计算
      if (inputAmount && inputToken && outputToken) {
        // 更新输出金额
        const exactOutput = await getExactOutputQuote(
          inputToken,
          outputToken,
          inputAmount
        );
        if (exactOutput !== "0") {
          setOutputAmount(exactOutput);
        } else {
          const calculatedOutput = calculateOutputAmount(
            inputAmount,
            inputToken,
            outputToken
          );
          setOutputAmount(calculatedOutput);
        }
      }
    },
    [
      inputAmount,
      inputToken,
      outputToken,
      getExactOutputQuote,
      calculateOutputAmount,
    ]
  );

  // 设置最大金额
  const handleSetMaxAmount = useCallback(async () => {
    if (inputToken && inputToken.balance) {
      setInputAmount(inputToken.balance);
      if (outputToken) {
        // 更新输出金额
        const exactOutput = await getExactOutputQuote(
          inputToken,
          outputToken,
          inputToken.balance
        );
        if (exactOutput !== "0") {
          setOutputAmount(exactOutput);
        } else {
          const calculatedOutput = calculateOutputAmount(
            inputToken.balance,
            inputToken,
            outputToken
          );
          setOutputAmount(calculatedOutput);
        }
      }
    }
  }, [inputToken, outputToken, getExactOutputQuote, calculateOutputAmount]);

  // 刷新价格信息
  const handleRefreshPrice = useCallback(async () => {
    if (!inputToken || !outputToken) return;

    try {
      // 获取1个代币的报价
      const oneTokenQuote = await getExactOutputQuote(
        inputToken,
        outputToken,
        "1"
      );

      // 如果有输入金额，更新输出金额
      if (inputAmount) {
        const exactOutput = await getExactOutputQuote(
          inputToken,
          outputToken,
          inputAmount
        );
        if (exactOutput !== "0") {
          setOutputAmount(exactOutput);
        }
      }
    } catch (error) {
      console.error("刷新价格失败:", error);
    }
  }, [inputToken, outputToken, inputAmount, getExactOutputQuote]);

  // 执行交换
  const handleSwap = useCallback(async () => {
    if (!inputAmount || !outputAmount || !inputToken || !outputToken) return;
    if (!address) {
      toast({
        title: "未连接钱包",
        description: "请先连接钱包后再进行交换",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPool && availablePools.length === 0) {
      toast({
        title: "无可用交易池",
        description: `未找到 ${inputToken.symbol}/${outputToken.symbol} 交易对的池子`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setTxHash(null);

    try {
      // 准备报价参数
      const quoteParams = {
        tokenIn: inputToken.address as `0x${string}`,
        tokenOut: outputToken.address as `0x${string}`,
        indexPath: selectedPool ? [selectedPool.index] : [0],
        amountIn: parseUnits(inputAmount, inputToken.decimals),
        sqrtPriceLimitX96: selectedPool ? selectedPool.sqrtPriceX96 : 0n,
      };

      // 显示获取报价中
      toast({
        title: "获取报价中",
        description: "正在计算交易报价...",
      });

      // 先获取报价
      let expectedOutput;
      try {
        expectedOutput = await quoteExactInput(quoteParams);
        console.log(
          "报价结果:",
          formatUnits(expectedOutput, outputToken.decimals)
        );
      } catch (quoteError) {
        console.error("获取报价失败:", quoteError);
        toast({
          title: "获取报价失败",
          description: quoteError.message || "无法获取交易报价，请稍后重试",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // 计算滑点保护值
      const formattedExpectedOutput = formatUnits(
        expectedOutput,
        outputToken.decimals
      );
      const amountOutMinimum =
        parseFloat(formattedExpectedOutput) * (1 - slippage / 100);

      // 计算截止时间（当前时间 + deadline分钟）
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadline * 60;

      // 准备交易参数 - 修改为与合约接口匹配的结构
      const params = {
        tokenIn: inputToken.address as `0x${string}`,
        tokenOut: outputToken.address as `0x${string}`,
        indexPath: selectedPool ? [selectedPool.index] : [0], // 使用池子索引路径
        recipient: address as `0x${string}`, // 添加接收者地址
        deadline: BigInt(deadlineTimestamp),
        amountIn: parseUnits(inputAmount, inputToken.decimals),
        amountOutMinimum: parseUnits(
          amountOutMinimum.toString(),
          outputToken.decimals
        ),
        sqrtPriceLimitX96: selectedPool ? selectedPool.sqrtPriceX96 : 0n, // 使用池子价格限制或默认0
      };

      console.log("交换参数:", {
        ...params,
        amountIn: params.amountIn.toString(),
        amountOutMinimum: params.amountOutMinimum.toString(),
        deadline: params.deadline.toString(),
        sqrtPriceLimitX96: params.sqrtPriceLimitX96.toString(),
        expectedOutput: formattedExpectedOutput,
      });

      // 显示交易进行中的提示
      toast({
        title: "交易进行中",
        description: "请在钱包中确认交易...",
      });

      // 执行交换
      const result = await exactInput(params);
      console.log("交换结果:", result);

      // 保存交易哈希
      if (result && result.hash) {
        setTxHash(result.hash);

        toast({
          title: "交易已提交",
          description: "交易已提交到区块链，等待确认...",
        });
      }

      toast({
        title: "交换成功",
        description: `已将 ${inputAmount} ${inputToken.symbol} 交换为约 ${formattedExpectedOutput} ${outputToken.symbol}`,
      });

      // 清空输入
      setInputAmount("");
      setOutputAmount("");

      // 交换完成后刷新余额
      refetchBalances();
    } catch (error: any) {
      console.error("交换失败:", error);

      // 详细记录错误信息以便调试
      console.error("错误详情:", {
        message: error.message,
        code: error.code,
        data: error.data,
        stack: error.stack,
      });

      // 处理特定错误
      if (error.message && error.message.includes("SPL")) {
        toast({
          title: "交易失败",
          description: "合约执行错误: SPL。可能是池子流动性不足或价格滑点过大",
          variant: "destructive",
        });
      } else if (
        error.code === 4001 ||
        (error.message && error.message.includes("user rejected"))
      ) {
        toast({
          title: "交易被取消",
          description: "您取消了交易签名",
          variant: "destructive",
        });
      } else {
        toast({
          title: "交换失败",
          description: error.message || "未知错误",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    inputAmount,
    outputAmount,
    inputToken,
    outputToken,
    address,
    slippage,
    deadline,
    selectedPool,
    selectedFee,
    availablePools,
    quoteExactInput,
    exactInput,
    toast,
    refetchBalances,
  ]);

  // 计算交换按钮状态
  const swapButtonState = useMemo(() => {
    if (tokensLoading || poolsLoading || quoteLoading) {
      return { disabled: true, text: "加载中..." };
    }

    if (tokensError) {
      return { disabled: true, text: "加载代币失败" };
    }

    if (!inputToken || !outputToken) {
      return { disabled: true, text: "选择代币" };
    }

    if (!inputAmount || !outputAmount) {
      return { disabled: true, text: "输入金额" };
    }

    const inputValue = parseFloat(inputAmount);
    const inputBalance = inputToken.balance
      ? parseFloat(inputToken.balance)
      : 0;

    if (inputValue > inputBalance) {
      return { disabled: true, text: `余额不足 ${inputToken.symbol}` };
    }

    if (isLoading || isWritePending) {
      return { disabled: true, text: "交换中..." };
    }

    if (!address) {
      return { disabled: true, text: "连接钱包" };
    }

    return { disabled: false, text: "交换" };
  }, [
    inputAmount,
    outputAmount,
    inputToken,
    outputToken,
    isLoading,
    isWritePending,
    tokensLoading,
    tokensError,
    poolsLoading,
    quoteLoading,
    address,
  ]);

  // 价格信息
  const priceInfo = useMemo(() => {
    if (!inputToken || !outputToken) return "";

    const rate = parseFloat(
      calculateOutputAmount("1", inputToken, outputToken)
    );
    return `1 ${inputToken.symbol} ≈ ${rate.toFixed(6)} ${outputToken.symbol}`;
  }, [inputToken, outputToken, calculateOutputAmount]);

  // 刷新代币列表
  const handleRefreshTokens = useCallback(() => {
    refetchBalances();
  }, [refetchBalances]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>代币交换</CardTitle>
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefreshTokens}
              disabled={tokensLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${tokensLoading ? "animate-spin" : ""}`}
              />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 输入部分 */}
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">从</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSetMaxAmount}
              className="h-6 text-xs"
              disabled={!inputToken}
            >
              最大
            </Button>
          </div>

          <div className="flex space-x-2">
            <Input
              type="text"
              value={inputAmount}
              onChange={(e) => handleInputAmountChange(e.target.value)}
              placeholder="0.0"
              className="text-lg"
              disabled={tokensLoading || !inputToken}
            />

            <Select
              value={inputToken?.address}
              onValueChange={handleSelectInputToken}
              disabled={tokensLoading || inTokens.length === 0}
            >
              <SelectTrigger className="w-32">
                <SelectValue>
                  {inputToken ? inputToken.symbol : "选择代币"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {inTokens.map((token) => (
                  <SelectItem key={token.address} value={token.address}>
                    {token.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs text-muted-foreground">
            余额:{" "}
            {inputToken ? `${inputToken.balance} ${inputToken.symbol}` : "0"}
          </div>
        </div>

        {/* 交换按钮 */}
        <div className="flex justify-center -my-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-background shadow-md h-8 w-8"
            onClick={handleSwapTokens}
            disabled={!inputToken || !outputToken}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>

        {/* 输出部分 */}
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">到</span>
          </div>

          <div className="flex space-x-2">
            <Input
              type="text"
              value={outputAmount}
              onChange={(e) => handleOutputAmountChange(e.target.value)}
              placeholder="0.0"
              className="text-lg"
              disabled={tokensLoading || !outputToken}
            />

            <Select
              value={outputToken?.address}
              onValueChange={handleSelectOutputToken}
              disabled={tokensLoading || outTokens.length === 0}
            >
              <SelectTrigger className="w-32">
                <SelectValue>
                  {outputToken ? outputToken.symbol : "选择代币"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {outTokens
                  .filter(
                    (t) => !inputToken || t.address !== inputToken.address
                  )
                  .map((token) => (
                    <SelectItem key={token.address} value={token.address}>
                      {token.symbol}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs text-muted-foreground">
            余额:{" "}
            {outputToken ? `${outputToken.balance} ${outputToken.symbol}` : "0"}
          </div>
        </div>

        {/* 价格信息 */}
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>价格</span>
          <div className="flex items-center space-x-1">
            <span>{priceInfo}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              disabled={!inputToken || !outputToken || quoteLoading}
              onClick={handleRefreshPrice}
            >
              <RefreshCw
                className={`h-3 w-3 ${quoteLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        {/* 费率选择面板 */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">费率</span>
            <span className="text-xs text-muted-foreground">
              {selectedFee / 10000}%
            </span>
          </div>

          <Tabs
            value={selectedFee.toString()}
            onValueChange={(value) => handleFeeSelect(parseInt(value))}
            className="w-full"
          >
            <TabsList className="grid grid-cols-4 h-8">
              {FEE_TIERS.map((fee) => (
                <TabsTrigger
                  key={fee.value}
                  value={fee.value.toString()}
                  disabled={
                    availableFees.length > 0 &&
                    !availableFees.some((f) => f.value === fee.value)
                  }
                  className="text-xs px-1"
                >
                  {fee.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {FEE_TIERS.map((fee) => (
              <TabsContent
                key={fee.value}
                value={fee.value.toString()}
                className="pt-1"
              >
                <p className="text-xs text-muted-foreground">
                  {fee.description}
                </p>
              </TabsContent>
            ))}
          </Tabs>

          {selectedPool && (
            <div className="text-xs text-muted-foreground">
              使用池子: {selectedPool.pool.substring(0, 6)}...
              {selectedPool.pool.substring(38)}
              {selectedPool.liquidity > 0n && (
                <span> · 流动性: {formatUnits(selectedPool.liquidity, 0)}</span>
              )}
            </div>
          )}

          {availablePools.length === 0 && inputToken && outputToken && (
            <div className="text-xs text-amber-500">
              未找到 {inputToken.symbol}/{outputToken.symbol} 交易对的池子
            </div>
          )}
        </div>

        {/* 滑点设置 */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-sm">滑点容忍度</span>
            <span className="text-xs text-muted-foreground">{slippage}%</span>
          </div>
          <div className="flex space-x-2">
            {[0.1, 0.5, 1.0].map((value) => (
              <Button
                key={value}
                variant={slippage === value ? "secondary" : "outline"}
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={() => setSlippage(value)}
              >
                {value}%
              </Button>
            ))}
            <div className="flex-1 flex space-x-1">
              <Input
                type="number"
                value={slippage}
                onChange={(e) => setSlippage(parseFloat(e.target.value) || 0.5)}
                className="h-7 text-xs"
                min="0.1"
                max="50"
                step="0.1"
              />
              <span className="flex items-center text-xs">%</span>
            </div>
          </div>
        </div>

        {/* 交易哈希显示 */}
        {txHash && (
          <div className="p-2 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-xs">交易哈希:</span>
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline"
              >
                {txHash.substring(0, 6)}...{txHash.substring(62)}
              </a>
            </div>
          </div>
        )}

        {/* 交换按钮 */}
        <Button
          className="w-full"
          disabled={swapButtonState.disabled}
          onClick={handleSwap}
        >
          {(isLoading || isWritePending || quoteLoading) && (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          )}
          {swapButtonState.text}
        </Button>
      </CardContent>
    </Card>
  );
};
