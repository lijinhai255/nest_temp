import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, PublicClient } from 'viem';
import { mainnet, polygon, optimism, arbitrum, base, sepolia } from 'viem/chains';

// 获取实际的链ID值
const CHAIN_IDS = {
  MAINNET: mainnet.id,
  POLYGON: polygon.id,
  OPTIMISM: optimism.id,
  ARBITRUM: arbitrum.id,
  BASE: base.id,
  SEPOLIA: sepolia.id,
} as const;

// 定义支持的链ID类型 - 使用实际的链ID值
type SupportedChainId = typeof CHAIN_IDS[keyof typeof CHAIN_IDS];

// 为每个链创建公共客户端 - 修复类型问题
const clients = {
  [CHAIN_IDS.MAINNET]: createPublicClient({
    chain: mainnet,
    transport: http()
  }),
  [CHAIN_IDS.POLYGON]: createPublicClient({
    chain: polygon,
    transport: http()
  }),
  [CHAIN_IDS.OPTIMISM]: createPublicClient({
    chain: optimism,
    transport: http()
  }),
  [CHAIN_IDS.ARBITRUM]: createPublicClient({
    chain: arbitrum,
    transport: http()
  }),
  [CHAIN_IDS.BASE]: createPublicClient({
    chain: base,
    transport: http()
  }),
  [CHAIN_IDS.SEPOLIA]: createPublicClient({
    chain: sepolia,
    transport: http()
  }),
} as Record<SupportedChainId, PublicClient>;

// Gas价格历史记录结构
interface GasHistoryEntry {
  timestamp: number;
  baseFee: bigint;
  priorityFee: bigint;
  totalGasUsed: bigint;
  blockNumber: bigint;
}

// Gas费用推荐结构
interface GasFeeRecommendation {
  maxFeePerGas: string;      // 最大总Gas费用 (Wei)
  maxPriorityFeePerGas: string;  // 最大优先费用 (Wei)
  maxFeePerGasGwei: string;  // 最大总Gas费用 (Gwei)
  maxPriorityFeePerGasGwei: string; // 最大优先费用 (Gwei)
  estimatedSeconds: number;  // 预计确认时间(秒)
}

// Gas费用推荐等级
interface GasFeeRecommendations {
  low: GasFeeRecommendation;
  medium: GasFeeRecommendation;
  high: GasFeeRecommendation;
  baseFeePerGas: string;     // 当前基础费用 (Wei)
  baseFeePerGasGwei: string; // 当前基础费用 (Gwei)
  timestamp: number;         // 推荐生成的时间戳
  chainId: number;           // 链ID
}

// 定义缓存项接口
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// 定义缓存统计接口
interface CacheStats {
  size: number;
  keys: string[];
}

// 简单的内存缓存实现
class SimpleCache<T> {
  private cache = new Map<string, CacheItem<T>>();

  set(key: string, value: T, ttl: number = 30000): void {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  // 获取缓存统计信息
  getStats(): CacheStats {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// 定义错误类型
class GasPriceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly chainId?: number
  ) {
    super(message);
    this.name = 'GasPriceError';
  }
}

// 创建缓存实例
const gasPriceCache = new SimpleCache<GasFeeRecommendations>();

// 使用自定义缓存的函数
async function getGasPricesWithCache(chainId: number): Promise<GasFeeRecommendations> {
  const cacheKey = `gas-prices-${chainId}`;
  
  // 尝试从缓存获取
  const cached = gasPriceCache.get(cacheKey);
  if (cached) {
    console.log(`从缓存获取链 ${chainId} 的数据`);
    return cached;
  }

  // 缓存未命中，重新计算
  console.log(`计算链 ${chainId} 的Gas价格`);
  const gasHistory = await monitorGasPrices(chainId);
  
  if (gasHistory.length === 0) {
    throw new GasPriceError('无法获取Gas价格数据', 'NO_DATA', chainId);
  }
  
  const recommendations = calculateGasFeeRecommendations(gasHistory, chainId);
  
  // 存入缓存，TTL为30秒
  gasPriceCache.set(cacheKey, recommendations, 30000);
  
  return recommendations;
}

// 检查是否为支持的链ID
function isSupportedChainId(chainId: number): chainId is SupportedChainId {
  return Object.values(CHAIN_IDS).includes(chainId as SupportedChainId);
}

// 获取支持的链ID列表
function getSupportedChainIds(): number[] {
  return Object.values(CHAIN_IDS);
}

// 定义链信息接口
interface ChainInfo {
  id: number;
  name: string;
  blockTime?: number;
}

// 监控指定链的Gas价格
async function monitorGasPrices(chainId: number): Promise<GasHistoryEntry[]> {
  if (!isSupportedChainId(chainId)) {
    throw new GasPriceError(`不支持的链ID: ${chainId}`, 'UNSUPPORTED_CHAIN', chainId);
  }

  const client = clients[chainId];
  
  try {
    // 获取最新区块
    const blockNumber = await client.getBlockNumber();
    console.log(`链 ${chainId} 当前区块: ${blockNumber}`);
    
    // 获取最近的几个区块
    const gasHistory: GasHistoryEntry[] = [];
    
    // 获取最近20个区块的数据
    const blocksToFetch = 20;
    const startBlock = blockNumber - BigInt(blocksToFetch - 1);
    
    // 使用 Promise.allSettled 并行获取区块数据以提高性能
    const blockPromises: Promise<GasHistoryEntry | null>[] = [];
    for (let i = 0; i < blocksToFetch; i++) {
      const currentBlockNumber = startBlock + BigInt(i);
      blockPromises.push(fetchBlockData(client, currentBlockNumber));
    }

    const blockResults = await Promise.allSettled(blockPromises);
    
    for (const result of blockResults) {
      if (result.status === 'fulfilled' && result.value) {
        gasHistory.push(result.value);
      }
    }
    
    console.log(`链 ${chainId} 成功获取 ${gasHistory.length} 个区块的数据`);
    
    // 按区块号降序排序（最新的在前面）
    return gasHistory.sort((a, b) => Number(b.blockNumber - a.blockNumber));
    
  } catch (error) {
    console.error(`监控链 ${chainId} Gas价格失败:`, error);
    if (error instanceof GasPriceError) {
      throw error;
    }
    throw new GasPriceError(
      `获取链 ${chainId} 数据失败: ${error instanceof Error ? error.message : String(error)}`,
      'FETCH_ERROR',
      chainId
    );
  }
}

// 获取单个区块数据
async function fetchBlockData(
  client: PublicClient,
  blockNumber: bigint
): Promise<GasHistoryEntry | null> {
  try {
    const block = await client.getBlock({
      blockNumber,
      includeTransactions: true,
    });
    
    if (!block.baseFeePerGas) {
      return null;
    }
    
    // 计算区块中的平均优先费用
    let totalPriorityFee = BigInt(0);
    let txCount = 0;
    
    if (block.transactions && block.transactions.length > 0) {
      for (const tx of block.transactions) {
        if (typeof tx !== 'string' && tx.maxPriorityFeePerGas) {
          totalPriorityFee += tx.maxPriorityFeePerGas;
          txCount++;
        }
      }
    }
    
    const avgPriorityFee = txCount > 0 
      ? totalPriorityFee / BigInt(txCount) 
      : BigInt(1000000000); // 默认1 Gwei
    
    return {
      timestamp: Number(block.timestamp),
      baseFee: block.baseFeePerGas,
      priorityFee: avgPriorityFee,
      totalGasUsed: block.gasUsed,
      blockNumber: block.number
    };
  } catch (error) {
    console.warn(`获取区块 ${blockNumber} 数据失败:`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

// 计算数组的百分位数
function getPercentile(array: number[], percentile: number): number {
  if (array.length === 0) return 0;
  if (array.length === 1) return array[0];
  
  const sortedArray = [...array].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
}

// 将Wei转换为Gwei的字符串表示
function weiToGwei(wei: bigint): string {
  return (Number(wei) / 1e9).toFixed(2);
}

// 获取链的默认区块时间
function getDefaultBlockTime(chainId: number): number {
  switch (chainId) {
    case CHAIN_IDS.POLYGON:
      return 2;
    case CHAIN_IDS.OPTIMISM:
      return 2;
    case CHAIN_IDS.ARBITRUM:
      return 0.25;
    case CHAIN_IDS.BASE:
      return 2;
    case CHAIN_IDS.SEPOLIA:
      return 12;
    case CHAIN_IDS.MAINNET:
    default:
      return 12;
  }
}

// 获取链的名称
function getChainName(chainId: number): string {
  switch (chainId) {
    case CHAIN_IDS.MAINNET:
      return 'Ethereum Mainnet';
    case CHAIN_IDS.POLYGON:
      return 'Polygon';
    case CHAIN_IDS.OPTIMISM:
      return 'Optimism';
    case CHAIN_IDS.ARBITRUM:
      return 'Arbitrum One';
    case CHAIN_IDS.BASE:
      return 'Base';
    case CHAIN_IDS.SEPOLIA:
      return 'Sepolia Testnet';
    default:
      return `Chain ${chainId}`;
  }
}

// 计算网络拥堵程度
function calculateNetworkUtilization(gasHistory: GasHistoryEntry[], chainId: number): number {
  if (gasHistory.length === 0) return 0.5;

  const utilizations = gasHistory.map(entry => {
    // 根据不同链设置不同的gas limit
    let gasLimit = BigInt(30000000); // 以太坊默认值
    
    switch (chainId) {
      case CHAIN_IDS.POLYGON:
        gasLimit = BigInt(30000000);
        break;
      case CHAIN_IDS.ARBITRUM:
        gasLimit = BigInt(1125899906842624); // Arbitrum有更高的gas limit
        break;
      case CHAIN_IDS.OPTIMISM:
      case CHAIN_IDS.BASE:
        gasLimit = BigInt(30000000);
        break;
      default:
        gasLimit = BigInt(30000000);
    }
    
    return Number(entry.totalGasUsed) / Number(gasLimit);
  });

  return utilizations.reduce((sum, util) => sum + util, 0) / utilizations.length;
}

// 定义网络拥堵级别
interface NetworkCongestion {
  utilization: number;
  lowMultiplier: number;
  mediumMultiplier: number;
  highMultiplier: number;
  blockTimeMultiplier: number;
}

// 计算网络拥堵参数
function calculateCongestionParams(utilization: number): NetworkCongestion {
  let lowMultiplier = 110;
  let mediumMultiplier = 120;
  let highMultiplier = 150;
  let blockTimeMultiplier = 1;

  if (utilization > 0.9) {
    // 高拥堵时增加倍数
    lowMultiplier = 125;
    mediumMultiplier = 140;
    highMultiplier = 180;
    blockTimeMultiplier = 1.5;
  } else if (utilization < 0.5) {
    // 低拥堵时减少倍数
    lowMultiplier = 105;
    mediumMultiplier = 110;
    highMultiplier = 130;
    blockTimeMultiplier = 0.8;
  }

  return {
    utilization,
    lowMultiplier,
    mediumMultiplier,
    highMultiplier,
    blockTimeMultiplier
  };
}

/**
 * 根据历史Gas数据计算推荐的Gas费用
 */
function calculateGasFeeRecommendations(
  gasHistory: GasHistoryEntry[],
  chainId: number
): GasFeeRecommendations {
  if (!gasHistory.length) {
    throw new GasPriceError('没有足够的Gas历史数据', 'INSUFFICIENT_DATA', chainId);
  }

  // 获取最新的baseFee
  const latestBaseFee = gasHistory[0].baseFee;
  
  // 计算平均区块时间(秒)
  let avgBlockTime = getDefaultBlockTime(chainId);
  
  if (gasHistory.length >= 2) {
    let totalTime = 0;
    let count = 0;
    
    for (let i = 1; i < gasHistory.length; i++) {
      const timeDiff = gasHistory[i-1].timestamp - gasHistory[i].timestamp;
      if (timeDiff > 0 && timeDiff < 60) { // 过滤异常值
        totalTime += timeDiff;
        count++;
      }
    }
    
    if (count > 0) {
      avgBlockTime = totalTime / count;
    }
  }
  
  // 计算不同百分位的优先费用
  const priorityFees = gasHistory
    .map(entry => Number(entry.priorityFee))
    .filter(fee => fee > 0) // 过滤掉0值
    .sort((a, b) => a - b);
  
  if (priorityFees.length === 0) {
    // 如果没有有效的优先费用数据，使用默认值
    priorityFees.push(1000000000); // 1 Gwei
  }
  
  const lowPriorityFee = BigInt(getPercentile(priorityFees, 10));  // 10%分位数
  const mediumPriorityFee = BigInt(getPercentile(priorityFees, 50)); // 50%分位数
  const highPriorityFee = BigInt(getPercentile(priorityFees, 80));  // 80%分位数
  
  // 计算网络拥堵程度
  const networkUtilization = calculateNetworkUtilization(gasHistory, chainId);
  const congestionParams = calculateCongestionParams(networkUtilization);
  
  // 计算最大Gas费用 (baseFee的倍数 + 优先费用)
  const lowMaxFee = latestBaseFee * BigInt(congestionParams.lowMultiplier) / BigInt(100) + lowPriorityFee;
  const mediumMaxFee = latestBaseFee * BigInt(congestionParams.mediumMultiplier) / BigInt(100) + mediumPriorityFee;
  const highMaxFee = latestBaseFee * BigInt(congestionParams.highMultiplier) / BigInt(100) + highPriorityFee;
  
  // 根据网络拥堵情况预估确认时间
  let lowEstimatedBlocks = 5;
  let mediumEstimatedBlocks = 2;
  let highEstimatedBlocks = 1;
  
  const blockTimeMultiplier = congestionParams.blockTimeMultiplier;
  lowEstimatedBlocks = Math.round(lowEstimatedBlocks * blockTimeMultiplier);
  mediumEstimatedBlocks = Math.round(mediumEstimatedBlocks * blockTimeMultiplier);
  highEstimatedBlocks = Math.max(1, Math.round(highEstimatedBlocks * blockTimeMultiplier));
  
  return {
    low: {
      maxFeePerGas: lowMaxFee.toString(),
      maxPriorityFeePerGas: lowPriorityFee.toString(),
      maxFeePerGasGwei: weiToGwei(lowMaxFee),
      maxPriorityFeePerGasGwei: weiToGwei(lowPriorityFee),
      estimatedSeconds: Math.round(lowEstimatedBlocks * avgBlockTime)
    },
    medium: {
      maxFeePerGas: mediumMaxFee.toString(),
      maxPriorityFeePerGas: mediumPriorityFee.toString(),
      maxFeePerGasGwei: weiToGwei(mediumMaxFee),
      maxPriorityFeePerGasGwei: weiToGwei(mediumPriorityFee),
      estimatedSeconds: Math.round(mediumEstimatedBlocks * avgBlockTime)
    },
    high: {
      maxFeePerGas: highMaxFee.toString(),
      maxPriorityFeePerGas: highPriorityFee.toString(),
      maxFeePerGasGwei: weiToGwei(highMaxFee),
      maxPriorityFeePerGasGwei: weiToGwei(highPriorityFee),
      estimatedSeconds: Math.round(highEstimatedBlocks * avgBlockTime)
    },
    baseFeePerGas: latestBaseFee.toString(),
    baseFeePerGasGwei: weiToGwei(latestBaseFee),
    timestamp: Date.now(),
    chainId
  };
}

// 定义API错误响应接口
interface ApiErrorResponse {
  error: string;
  code?: string;
  chainId?: number;
  timestamp: number;
  supportedChains?: ChainInfo[];
}

// 定义API成功响应接口
interface ApiSuccessResponse extends GasFeeRecommendations {}

// Next.js API Route处理函数
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chainId: string }> }
): Promise<NextResponse<ApiSuccessResponse | ApiErrorResponse>> {
  try {
    // 等待 params Promise 解析
    const resolvedParams = await params;
    const chainId = parseInt(resolvedParams.chainId);
    
    if (isNaN(chainId)) {
      const errorResponse: ApiErrorResponse = {
        error: '无效的链ID',
        code: 'INVALID_CHAIN_ID',
        timestamp: Date.now()
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }
    
    // 检查是否为支持的链ID
    if (!isSupportedChainId(chainId)) {
      const errorResponse: ApiErrorResponse = {
        error: `不支持的链ID: ${chainId}`,
        code: 'UNSUPPORTED_CHAIN',
        chainId,
        timestamp: Date.now(),
        supportedChains: getSupportedChainIds().map(id => ({
          id,
          name: getChainName(id),
          blockTime: getDefaultBlockTime(id)
        }))
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }
    
    console.log(`开始获取链 ${chainId} (${getChainName(chainId)}) 的Gas费用推荐`);
    
    // 使用缓存函数获取Gas费用推荐
    const recommendations = await getGasPricesWithCache(chainId);
    
    console.log(`成功获取链 ${chainId} 的Gas费用推荐`);
    
    // 设置缓存控制头
    return NextResponse.json(recommendations, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    console.error('获取Gas费用失败:', error);
    
    let errorResponse: ApiErrorResponse;
    
    if (error instanceof GasPriceError) {
      // 处理自定义错误
      switch (error.code) {
        case 'UNSUPPORTED_CHAIN':
          errorResponse = {
            error: error.message,
            code: error.code,
            chainId: error.chainId,
            timestamp: Date.now()
          };
          return NextResponse.json(errorResponse, { status: 400 });
          
        case 'NO_DATA':
        case 'INSUFFICIENT_DATA':
          errorResponse = {
            error: '区块链网络暂时不可用，请稍后重试',
            code: error.code,
            chainId: error.chainId,
            timestamp: Date.now()
          };
          return NextResponse.json(errorResponse, { status: 503 });
          
        default:
          errorResponse = {
            error: error.message,
            code: error.code,
            chainId: error.chainId,
            timestamp: Date.now()
          };
          return NextResponse.json(errorResponse, { status: 500 });
      }
    }
    
    // 处理未知错误
    const chainIdFromUrl = parseInt(new URL(request.url).pathname.split('/').pop() || '0');
    errorResponse = {
      error: `获取Gas费用失败: ${error instanceof Error ? error.message : String(error)}`,
      code: 'UNKNOWN_ERROR',
      chainId: isNaN(chainIdFromUrl) ? undefined : chainIdFromUrl,
      timestamp: Date.now()
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// 健康检查端点
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-cache',
    }
  });
}

// 定义选项响应接口
interface OptionsResponse {
  supportedChains: ChainInfo[];
  cacheStats: CacheStats;
}

// 获取支持的链列表的端点（可选）
export async function OPTIONS(): Promise<NextResponse<OptionsResponse>> {
  const response: OptionsResponse = {
    supportedChains: getSupportedChainIds().map(id => ({
      id,
      name: getChainName(id),
      blockTime: getDefaultBlockTime(id)
    })),
    cacheStats: gasPriceCache.getStats()
  };

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'public, max-age=300', // 5分钟缓存
    }
  });
}
