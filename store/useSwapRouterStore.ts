import { create } from 'zustand';
import {
  Address,
  PublicClient,
  WalletClient,
  TransactionReceipt,
  Abi,
  Chain,
  Hex,
  decodeEventLog
} from 'viem';
import SwapRouterABI from '@/lib/abi/SwapRouter.json';
import { isValidAddress } from '@/utils'; // 导入地址验证函数
// 定义 ExactInputParams 类型
export interface ExactInputParams {
  tokenIn: Address;
  tokenOut: Address;
  indexPath: number[];
  recipient: Address;
  deadline: bigint;
  amountIn: bigint;
  amountOutMinimum: bigint;
  sqrtPriceLimitX96: bigint;
}

// 定义 ExactOutputParams 类型
export interface ExactOutputParams {
  tokenIn: Address;
  tokenOut: Address;
  indexPath: number[];
  recipient: Address;
  deadline: bigint;
  amountOut: bigint;
  amountInMaximum: bigint;
  sqrtPriceLimitX96: bigint;
}

// 定义 QuoteExactInputParams 类型
export interface QuoteExactInputParams {
  tokenIn: Address;
  tokenOut: Address;
  indexPath: number[];
  amountIn: bigint;
  sqrtPriceLimitX96: bigint;
  
}

// 定义 QuoteExactOutputParams 类型
export interface QuoteExactOutputParams {
  tokenIn: Address;
  tokenOut: Address;
  indexPath: number[];
  amountOut: bigint;
  sqrtPriceLimitX96: bigint;
}

// 定义 SwapInPoolParams 类型
export interface SwapInPoolParams {
  pool: Address;
  recipient: Address;
  zeroForOne: boolean;
  amountSpecified: bigint;
  sqrtPriceLimitX96: bigint;
  data: Hex;
}

// 定义交易结果类型
export interface TransactionResult {
  hash: `0x${string}`;
  receipt: TransactionReceipt;
}

// 定义 Swap 事件参数类型
export interface SwapEventArgs {
  sender: Address;
  zeroForOne: boolean;
  amountIn: bigint;
  amountInRemaining: bigint;
  amountOut: bigint;
}

// 定义 SwapRouter Store 的状态
interface SwapRouterState {
  // 状态
  contractAddress: Address | null;
  poolManagerAddress: Address | null;
  isLoading: boolean;
  error: string | null;
  lastSwapResult: {
    amountIn: bigint;
    amountOut: bigint;
    zeroForOne: boolean;
  } | null;
  
  // 初始化方法
  initContract: (address: Address) => void;
  
  // 读取方法
  getPoolManager: (publicClient: PublicClient) => Promise<Address>;
  
  // 写入方法
  exactInput: (
    publicClient: PublicClient,
    walletClient: WalletClient,
    chain: Chain,
    params: ExactInputParams,
    account: Address,
    value?: bigint
  ) => Promise<TransactionResult>;
  
  exactOutput: (
    publicClient: PublicClient,
    walletClient: WalletClient,
    chain: Chain,
    params: ExactOutputParams,
    account: Address,
    value?: bigint
  ) => Promise<TransactionResult>;
  
  quoteExactInput: (
    publicClient: PublicClient,
    walletClient: WalletClient,
    chain: Chain,
    params: QuoteExactInputParams,
    account: Address
  ) => Promise<bigint>;
  
  quoteExactOutput: (
    publicClient: PublicClient,
    walletClient: WalletClient,
    chain: Chain,
    params: QuoteExactOutputParams,
    account: Address
  ) => Promise<bigint>;
  
  swapInPool: (
    publicClient: PublicClient,
    walletClient: WalletClient,
    chain: Chain,
    params: SwapInPoolParams,
    account: Address
  ) => Promise<[bigint, bigint]>;
}

// 类型化的 ABI
const typedSwapRouterABI = SwapRouterABI as Abi;

// 创建 Zustand store
export const useSwapRouterStore = create<SwapRouterState>((set, get) => ({
  // 初始状态
  contractAddress: null,
  poolManagerAddress: null,
  isLoading: false,
  error: null,
  lastSwapResult: null,

  // 初始化合约地址
  initContract: (address: Address) => {
    try {
      set({ contractAddress: address, error: null });
      console.log('✅ SwapRouter 合约地址已初始化:', address);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '初始化合约失败';
      set({ error: errorMsg });
      console.error('❌ 初始化合约失败:', errorMsg);
    }
  },

  // 获取 PoolManager 地址
  getPoolManager: async (publicClient: PublicClient): Promise<Address> => {
    const { contractAddress } = get();
    const nullAddress = '0x0000000000000000000000000000000000000000' as Address;
    
    if (!contractAddress) {
      set({ error: '合约地址未初始化' });
      return nullAddress;
    }

    try {
      set({ isLoading: true, error: null });
      console.log('🔍 获取 PoolManager 地址...');
      
      const poolManagerAddress = await publicClient.readContract({
        address: contractAddress,
        abi: typedSwapRouterABI,
        functionName: 'poolManager',
      }) as Address;
      
      set({ poolManagerAddress, isLoading: false });
      console.log('✅ 获取到 PoolManager 地址:', poolManagerAddress);
      return poolManagerAddress;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '获取 PoolManager 地址失败';
      set({ error: errorMsg, isLoading: false });
      console.error('❌ 获取 PoolManager 地址失败:', errorMsg);
      return nullAddress;
    }
  },

 // 在 useSwapRouterStore.ts 中添加的辅助函数

// 修改后的 exactInput 函数
exactInput: async (
  publicClient: PublicClient,
  walletClient: WalletClient,
  chain: Chain,
  params: ExactInputParams,
  account: Address,
  value: bigint = 0n
): Promise<TransactionResult> => {
  const { contractAddress } = get();
  if (!contractAddress) {
    throw new Error('合约地址未初始化');
  }
  
  // 验证地址参数
  if (!isValidAddress(params.recipient)) {
    throw new Error(`接收地址无效: ${params.recipient}`);
  }
  
  if (!isValidAddress(params.tokenIn)) {
    throw new Error(`输入代币地址无效: ${params.tokenIn}`);
  }
  
  if (!isValidAddress(params.tokenOut)) {
    throw new Error(`输出代币地址无效: ${params.tokenOut}`);
  }
  
  if (!isValidAddress(account)) {
    throw new Error(`发送者地址无效: ${account}`);
  }
  
  try {
    set({ isLoading: true, error: null });
    console.log('🚀 开始执行 exactInput 交易...');
    console.log('参数:', params);
    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: typedSwapRouterABI,
      functionName: 'exactInput',
      args: [params],
      chain,
      account,
      value
    });
    console.log('📝 交易哈希:', hash);
    console.log('⏳ 等待交易确认...');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log('✅ 交易已确认');
    // 解析事件日志获取交易结果
    if (receipt.logs) {
      for (const log of receipt.logs) {
        try {
          if (log.address.toLowerCase() === contractAddress.toLowerCase()) {
            const event = decodeEventLog({
              abi: typedSwapRouterABI,
              data: log.data,
              topics: log.topics,
            });
            if (event.eventName === 'Swap') {
              const args = event.args as unknown as SwapEventArgs;
              set({
                lastSwapResult: {
                  amountIn: args.amountIn,
                  amountOut: args.amountOut,
                  zeroForOne: args.zeroForOne
                }
              });
              console.log('✅ 交换结果:', {
                amountIn: args.amountIn,
                amountOut: args.amountOut,
                zeroForOne: args.zeroForOne
              });
              break;
            }
          }
        } catch (e) {
          // 忽略解码错误
          console.warn('解码事件日志失败:', e);
        }
      }
    }
    set({ isLoading: false });
    return { hash, receipt };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'exactInput 交易失败';
    set({ error: errorMsg, isLoading: false });
    console.error('❌ exactInput 交易失败:', errorMsg);
    throw error;
  }
},

// 修改后的 exactOutput 函数
exactOutput: async (
  publicClient: PublicClient,
  walletClient: WalletClient,
  chain: Chain,
  params: ExactOutputParams,
  account: Address,
  value: bigint = 0n
): Promise<TransactionResult> => {
  const { contractAddress } = get();
  if (!contractAddress) {
    throw new Error('合约地址未初始化');
  }
  
  // 验证地址参数
  if (!isValidAddress(params.recipient)) {
    throw new Error(`接收地址无效: ${params.recipient}`);
  }
  
  if (!isValidAddress(params.tokenIn)) {
    throw new Error(`输入代币地址无效: ${params.tokenIn}`);
  }
  
  if (!isValidAddress(params.tokenOut)) {
    throw new Error(`输出代币地址无效: ${params.tokenOut}`);
  }
  
  if (!isValidAddress(account)) {
    throw new Error(`发送者地址无效: ${account}`);
  }
  
  try {
    set({ isLoading: true, error: null });
    console.log('🚀 开始执行 exactOutput 交易...');
    console.log('参数:', params);
    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: typedSwapRouterABI,
      functionName: 'exactOutput',
      args: [params],
      chain,
      account,
      value
    });
    console.log('📝 交易哈希:', hash);
    console.log('⏳ 等待交易确认...');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log('✅ 交易已确认');
    // 解析事件日志获取交易结果
    if (receipt.logs) {
      for (const log of receipt.logs) {
        try {
          if (log.address.toLowerCase() === contractAddress.toLowerCase()) {
            const event = decodeEventLog({
              abi: typedSwapRouterABI,
              data: log.data,
              topics: log.topics,
            });
            if (event.eventName === 'Swap') {
              const args = event.args as unknown as SwapEventArgs;
              set({
                lastSwapResult: {
                  amountIn: args.amountIn,
                  amountOut: args.amountOut,
                  zeroForOne: args.zeroForOne
                }
              });
              console.log('✅ 交换结果:', {
                amountIn: args.amountIn,
                amountOut: args.amountOut,
                zeroForOne: args.zeroForOne
              });
              break;
            }
          }
        } catch (e) {
          // 忽略解码错误
          console.warn('解码事件日志失败:', e);
        }
      }
    }
    set({ isLoading: false });
    return { hash, receipt };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'exactOutput 交易失败';
    set({ error: errorMsg, isLoading: false });
    console.error('❌ exactOutput 交易失败:', errorMsg);
    throw error;
  }
},

  // quoteExactInput 方法
  quoteExactInput: async (
    publicClient: PublicClient,
    walletClient: WalletClient,
    chain: Chain,
    params: QuoteExactInputParams,
    account: Address
  ): Promise<bigint> => {
    const { contractAddress } = get();
    if (!contractAddress) {
      throw new Error('合约地址未初始化');
    }

    try {
      set({ isLoading: true, error: null });
      console.log('🔍 获取 exactInput 报价...');
      console.log('参数:', params);
      
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: typedSwapRouterABI,
        functionName: 'quoteExactInput',
        args: [params],
        chain,
        account
      });
      
      console.log('📝 交易哈希:', hash);
      
      console.log('⏳ 等待交易确认...');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('✅ 交易已确认');
      
      // 解析返回值
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: typedSwapRouterABI,
        functionName: 'quoteExactInput',
        args: [params]
      }) as bigint;
      
      set({ isLoading: false });
      console.log('✅ 获取到报价:', result);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '获取 exactInput 报价失败';
      set({ error: errorMsg, isLoading: false });
      console.error('❌ 获取 exactInput 报价失败:', errorMsg);
      throw error;
    }
  },

  // quoteExactOutput 方法
  quoteExactOutput: async (
    publicClient: PublicClient,
    walletClient: WalletClient,
    chain: Chain,
    params: QuoteExactOutputParams,
    account: Address
  ): Promise<bigint> => {
    const { contractAddress } = get();
    if (!contractAddress) {
      throw new Error('合约地址未初始化');
    }

    try {
      set({ isLoading: true, error: null });
      console.log('🔍 获取 exactOutput 报价...');
      console.log('参数:', params);
      
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: typedSwapRouterABI,
        functionName: 'quoteExactOutput',
        args: [params],
        chain,
        account
      });
      
      console.log('📝 交易哈希:', hash);
      
      console.log('⏳ 等待交易确认...');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('✅ 交易已确认');
      
      // 解析返回值
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: typedSwapRouterABI,
        functionName: 'quoteExactOutput',
        args: [params]
      }) as bigint;
      
      set({ isLoading: false });
      console.log('✅ 获取到报价:', result);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '获取 exactOutput 报价失败';
      set({ error: errorMsg, isLoading: false });
      console.error('❌ 获取 exactOutput 报价失败:', errorMsg);
      throw error;
    }
  },

  // swapInPool 方法
  swapInPool: async (
    publicClient: PublicClient,
    walletClient: WalletClient,
    chain: Chain,
    params: SwapInPoolParams,
    account: Address
  ): Promise<[bigint, bigint]> => {
    const { contractAddress } = get();
    if (!contractAddress) {
      throw new Error('合约地址未初始化');
    }

    try {
      set({ isLoading: true, error: null });
      console.log('🚀 开始执行 swapInPool 交易...');
      console.log('参数:', params);
      
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: typedSwapRouterABI,
        functionName: 'swapInPool',
        args: [
          params.pool,
          params.recipient,
          params.zeroForOne,
          params.amountSpecified,
          params.sqrtPriceLimitX96,
          params.data
        ],
        chain,
        account
      });
      
      console.log('📝 交易哈希:', hash);
      
      console.log('⏳ 等待交易确认...');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('✅ 交易已确认');
      
      // 解析事件日志获取交易结果
      if (receipt.logs) {
        for (const log of receipt.logs) {
          try {
            if (log.address.toLowerCase() === contractAddress.toLowerCase()) {
              const event = decodeEventLog({
                abi: typedSwapRouterABI,
                data: log.data,
                topics: log.topics,
              });
              
              if (event.eventName === 'Swap') {
                const args = event.args as unknown as SwapEventArgs;
                set({ 
                  lastSwapResult: {
                    amountIn: args.amountIn,
                    amountOut: args.amountOut,
                    zeroForOne: args.zeroForOne
                  }
                });
                console.log('✅ 交换结果:', {
                  amountIn: args.amountIn,
                  amountOut: args.amountOut,
                  zeroForOne: args.zeroForOne
                });
                break;
              }
            }
          } catch (e) {
            // 忽略解码错误
            console.warn('解码事件日志失败:', e);
          }
        }
      }
      
      // 从交易返回值中获取 amount0 和 amount1
      // 注意：这里假设合约返回值可以通过读取状态获取，实际上可能需要从事件中解析
      const result = await publicClient.readContract({
        address: contractAddress,
        abi: typedSwapRouterABI,
        functionName: 'swapInPool',
        args: [
          params.pool,
          params.recipient,
          params.zeroForOne,
          params.amountSpecified,
          params.sqrtPriceLimitX96,
          params.data
        ]
      }) as [bigint, bigint];
      
      set({ isLoading: false });
      console.log('✅ 交换结果:', result);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'swapInPool 交易失败';
      set({ error: errorMsg, isLoading: false });
      console.error('❌ swapInPool 交易失败:', errorMsg);
      throw error;
    }
  },
}));

export default useSwapRouterStore;