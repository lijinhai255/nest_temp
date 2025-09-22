// utils/mintParamsBuilder.ts
import { parseUnits, Address, Hex } from 'viem';
import { Token, Pool } from '@/types/addPosition';
import { PoolInfo } from "@/store/usePoolManagerStore";

// 匹配你的 Solidity 结构体
export interface MintParams {
  token0: Address;
  token1: Address;
  index: number; // uint32 在 TypeScript 中用 number
  amount0Desired: bigint; // uint256
  amount1Desired: bigint; // uint256
  recipient:[signature: Hex, ...args: Hex[]];
  deadline: bigint; // uint256
}

export interface MintParamsInput {
  token0: Token;
  token1: Token;
  selectedPool: PoolInfo;
  amount0: string;
  amount1: string;
  recipient: string;
  deadlineMinutes?: number;
}

export const buildMintParams = (input: MintParamsInput): MintParams => {
  const {
    token0,
    token1,
    selectedPool,
    amount0,
    amount1,
    recipient,
    deadlineMinutes = 20
  } = input;

  // 解析金额到最小单位
  const amount0Desired = parseUnits(amount0 || '0', token0.decimals);
  const amount1Desired = parseUnits(amount1 || '0', token1.decimals);

  // 计算截止时间 (当前时间 + 分钟数)
  const deadline = BigInt(Math.floor(Date.now() / 1000) + (deadlineMinutes * 60));

  return {
    token0: token0.address as Address,
    token1: token1.address as Address,
    index: selectedPool.index, // 确保这是 number 类型
    amount0Desired,
    amount1Desired,
    recipient: recipient as unknown as [signature: Hex, ...args: Hex[]],
    deadline,
  };
};

export const validateMintParams = (params: MintParams): string[] => {
  const errors: string[] = [];

  if (!params.token0 || params.token0 === '0x0') {
    errors.push('Token0 地址无效');
  }

  if (!params.token1 || params.token1 === '0x0') {
    errors.push('Token1 地址无效');
  }

  if (params.amount0Desired <= 0n) {
    errors.push('Token0 数量必须大于 0');
  }

  if (params.amount1Desired <= 0n) {
    errors.push('Token1 数量必须大于 0');
  }

  if (!params.recipient) {
    errors.push('接收地址无效');
  }

  if (params.deadline <= BigInt(Math.floor(Date.now() / 1000))) {
    errors.push('截止时间已过期');
  }

  if (typeof params.index !== 'number' || params.index < 0) {
    errors.push('池子索引无效');
  }

  return errors;
};

export const formatMintParams = (params: MintParams, token0Symbol: string, token1Symbol: string) => {
  return {
    token0: params.token0,
    token1: params.token1,
    index: params.index,
    amount0Desired: params.amount0Desired.toString(),
    amount1Desired: params.amount1Desired.toString(),
    amount0Display: `${params.amount0Desired.toString()} wei (${token0Symbol})`,
    amount1Display: `${params.amount1Desired.toString()} wei (${token1Symbol})`,
    recipient: params.recipient,
    deadline: new Date(Number(params.deadline) * 1000).toLocaleString(),
    deadlineTimestamp: params.deadline.toString(),
  };
};

// 🆕 添加格式化显示函数
export const formatAmountForDisplay = (amount: bigint, decimals: number, symbol: string): string => {
  const divisor = BigInt(10 ** decimals);
  const wholePart = amount / divisor;
  const fractionalPart = amount % divisor;
  
  if (fractionalPart === 0n) {
    return `${wholePart.toString()} ${symbol}`;
  }
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const trimmedFractional = fractionalStr.replace(/0+$/, '');
  
  return `${wholePart.toString()}.${trimmedFractional} ${symbol}`;
};
