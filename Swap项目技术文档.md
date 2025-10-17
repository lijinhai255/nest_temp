# Swap项目技术文档

## 项目概述

这是一个基于Next.js 15构建的现代化Web3去中心化交易所(DEX)项目，主要实现代币交换功能。该项目采用了前沿的技术栈和最佳实践，提供了完整的代币交换体验，包括价格计算、流动性管理、多链支持等功能。

## 项目架构

### 核心功能
- **代币交换**: 支持多种代币间的即时交换
- **价格计算**: 实时价格计算和滑点保护
- **流动性管理**: 集成Uniswap V3流动性池
- **多链支持**: 支持多个EVM兼容链
- **钱包集成**: 支持主流Web3钱包
- **高级功能**: 限价交易、批量交易、交易分析

### 技术栈
- **前端框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS + CSS Variables
- **UI组件**: shadcn/ui (New York style)
- **状态管理**: Zustand
- **Web3集成**: Wagmi v2 + Viem
- **数据获取**: TanStack Query + SWR
- **区块链**: 以太坊及EVM兼容链
- **数据库**: Supabase (SSR)

## 详细技术分析

### 1. 前端架构

#### 组件结构
```
components/
├── SwapCom.tsx              # 主要交换组件
├── swap/
│   ├── SwapCard.tsx         # 交换卡片容器
│   ├── SwapPanel.tsx        # 交换面板
│   ├── SwapButton.tsx       # 交换按钮
│   ├── SwapDetails.tsx      # 交易详情
│   ├── SwapControlPanel.tsx # 控制面板
│   └── SwapWarnings.tsx     # 警告提示
├── ui/                      # shadcn/ui组件
└── Navbar.tsx               # 导航栏
```

#### 核心组件分析

**SwapCom.tsx (主组件)**:
- 集成了所有交换相关功能
- 管理代币选择、金额输入、价格计算
- 处理交换流程和状态管理
- 提供高级交易分析功能

**SwapCard.tsx (交换容器)**:
- 提供完整的交易界面
- 集成多个子组件
- 处理费率选择和滑点设置
- 实现授权和交易流程

### 2. Web3集成架构

#### 钱包管理
```typescript
// provider/index.tsx - 钱包提供者
const WalletProvider: React.FC<WalletProviderProps> = ({
  children,
  chains,
  provider,
  autoConnect,
  wallets,
}) => {
  // EIP-6963标准支持
  // 多钱包检测和连接
  // 状态同步管理
}
```

#### 链配置
```typescript
// wagmi.ts - 链配置
export const chains = [sepolia, mainnet, polygon, optimism, arbitrum, base];
export const config = createConfig({
  chains,
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    // ... 其他链
  },
  ssr: true,
  storage: createStorage({
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    key: 'wagmi-store',
  }),
});
```

### 3. 智能合约交互

#### SwapRouter集成
```typescript
// store/useSwapRouterStore.ts
export const useSwapRouterStore = create<SwapRouterState>((set, get) => ({
  // 合约方法
  exactInput: async (publicClient, walletClient, chain, params, account) => {
    // 固定输入金额交易
  },
  exactOutput: async (publicClient, walletClient, chain, params, account) => {
    // 固定输出金额交易
  },
  quoteExactInput: async (publicClient, walletClient, chain, params, account) => {
    // 获取输入报价
  },
}));
```

#### 合约地址配置
```typescript
// SwapRouter合约地址
const SWAP_ROUTER = '0xD2c220143F5784b3bD84ae12747d97C8A36CeCB2';
// MTK代币合约地址
export const MTK_CONTRACT_ADDRESS = '0x29c3A0FD12E14E88B73d6ff796AFEd06BF5e5d13';
```

### 4. 价格计算引擎

#### 核心计算函数
```typescript
// utils/priceCalculations.ts
export const calculateSwapOutput = (
  amountIn: bigint,
  sqrtPriceX96: bigint,
  liquidity: bigint,
  fee: number,
  zeroForOne: boolean,
  token0Decimals: number,
  token1Decimals: number
): SwapResult => {
  // Uniswap V3价格计算公式
  // 考虑滑点和手续费
  // 返回精确的输出金额
}
```

#### 价格影响计算
```typescript
export const calculatePriceImpactFromLiquidity = (
  amountIn: bigint,
  liquidity: bigint,
  sqrtPriceX96: bigint,
  zeroForOne: boolean
): number => {
  // 基于流动性计算价格影响
  // 使用Uniswap V3数学公式
  // 返回百分比形式的价格影响
}
```

### 5. 流动性管理

#### PoolManager集成
```typescript
// hooks/usePoolManagerWithClients.ts
export const usePoolManagerWithClients = () => {
  const fetchAllPools = useCallback(async () => {
    // 获取所有流动性池信息
    return store.fetchAllPools(publicClient);
  }, [publicClient]);

  const createPool = async (params: CreatePoolParams) => {
    // 创建新的流动性池
    return store.createPool(publicClient, walletClient, chain, params, address);
  };
}
```

### 6. 报价系统

#### 实时报价Hook
```typescript
// hooks/useSwapQuote.ts
export const useSwapQuote = (options: UseSwapQuoteOptions = {}) => {
  const getQuote = useCallback(async (
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string,
    isRefresh: boolean = false
  ): Promise<SwapQuoteResult | null> => {
    // 获取实时交易报价
    // 支持多跳交易路径
    // 包含价格影响分析
  }, [isReady, calculateQuote]);
}
```

### 7. 状态管理

#### Zustand Store结构
```typescript
// Swap相关状态
interface SwapRouterState {
  contractAddress: Address | null;
  poolManagerAddress: Address | null;
  isLoading: boolean;
  error: string | null;
  lastSwapResult: SwapResult | null;
}

// Pool管理状态
interface PoolManagerState {
  poolsInfo: PoolInfo[];
  pairs: PairInfo[];
  isLoading: boolean;
  error: string | null;
}
```

## 核心知识点

### 1. Uniswap V3集成

#### 核心概念
- **流动性池**: 集中流动性池，支持自定义价格区间
- **价格计算**: 基于sqrtPriceX96的价格计算
- **滑点保护**: 自动计算和设置滑点容忍度
- **多跳交易**: 支持通过中间代币的交易路径

#### 数学公式
```typescript
// 价格转换
const price = (sqrtPriceX96 / 2^96)^2

// 流动性计算
const liquidity = amount0 * sqrtPriceX96 / (sqrtPriceUpper - sqrtPriceCurrent)

// 输出计算
const amountOut = liquidity * (sqrtPriceCurrent - sqrtPriceNext) / sqrtPriceCurrent
```

### 2. Web3钱包集成

#### EIP-6963标准
- 支持多钱包检测
- 统一的钱包连接接口
- 自动重连机制

#### 钱包支持
- MetaMask
- WalletConnect
- Coinbase Wallet
- Trust Wallet
- 其他EIP-6963兼容钱包

### 3. 智能合约交互

#### 合约方法
- `exactInput`: 固定输入金额交易
- `exactOutput`: 固定输出金额交易
- `quoteExactInput`: 获取输入报价
- `swapInPool`: 在指定池子中交易

#### 授权机制
```typescript
// 检查授权额度
const allowance = await checkAllowance(tokenAddress, ownerAddress, spenderAddress);

// 自动授权
if (allowance < requiredAmount) {
  await approveToken(tokenAddress, spenderAddress, amount);
}
```

### 4. 价格计算和滑点

#### 价格影响计算
- 基于流动性和交易量
- 实时计算价格影响百分比
- 提供交易建议和警告

#### 滑点保护
- 自动计算最小输出金额
- 支持自定义滑点容忍度
- 高滑点模式自动切换

### 5. 多链支持

#### 支持的链
- Ethereum (Mainnet & Sepolia)
- Polygon
- Optimism
- Arbitrum
- Base

#### 链切换机制
- 自动检测当前链
- 支持链切换
- 跨链数据同步

## 安全考虑

### 1. 智能合约安全
- 使用经过审计的合约接口
- 参数验证和边界检查
- 重入攻击防护

### 2. 前端安全
- 地址验证和格式化
- 交易参数验证
- 用户权限检查

### 3. 交易安全
- 滑点保护机制
- 最小输出金额验证
- 交易超时设置

## 性能优化

### 1. 计算优化
- 价格计算缓存
- 批量操作支持
- 防抖处理

### 2. 网络优化
- 数据缓存策略
- 并行请求处理
- 自动重试机制

### 3. UI优化
- 组件懒加载
- 状态更新优化
- 动画性能优化

## 开发指南

### 1. 环境配置
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

### 2. 配置文件
- `wagmi.ts`: Web3配置
- `components.json`: UI组件配置
- `tailwind.config.js`: 样式配置

### 3. 部署
- 支持Vercel一键部署
- 环境变量配置
- 构建优化设置

## 8. Pool和流动性管理系统

### Pool管理架构

#### PoolManager合约集成
```typescript
// store/usePoolManagerStore.ts - Pool管理状态
interface PoolManagerState {
  contractAddress: Address | null;
  poolsInfo: PoolInfo[];
  pairs: Pair[];
  isLoading: boolean;
  error: string | null;
}

// Pool信息结构
export interface PoolInfo {
  pool: Address;        // 池子合约地址
  token0: Address;      // 第一个代币地址
  token1: Address;      // 第二个代币地址
  index: number;        // 池子索引
  fee: number;          // 手续费率 (基点)
  feeProtocol: number;  // 协议费用
  tickLower: number;    // 价格区间下限
  tickUpper: number;    // 价格区间上限
  tick: number;         // 当前tick
  sqrtPriceX96: string | bigint; // 当前价格的平方根 * 2^96
  liquidity: string | bigint;    // 流动性数量
}
```

#### Pool创建功能
```typescript
// 创建新池子
const createPool = async (
  publicClient: PublicClient,
  walletClient: WalletClient,
  chain: Chain,
  params: CreatePoolParams,
  account: Address
): Promise<TransactionResult> => {
  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: typedPoolManagerABI,
    functionName: 'createPool',
    args: [
      params.tokenA,
      params.tokenB,
      params.tickLower,
      params.tickUpper,
      params.fee
    ],
    chain,
    account,
  });

  // 等待交易确认并解析事件
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  // 从PoolCreated事件中获取新池子地址
  const poolAddress = extractPoolAddressFromEvent(receipt);

  return { hash, receipt };
};
```

### 流动性计算引擎

#### Uniswap V3数学模型
```typescript
// utils/liquidityCalculations.ts - 流动性计算核心

// 从tick计算精确的sqrtPriceX96
export const getSqrtPriceX96FromTick = (tick: number): bigint => {
  const price = Math.pow(1.0001, tick);  // Uniswap V3价格公式
  const sqrtPrice = Math.sqrt(price);
  const Q96 = Math.pow(2, 96);
  return BigInt(Math.floor(sqrtPrice * Q96));
};

// 从sqrtPriceX96计算当前tick
export const getTickFromSqrtPriceX96 = (sqrtPriceX96: bigint): number => {
  const Q96 = BigInt(2) ** BigInt(96);
  const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
  const price = sqrtPrice * sqrtPrice;
  const tick = Math.floor(Math.log(price) / Math.log(1.0001));
  return tick;
};

// 根据手续费获取tick spacing
export const getTickSpacingFromFee = (fee: number): number => {
  switch (fee) {
    case 100: return 1;    // 0.01%
    case 500: return 10;   // 0.05%
    case 3000: return 60;  // 0.3%
    case 10000: return 200; // 1%
    default: return 60;
  }
};
```

#### 流动性范围验证
```typescript
// 检查流动性是否在有效范围内
export const checkLiquidityInRange = (
  poolInfo: PoolInfo,
  currentTick?: number
): {
  isInRange: boolean;
  activeLiquidity: bigint;
  tickSpacing: number;
  reason?: string;
} => {
  const tickSpacing = getTickSpacingFromFee(poolInfo.fee);
  const calculatedTick = currentTick || getTickFromSqrtPriceX96(poolInfo.sqrtPriceX96);

  // 检查当前价格是否在流动性范围内
  const isInRange = calculatedTick >= poolInfo.tickLower && calculatedTick <= poolInfo.tickUpper;

  // 如果在范围内，使用池子的流动性；否则为 0
  const activeLiquidity = isInRange ? poolInfo.liquidity : 0n;

  return {
    isInRange,
    activeLiquidity,
    tickSpacing,
    reason: isInRange ? undefined : `当前价格不在流动性范围内`
  };
};
```

#### 精确的价格影响计算
```typescript
// 基于Uniswap V3的价格影响计算
export const calculatePriceImpactV3 = (
  amountIn: bigint,
  liquidity: bigint,
  zeroForOne: boolean
): number => {
  if (liquidity === 0n) return 100;

  const amountInFloat = Number(amountIn);
  const liquidityFloat = Number(liquidity);

  // 基础价格影响公式
  const baseImpact = amountInFloat / (2 * liquidityFloat);
  const impactPercent = baseImpact * 100;

  // 对于大额交易，价格影响会非线性增长
  const nonLinearFactor = Math.pow(1 + baseImpact, 2);
  const adjustedImpact = impactPercent * nonLinearFactor;

  return Math.min(Math.max(adjustedImpact, 0), 100);
};
```

#### 流动性充足性验证
```typescript
// 验证流动性是否足够支持交易
export const validateLiquiditySufficiency = (
  poolInfo: PoolInfo,
  amountIn: bigint,
  zeroForOne: boolean,
  tokenInDecimals: number = 18,
  tokenOutDecimals: number = 18
): {
  isSufficient: boolean;
  maxTradeSize: bigint;
  availableLiquidity: bigint;
  priceImpact: number;
  reason?: string;
} => {
  // 1. 检查流动性是否在有效范围内
  const rangeCheck = checkLiquidityInRange(poolInfo);

  if (!rangeCheck.isInRange || rangeCheck.activeLiquidity === 0n) {
    return {
      isSufficient: false,
      maxTradeSize: 0n,
      availableLiquidity: 0n,
      priceImpact: 100,
      reason: '没有有效流动性'
    };
  }

  // 2. 计算最大交易量
  const { maxTradeSize, priceImpact } = calculateMaxTradeSize(
    poolInfo,
    rangeCheck.activeLiquidity,
    zeroForOne,
    tokenInDecimals,
    tokenOutDecimals
  );

  // 3. 应用安全边际（90%）
  const safeMaxTradeSize = (maxTradeSize * 90n) / 100n;
  const isSufficient = amountIn <= safeMaxTradeSize;

  return {
    isSufficient,
    maxTradeSize: safeMaxTradeSize,
    availableLiquidity: rangeCheck.activeLiquidity,
    priceImpact,
    reason: isSufficient ? undefined : `交易金额超过最大可交易量`
  };
};
```

### 流动性健康度评估

#### 健康度评分系统
```typescript
// 评估池子流动性健康状况
export const assessLiquidityHealth = (
  poolInfo: PoolInfo,
  token0Decimals: number = 18,
  token1Decimals: number = 18
): {
  healthScore: number;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  recommendations: string[];
  metrics: {
    liquidityAmount: string;
    priceRange: string;
    utilization: number;
    tickSpacing: number;
  };
} => {
  const rangeInfo = calculateLiquidityRange(poolInfo, token0Decimals, token1Decimals);
  let healthScore = 0;
  const recommendations: string[] = [];

  // 1. 流动性数量评分 (40分)
  const liquidityNum = Number(poolInfo.liquidity);
  if (liquidityNum > 1e18) {
    healthScore += 40;
  } else if (liquidityNum > 1e15) {
    healthScore += 30;
    recommendations.push('考虑增加流动性以提高交易深度');
  } else {
    healthScore += 10;
    recommendations.push('流动性严重不足，建议谨慎交易');
  }

  // 2. 价格范围评分 (30分)
  if (rangeInfo.isInRange) {
    healthScore += 30;
  } else {
    recommendations.push('当前价格不在流动性范围内，无法进行交易');
  }

  // 3. 利用率评分 (20分)
  if (rangeInfo.utilization >= 40 && rangeInfo.utilization <= 60) {
    healthScore += 20;
  } else {
    recommendations.push('流动性利用率不均衡，考虑调整价格范围');
  }

  // 确定健康状态
  let status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  if (healthScore >= 90) status = 'excellent';
  else if (healthScore >= 70) status = 'good';
  else if (healthScore >= 50) status = 'fair';
  else if (healthScore >= 30) status = 'poor';
  else status = 'critical';

  return {
    healthScore,
    status,
    recommendations,
    metrics: {
      liquidityAmount: formatUnits(poolInfo.liquidity, 18),
      priceRange: `${rangeInfo.lowerPrice.token0PerToken1.toFixed(6)} - ${rangeInfo.upperPrice.token0PerToken1.toFixed(6)}`,
      utilization: rangeInfo.utilization,
      tickSpacing: getTickSpacingFromFee(poolInfo.fee)
    }
  };
};
```

### Pool UI组件系统

#### Pool表格展示
```typescript
// components/PoolTable.tsx - Pool列表展示
const PoolTable: React.FC<PoolTableProps> = ({ itemsPerPage = 10 }) => {
  const { poolsInfo } = usePoolManagerWithClients();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Token</TableHead>
            <TableHead>Fee tier</TableHead>
            <TableHead>Set price range</TableHead>
            <TableHead>Current price</TableHead>
            <TableHead>Liquidity</TableHead>
            <TableHead>Price Chart</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentPools.map((pool, index) => (
            <TableRow key={`${pool.pool}-${index}`}>
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
              <TableCell>
                {formatLiquidity(pool.liquidity)}
              </TableCell>
              <TableCell>
                <SparklineChart data={sparklineData[index].data} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
```

#### Pool价格计算Hook
```typescript
// hooks/usePoolPrice.ts - Pool价格计算
export const usePoolPrice = (pool?: PoolInfo, token0Decimals = 18, token1Decimals = 18) => {
  const [price, setPrice] = useState<PoolPrice | null>(null);

  useEffect(() => {
    if (!pool) return;

    // 从 sqrtPriceX96 计算当前价格
    const currentPrice = calculatePriceFromSqrtPriceX96(
      typeof pool.sqrtPriceX96 === 'string' ? BigInt(pool.sqrtPriceX96) : pool.sqrtPriceX96,
      token0Decimals,
      token1Decimals
    );

    // 计算价格区间
    const lowerPrice = calculatePriceFromTick(pool.tickLower, token0Decimals, token1Decimals);
    const upperPrice = calculatePriceFromTick(pool.tickUpper, token0Decimals, token1Decimals);

    // 检查当前价格是否在范围内
    const isActive = pool.tick >= pool.tickLower && pool.tick <= pool.tickUpper;

    setPrice({
      currentPrice,
      priceRange: { lowerPrice: lowerPrice.token0PerToken1, upperPrice: upperPrice.token0PerToken1 },
      liquidity: formatLiquidity(pool.liquidity),
      isActive,
      utilizationRate: calculateUtilizationRate(pool)
    });
  }, [pool, token0Decimals, token1Decimals]);

  return { price, isLoading };
};
```

### 数据格式化工具

#### Pool数据格式化
```typescript
// utils/poolFormatters.ts - Pool数据格式化工具

// 格式化价格范围
export const formatPriceRange = (tickLower: number, tickUpper: number): string => {
  const lowerPrice = Math.pow(1.0001, tickLower);
  const upperPrice = Math.pow(1.0001, tickUpper);

  const formatPrice = (price: number): string => {
    if (price < 0.000001) return price.toExponential(2);
    if (price < 0.001) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    if (price < 10000) return price.toFixed(2);
    if (price < 1000000) return price.toLocaleString({ maximumFractionDigits: 0 });
    if (price < 1000000000) return `${(price / 1000000).toFixed(1)}M`;
    return `${(price / 1000000000).toFixed(1)}B`;
  };

  return `${formatPrice(lowerPrice)} – ${formatPrice(upperPrice)}`;
};

// 格式化手续费率
export const formatFee = (fee: number): string => {
  return `${(fee / 100).toFixed(2)}%`;
};

// 格式化流动性数值
export const formatLiquidity = (liquidity: bigint): string => {
  if (liquidity === 0n) return '0';
  const liquidityNum = Number(liquidity);

  if (liquidityNum >= 1e12) return `${(liquidityNum / 1e12).toFixed(2)}T`;
  if (liquidityNum >= 1e9) return `${(liquidityNum / 1e9).toFixed(2)}B`;
  if (liquidityNum >= 1e6) return `${(liquidityNum / 1e6).toFixed(2)}M`;
  if (liquidityNum >= 1e3) return `${(liquidityNum / 1e3).toFixed(2)}K`;

  return liquidityNum.toLocaleString();
};
```

### 核心技术知识点

#### 1. Uniswap V3核心概念
- **Tick模型**: 使用对数价格刻度，每个tick代表1.0001^tick的价格
- **集中流动性**: 流动性提供者可以选择价格区间提供流动性
- **sqrtPriceX96**: 价格的平方根乘以2^96，用于精确的价格计算
- **Liquidity**: 流动性数量，决定在特定价格区间内可以支持的交易量
- **Fee Tiers**: 不同的手续费层级(0.01%, 0.05%, 0.3%, 1%)

#### 2. 数学公式
```typescript
// 价格计算
price = 1.0001^tick
sqrtPriceX96 = sqrt(price) * 2^96

// 流动性计算
L = Δy / (1/√P_lower - 1/√P_current)  // 当价格在区间内
L = 0  // 当价格在区间外

// 输出计算
Δy = L * (√P_current - √P_next) / √P_current * √P_next
```

#### 3. 流动性管理策略
- **价格区间选择**: 根据市场波动性和预期选择合适的价格区间
- **手续费优化**: 根据交易频率和波动性选择合适的手续费层级
- **再平衡策略**: 当价格移出区间时的重新调整策略
- **多池策略**: 在多个价格区间分配流动性以降低风险

#### 4. 风险管理
- **无常损失**: 价格变化对流动性价值的影响
- **流动性利用率**: 当前价格在区间中的位置对收益的影响
- **滑点保护**: 大额交易时的价格影响保护机制
- **手续费收入**: 流动性提供者的收益来源

## 总结

这个Swap项目展示了现代Web3应用开发的最佳实践，包括：

1. **完整的技术栈**: Next.js 15 + TypeScript + Wagmi v2 + Viem
2. **先进的架构设计**: 模块化组件、状态管理、错误处理
3. **专业的DeFi集成**: Uniswap V3集成、价格计算、流动性管理
4. **优秀的用户体验**: 响应式设计、实时更新、多钱包支持
5. **企业级安全**: 智能合约安全、交易保护、参数验证
6. **完整的Pool系统**: 流动性管理、价格计算、健康度评估
7. **精确的数学模型**: Uniswap V3数学公式、价格影响计算
8. **专业的UI组件**: Pool表格、价格图表、数据格式化

该项目为学习现代Web3开发和DeFi应用构建提供了完整的参考案例，涵盖了从基础的钱包连接到复杂的金融计算和流动性管理的全栈开发知识。特别是在Pool和流动性管理方面，项目实现了完整的Uniswap V3功能，包括精确的价格计算、流动性范围验证、健康度评估等高级功能。