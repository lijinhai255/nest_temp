import { create } from 'zustand';
import { 
  Address, 
  PublicClient, 
  WalletClient,
  TransactionReceipt,
  Abi,
  decodeEventLog as viemDecodeEventLog,
  Chain,
  Hex
} from 'viem';
import PoolManagerABI from '@/lib/abi/PoolManager.json';
import { Pool } from '@/types/addPosition';
import { unknown } from 'zod';

// 定义 PoolInfo 类型
export interface PoolInfo {
  pool: Address;
  token0: Address;
  token1: Address;
  index: number;
  fee: number;
  feeProtocol: number;
  tickLower: number;
  tickUpper: number;
  tick: number;
  sqrtPriceX96: string | bigint;
  liquidity: string | bigint;
}

// 定义 Pair 类型
export interface Pair {
  token0: Address;
  token1: Address;
}

// 定义创建池子的参数类型
export interface CreateAndInitializeParams {
  token0: Address;
  token1: Address;
  fee: number;
  tickLower: number;
  tickUpper: number;
  sqrtPriceX96: bigint;
}

// 定义交易结果类型
export interface TransactionResult {
  hash: `0x${string}`;
  receipt: TransactionReceipt;
}

// 定义合约参数类型
export interface ContractParameters {
  factory: Address;
  tokenA: Address;
  tokenB: Address;
  tickLower: number;
  tickUpper: number;
  fee: number;
}

// 定义创建池子参数类型
export interface CreatePoolParams {
  tokenA: Address;
  tokenB: Address;
  tickLower: number;
  tickUpper: number;
  fee: number;
}

// 定义 PoolCreated 事件参数类型
export interface PoolCreatedEventArgs {
  pool: Address;
  token0: Address;
  token1: Address;
  fee: number;
  tickLower: number;
  tickUpper: number;
}

// 定义解码事件日志的返回类型
export interface DecodedPoolCreatedEvent {
  eventName: 'PoolCreated';
  args: PoolCreatedEventArgs;
}

// 定义 PoolManager Store 的状态
interface PoolManagerState {
  // 状态
  contractAddress: Address | null;
  poolsInfo: PoolInfo[];
  pairs: Pair[];
  isLoading: boolean;
  error: string | null;
  
  // 初始化方法
  initContract: (address: Address) => void;
  
  // 读取方法 - 现在需要传入 publicClient
  fetchAllPools: (publicClient: PublicClient) => Promise<void>;
  fetchPairs: (publicClient: PublicClient) => Promise<void>;
  getPool: (publicClient: PublicClient, tokenA: Address, tokenB: Address, index: number) => Promise<Address>;
  getParameters: (publicClient: PublicClient) => Promise<ContractParameters>;
  
  // 写入方法 - 现在需要传入 clients 和 chain
  createPool: (
    publicClient: PublicClient,
    walletClient: WalletClient,
    chain: Chain,
    params: CreatePoolParams,
    account: Address // 添加 account 参数
  ) => Promise<TransactionResult>;
  
  createAndInitializePoolIfNecessary: (
    publicClient: PublicClient,
    walletClient: WalletClient,
    chain: Chain,
    params: CreateAndInitializeParams,
    account: Address // 添加 account 参数
  ) => Promise<TransactionResult>;
}

// 类型化的 ABI
const typedPoolManagerABI = PoolManagerABI as Abi;

// 创建 Zustand store
export const usePoolManagerStore = create<PoolManagerState>((set, get) => ({
  // 初始状态
  contractAddress: null,
  poolsInfo: [],
  pairs: [],
  isLoading: false,
  error: null,

  // 初始化合约地址
  initContract: (address: Address) => {
    try {
      set({ contractAddress: address, error: null });
      console.log('✅ PoolManager 合约地址已初始化:', address);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '初始化合约失败';
      set({ error: errorMsg });
      console.error('❌ 初始化合约失败:', errorMsg);
    }
  },

  // 获取所有池子信息
  fetchAllPools: async (publicClient: PublicClient) => {
    const { contractAddress } = get();
    if (!contractAddress) {
      set({ error: '合约地址未初始化' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      console.log('🔍 获取所有池子信息...');
      
      const poolsInfo = await publicClient.readContract({
        address: contractAddress,
        abi: typedPoolManagerABI,
        functionName: 'getAllPools',
      }) as PoolInfo[];
      
      set({ poolsInfo, isLoading: false });
      console.log('✅ 获取到', poolsInfo.length, '个池子');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '获取池子信息失败';
      set({ error: errorMsg, isLoading: false });
      console.error('❌ 获取池子信息失败:', errorMsg);
    }
  },

  // 获取所有交易对
  fetchPairs: async (publicClient: PublicClient) => {
    const { contractAddress } = get();
    if (!contractAddress) {
      set({ error: '合约地址未初始化' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      console.log('🔍 获取所有交易对...');
      
      const pairs = await publicClient.readContract({
        address: contractAddress,
        abi: typedPoolManagerABI,
        functionName: 'getPairs',
      }) as Pair[];
      
      set({ pairs, isLoading: false });
      console.log('✅ 获取到', pairs.length, '个交易对');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '获取交易对失败';
      set({ error: errorMsg, isLoading: false });
      console.error('❌ 获取交易对失败:', errorMsg);
    }
  },

  // 获取特定池子地址
  getPool: async (publicClient: PublicClient, tokenA: Address, tokenB: Address, index: number): Promise<Address> => {
    const { contractAddress } = get();
    const nullAddress = '0x0000000000000000000000000000000000000000' as Address;
    
    if (!contractAddress) {
      set({ error: '合约地址未初始化' });
      return nullAddress;
    }

    try {
      set({ isLoading: true, error: null });
      console.log(`🔍 获取池子 ${tokenA}-${tokenB} (index: ${index})...`);
      
      const poolAddress = await publicClient.readContract({
        address: contractAddress,
        abi: typedPoolManagerABI,
        functionName: 'getPool',
        args: [tokenA, tokenB, index]
      }) as Address;
      
      set({ isLoading: false });
      console.log('✅ 获取到池子地址:', poolAddress);
      return poolAddress;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '获取池子地址失败';
      set({ error: errorMsg, isLoading: false });
      console.error('❌ 获取池子地址失败:', errorMsg);
      return nullAddress;
    }
  },

  // 获取参数
  getParameters: async (publicClient: PublicClient): Promise<ContractParameters> => {
    const { contractAddress } = get();
    const nullAddress = '0x0000000000000000000000000000000000000000' as Address;
    const defaultParams: ContractParameters = {
      factory: nullAddress,
      tokenA: nullAddress,
      tokenB: nullAddress,
      tickLower: 0,
      tickUpper: 0,
      fee: 0,
    };

    if (!contractAddress) {
      set({ error: '合约地址未初始化' });
      return defaultParams;
    }

    try {
      set({ isLoading: true, error: null });
      console.log('🔍 获取合约参数...');
      
      const params = await publicClient.readContract({
        address: contractAddress,
        abi: typedPoolManagerABI,
        functionName: 'parameters',
      }) as readonly [Address, Address, Address, number, number, number];
      
      set({ isLoading: false });
      
      const result: ContractParameters = {
        factory: params[0],
        tokenA: params[1],
        tokenB: params[2],
        tickLower: params[3],
        tickUpper: params[4],
        fee: params[5],
      };
      
      console.log('✅ 获取到合约参数:', result);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '获取参数失败';
      set({ error: errorMsg, isLoading: false });
      console.error('❌ 获取参数失败:', errorMsg);
      return defaultParams;
    }
  },

  // 创建池子
 createPool: async (
  publicClient: PublicClient,
  walletClient: WalletClient,
  chain: Chain,
  params: CreatePoolParams,
  account: Address, // 添加 account 参数
): Promise<TransactionResult> => {
    const { contractAddress } = get();
    if (!contractAddress) {
      throw new Error('合约地址未初始化');
    }

    try {
      set({ isLoading: true, error: null });
      console.log('🚀 开始创建池子...');
      console.log('参数:', params);
      
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
      account, // 添加 account 参数
    });
      
      console.log('📝 交易哈希:', hash);
      
      console.log('⏳ 等待交易确认...');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('✅ 交易已确认');
      
      // 从事件中获取池子地址
      let poolAddress = '';
      if (receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const event = decodeEventLog({
              abi: typedPoolManagerABI,
              data: log.data,
              topics: [...log.topics] as unknown as [signature: Hex, ...args: Hex[]], // 将 readonly 数组转换为普通数组
            }) as DecodedPoolCreatedEvent;
            
            if (event.eventName === 'PoolCreated') {
              poolAddress = event.args.pool;
              console.log('✅ 新池子地址:', poolAddress);
              break;
            }
          } catch (e) {
            // 忽略解码错误
            console.warn('解码事件日志失败:', e);
          }
        }
      }
      
      // 刷新池子列表
      await get().fetchAllPools(publicClient);
      
      set({ isLoading: false });
      return { hash, receipt };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '创建池子失败';
      set({ error: errorMsg, isLoading: false });
      console.error('❌ 创建池子失败:', errorMsg);
      throw error;
    }
  },
  getTokenBalance: async (
    publicClient: PublicClient,
    tokenAddress: Address,
    userAddress: Address
  ): Promise<bigint> => {
    try {
      // 使用 ERC20 标准的 balanceOf 方法
      const erc20ABI = [
        {
          inputs: [{ name: "account", type: "address" }],
          name: "balanceOf",
          outputs: [{ name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "decimals",
          outputs: [{ name: "", type: "uint8" }],
          stateMutability: "view",
          type: "function",
        }
      ] as const;

      const balance = await publicClient.readContract({
        address: tokenAddress,
        abi: erc20ABI,
        functionName: "balanceOf",
        args: [userAddress]
      });

      return balance as bigint;
    } catch (error) {
      console.error(`获取代币 ${tokenAddress} 余额失败:`, error);
      return 0n;
    }
  },

  // 创建并初始化池子
  createAndInitializePoolIfNecessary: async (
    publicClient: PublicClient,
    walletClient: WalletClient,
    chain: Chain,
    params: CreateAndInitializeParams,
     account: Address, // 添加 account 参数
  ): Promise<TransactionResult> => {
    const { contractAddress } = get();
    if (!contractAddress) {
      throw new Error('合约地址未初始化');
    }

    try {
      set({ isLoading: true, error: null });
      console.log('🚀 开始创建并初始化池子...');
      console.log('参数:', params);
      
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: typedPoolManagerABI,
        functionName: 'createAndInitializePoolIfNecessary',
        args: [params],
        chain, // 添加 chain 参数
        account
      });
      
      console.log('📝 交易哈希:', hash);
      
      console.log('⏳ 等待交易确认...');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('✅ 交易已确认');
      
      // 刷新池子列表
      await get().fetchAllPools(publicClient);
      
      set({ isLoading: false });
      return { hash, receipt };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '创建并初始化池子失败';
      set({ error: errorMsg, isLoading: false });
      console.error('❌ 创建并初始化池子失败:', errorMsg);
      throw error;
    }
  },
}));

// 使用 viem 的 decodeEventLog 函数
function decodeEventLog({ abi, data, topics }: { 
  abi: Abi; 
  data: `0x${string}`; 
  topics:[signature: Hex, ...args: Hex[]] // 注意这里不再是 readonly
}) {
  try {
    // 使用 viem 的 decodeEventLog 函数
    const decoded = viemDecodeEventLog({
      abi,
      data,
      topics , // 类型断言
    });
    
    return decoded;
  } catch (error) {
    // 如果 viem 解码失败，使用简化版本
    const eventAbi = abi.find((item) => 
      item.type === 'event' && 
      item.name === 'PoolCreated'
    );
    
    if (!eventAbi) {
      throw new Error('Event ABI not found');
    }
    
    // 简化处理，实际项目中应该使用更完整的解码逻辑
    const poolAddress = ('0x' + data.slice(2 + 64 * 6, 2 + 64 * 7)) as Address;
    
    return {
      eventName: 'PoolCreated',
      args: {
        pool: poolAddress,
        token0: '0x0000000000000000000000000000000000000000' as Address,
        token1: '0x0000000000000000000000000000000000000000' as Address,
        fee: 0,
        tickLower: 0,
        tickUpper: 0,
      }
    };
  }
}

export default usePoolManagerStore;