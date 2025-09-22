import { create } from 'zustand';
import { 
  Address, 
  PublicClient, 
  WalletClient,
  TransactionReceipt,
  Abi,
  decodeEventLog as viemDecodeEventLog,
  Chain
} from 'viem';
import PositionManagerABI from '@/lib/abi/PositionManager.json';

// 定义 PositionInfo 类型，与合约返回结构匹配
export interface PositionInfo {
  id: bigint;
  owner: Address;
  token0: Address;
  token1: Address;
  index: number;
  fee: number;
  liquidity: bigint;
  tickLower: number;
  tickUpper: number;
  tokensOwed0: bigint;
  tokensOwed1: bigint;
  feeGrowthInside0LastX128: bigint;
  feeGrowthInside1LastX128: bigint;
}

// 定义 Mint 参数类型
export interface MintParams {
  token0: Address;
  token1: Address;
  index: number;
  amount0Desired: bigint;
  amount1Desired: bigint;
  recipient: Address;
  deadline: bigint;
}

// 定义交易结果类型
export interface TransactionResult {
  hash: `0x${string}`;
  receipt: TransactionReceipt;
}

// 定义 Mint 返回结果类型
export interface MintResult extends TransactionResult {
  positionId: bigint;
  liquidity: bigint;
  amount0: bigint;
  amount1: bigint;
}

// 定义 Collect 返回结果类型
export interface CollectResult extends TransactionResult {
  amount0: bigint;
  amount1: bigint;
}

// 定义 Burn 返回结果类型
export interface BurnResult extends TransactionResult {
  amount0: bigint;
  amount1: bigint;
}

// 定义 PositionManager Store 的状态
interface PositionManagerState {
  // 状态
  contractAddress: Address | null;
  positions: PositionInfo[];
  userPositions: PositionInfo[];
  isLoading: boolean;
  error: string | null;
  
  // 初始化方法
  initContract: (address: Address) => void;
  
  // 读取方法
  fetchAllPositions: (publicClient: PublicClient) => Promise<void>;
  fetchUserPositions: (publicClient: PublicClient, userAddress: Address) => Promise<void>;
  getPosition: (publicClient: PublicClient, positionId: bigint) => Promise<PositionInfo | null>;
  
  // 写入方法
  mint: (
    publicClient: PublicClient,
    walletClient: WalletClient,
    chain: Chain,
    account: Address,
    params: MintParams
  ) => Promise<MintResult>;
  
  collect: (
    publicClient: PublicClient,
    walletClient: WalletClient,
    chain: Chain,
    account: Address,
    positionId: bigint,
    recipient: Address
  ) => Promise<CollectResult>;
  
  burn: (
    publicClient: PublicClient,
    walletClient: WalletClient,
    chain: Chain,
    account: Address,
    positionId: bigint
  ) => Promise<BurnResult>;
}

// 类型化的 ABI
const typedPositionManagerABI = PositionManagerABI as Abi;

// 创建 Zustand store
export const usePositionManagerStore = create<PositionManagerState>((set, get) => ({
  // 初始状态
  contractAddress: null,
  positions: [],
  userPositions: [],
  isLoading: false,
  error: null,

  // 初始化合约地址
  initContract: (address: Address) => {
    try {
      set({ contractAddress: address, error: null });
      console.log('✅ PositionManager 合约地址已初始化:', address);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '初始化合约失败';
      set({ error: errorMsg });
      console.error('❌ 初始化合约失败:', errorMsg);
    }
  },

  // 获取所有头寸信息
  fetchAllPositions: async (publicClient: PublicClient) => {
    const { contractAddress } = get();
    if (!contractAddress) {
      set({ error: '合约地址未初始化' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      console.log('🔍 获取所有头寸信息...');
      
      const positions = await publicClient.readContract({
        address: contractAddress,
        abi: typedPositionManagerABI,
        functionName: 'getAllPositions',
      }) as PositionInfo[];
      console.log("fetchAllPositions-fetchAllPositions",positions)
      set({ positions, isLoading: false });
      console.log('✅ 获取到', positions.length, '个头寸');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '获取头寸信息失败';
      set({ error: errorMsg, isLoading: false });
      console.error('❌ 获取头寸信息失败:', errorMsg);
    }
  },

  // 获取用户的头寸
  fetchUserPositions: async (publicClient: PublicClient, userAddress: Address) => {
    const { contractAddress } = get();
    if (!contractAddress) {
      set({ error: '合约地址未初始化' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      console.log(`🔍 获取用户 ${userAddress} 的头寸信息...`);
      
      // 获取所有头寸
      const allPositions = await publicClient.readContract({
        address: contractAddress,
        abi: typedPositionManagerABI,
        functionName: 'getAllPositions',
      }) as PositionInfo[];
      
      // 过滤出用户的头寸
      const userPositions = allPositions.filter(position => 
        position.owner.toLowerCase() === userAddress.toLowerCase()
      );
      
      set({ userPositions, isLoading: false });
      console.log('✅ 获取到用户', userPositions.length, '个头寸');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '获取用户头寸信息失败';
      set({ error: errorMsg, isLoading: false });
      console.error('❌ 获取用户头寸信息失败:', errorMsg);
    }
  },

  // 获取特定头寸信息
  getPosition: async (publicClient: PublicClient, positionId: bigint): Promise<PositionInfo | null> => {
    const { contractAddress } = get();
    
    if (!contractAddress) {
      set({ error: '合约地址未初始化' });
      return null;
    }

    try {
      set({ isLoading: true, error: null });
      console.log(`🔍 获取头寸 ID: ${positionId}...`);
      
      const position = await publicClient.readContract({
        address: contractAddress,
        abi: typedPositionManagerABI,
        functionName: 'positions',
        args: [positionId]
      }) as PositionInfo;
      
      set({ isLoading: false });
      console.log('✅ 获取到头寸信息:', position);
      return position;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '获取头寸信息失败';
      set({ error: errorMsg, isLoading: false });
      console.error('❌ 获取头寸信息失败:', errorMsg);
      return null;
    }
  },

  // 创建新头寸
  mint: async (
    publicClient: PublicClient,
    walletClient: WalletClient,
    chain: Chain,
    account: Address,
    params: MintParams
  ): Promise<MintResult> => {
    const { contractAddress } = get();
    if (!contractAddress) {
      throw new Error('合约地址未初始化');
    }

    try {
      set({ isLoading: true, error: null });
      console.log('🚀 开始创建新头寸...');
      console.log('参数:', params);
      
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: typedPositionManagerABI,
        functionName: 'mint',
        args: [params],
        chain,
        account,
      });
      
      console.log('📝 交易哈希:', hash);
      
      console.log('⏳ 等待交易确认...');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('✅ 交易已确认');
      
      // 解析返回值
      const positionId = 0n;
      const liquidity = 0n;
      const amount0 = 0n;
      const amount1 = 0n;
      
      // 从日志中提取信息
      if (receipt.logs) {
        // 这里需要根据实际合约事件来解析，简化版本
        console.log('✅ 头寸已创建');
      }
      
      // 刷新头寸列表
      await get().fetchAllPositions(publicClient);
      
      set({ isLoading: false });
      return { 
        hash, 
        receipt, 
        positionId, 
        liquidity, 
        amount0, 
        amount1 
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '创建头寸失败';
      set({ error: errorMsg, isLoading: false });
      console.error('❌ 创建头寸失败:', errorMsg);
      throw error;
    }
  },

  // 收集手续费
  collect: async (
    publicClient: PublicClient,
    walletClient: WalletClient,
    chain: Chain,
    account: Address,
    positionId: bigint,
    recipient: Address
  ): Promise<CollectResult> => {
    const { contractAddress } = get();
    if (!contractAddress) {
      throw new Error('合约地址未初始化');
    }

    try {
      set({ isLoading: true, error: null });
      console.log(`🚀 开始收集头寸 ${positionId} 的手续费...`);
      
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: typedPositionManagerABI,
        functionName: 'collect',
        args: [positionId, recipient],
        chain,
        account,
      });
      
      console.log('📝 交易哈希:', hash);
      
      console.log('⏳ 等待交易确认...');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('✅ 交易已确认');
      
      // 解析返回值
      const amount0 = 0n;
      const amount1 = 0n;
      
      // 从日志中提取信息
      if (receipt.logs) {
        // 这里需要根据实际合约事件来解析，简化版本
        console.log('✅ 手续费已收集');
      }
      
      // 刷新头寸列表
      await get().fetchUserPositions(publicClient, account);
      
      set({ isLoading: false });
      return { hash, receipt, amount0, amount1 };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '收集手续费失败';
      set({ error: errorMsg, isLoading: false });
      console.error('❌ 收集手续费失败:', errorMsg);
      throw error;
    }
  },

  // 销毁头寸
  burn: async (
    publicClient: PublicClient,
    walletClient: WalletClient,
    chain: Chain,
    account: Address,
    positionId: bigint
  ): Promise<BurnResult> => {
    const { contractAddress } = get();
    if (!contractAddress) {
      throw new Error('合约地址未初始化');
    }

    try {
      set({ isLoading: true, error: null });
      console.log(`🚀 开始销毁头寸 ${positionId}...`);
      
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: typedPositionManagerABI,
        functionName: 'burn',
        args: [positionId],
        chain,
        account,
      });
      
      console.log('📝 交易哈希:', hash);
      
      console.log('⏳ 等待交易确认...');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('✅ 交易已确认');
      
      // 解析返回值
      const amount0 = 0n;
      const amount1 = 0n;
      
      // 从日志中提取信息
      if (receipt.logs) {
        // 这里需要根据实际合约事件来解析，简化版本
        console.log('✅ 头寸已销毁');
      }
      
      // 刷新头寸列表
      await get().fetchAllPositions(publicClient);
      await get().fetchUserPositions(publicClient, account);
      
      set({ isLoading: false });
      return { hash, receipt, amount0, amount1 };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '销毁头寸失败';
      set({ error: errorMsg, isLoading: false });
      console.error('❌ 销毁头寸失败:', errorMsg);
      throw error;
    }
  },
}));

export default usePositionManagerStore;