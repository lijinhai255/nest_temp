// types/provider.ts - 修复 any 类型错误

import { ethers } from 'ethers';

// 🔧 添加交易类型定义（移到前面）
export interface TransactionRequest {
to?: string;
from?: string;
value?: string | number;
data?: string;
gas?: string | number;
gasPrice?: string | number;
maxFeePerGas?: string | number;
maxPriorityFeePerGas?: string | number;
nonce?: number;
type?: number;
chainId?: number;
gasLimit?:string
}

// 以太坊提供者接口
export interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
  isConnected?(): boolean;
  enable?():boolean
}

// 🔧 修复连接器返回类型
export interface WalletConnectResult {
  accounts: string[];
  chainId?: number; // 🔧 明确指定为 number 类型
  networkVersion?: string;
  provider?:EthereumProvider
}
// 🔧 定义链信息类型
export interface ChainInfo {
id: number;
name: string;
network: string;
nativeCurrency: {
  name: string;
  symbol: string;
  decimals: number;
};
rpcUrls: {
  default: {
    http: string[];
  };
};
blockExplorers?: {
  default: {
    name: string;
    url: string;
  };
};
}

// ✅ 修复 WalletSigner 接口 - 使用 TransactionRequest 替换 unknown
export interface WalletSigner {
provider?: EthereumProvider;
getAddress: () => string;
signMessage: (message: string) => Promise<string>;
// 可选的 ethers.Signer 兼容方法
connect?: (provider: EthereumProvider) => WalletSigner;
getNonce?: (blockTag?: string) => Promise<number>;
// ✅ 使用具体类型替换 unknown
signTransaction?: (transaction: TransactionRequest) => Promise<string>;
sendTransaction?: (transaction: TransactionRequest) => Promise<unknown>;
}

// 钱包连接器接口

export interface WalletConnector {
  provider: EthereumProvider;
  connect(): Promise<WalletConnectResult>; // 🔧 确保返回 WalletConnectResult
  disconnect(): Promise<void>;
}


// 钱包信息接口
export interface WalletInfo {
id: string;
name: string;
rdns?: string;
icon?: string;
installed: boolean|undefined;
type?: 'eip6963' | 'legacy' | 'walletconnect';
}

// 扩展钱包接口
export interface ExtendedWallet {
id: string;
name: string;
iconUrl: string | (() => Promise<string>);
downloaded?:boolean;
description?:string;
platforms?:string;
iconUrlResolved?: string;
iconLoaded?: boolean;
rdns?: string;
installed?: boolean;
iconBackground?: string;
createConnector?: () => WalletConnector;
detectionType?: 'eip6963' | 'legacy' | 'walletconnect';
provider?: EthereumProvider;
}

export interface DetectedWallet {
  id: string;
  name: string;
  icon: string;
  rdns: string;
  provider: EthereumProvider;
  installed: boolean;
  type?:"eip6963" | "legacy" | "walletconnect" | undefined;
  createConnector?: () => WalletConnector; // 添加这个属性
}

// 钱包连接结果
export interface WalletConnectionResult {
success: boolean;
address?: string;  // ✅ 修复：应该是可选的
chainId?: number;
wallet?: WalletInfo;  // ✅ 修复：应该是可选的
provider?: EthereumProvider;
signer?: WalletSigner;
error?: string;  // ✅ 添加错误信息
}

// 🔧 修复 WalletState 中的 any 类型
export interface WalletState {
address: string|undefined;
chainID: string;
isConnecting: boolean;
isConnected: boolean;
isDisconnected: boolean;
isReconnecting: boolean;
ensName: string | null;
error: Error | null;
chains: ChainInfo[]; // 🔧 替换 any[] 为 ChainInfo[]
provider?: EthereumProvider; // 🔧 替换 any 为 EthereumProvider
balance: string;
wallet?: {
  id: string;
  name: string;
  installed: boolean|undefined;
};
signer?: WalletSigner | ethers.Signer; // 🔧 替换 any 为联合类型
}

export interface WalletContextValue extends WalletState {
connect: (walletId: string) => Promise<WalletConnectionResult>;
disconnect: () => Promise<void>;
switchChain: (chainId: number) => Promise<void>;
openModal: () => void;
closeModal: () => void;
walletInstances?: { [groupName: string]: ExtendedWallet[] };
detectedWallets?: DetectedWallet[];
walletsLoading?: boolean;
fetchBalance: () => Promise<void>;
balanceLoading: boolean;
}

// 钱包创建函数类型
export interface WalletCreateConfig {
projectId: string;
appName: string;
}

export type WalletCreateFunction = (config: WalletCreateConfig) => ExtendedWallet;

// 钱包组配置
export interface WalletGroup {
groupName: string;
wallets: WalletCreateFunction[];
}

// Provider 属性
export interface WalletProviderProps {
children: React.ReactNode;
chains?: ChainInfo[];
provider?: EthereumProvider;
autoConnect?: boolean;
wallets?: WalletGroup[];
}

// 🔧 类型守卫函数
export const isEthersSigner = (signer: unknown): signer is ethers.Signer => {
return (
  typeof signer === 'object' &&
  signer !== null &&
  'connect' in signer &&
  'getAddress' in signer &&
  'signMessage' in signer &&
  'signTransaction' in signer &&
  'sendTransaction' in signer
);
};

export const isWalletSigner = (signer: unknown): signer is WalletSigner => {
return (
  typeof signer === 'object' &&
  signer !== null &&
  'getAddress' in signer &&
  'signMessage' in signer
);
};

// 🔧 添加类型转换辅助函数
export const toEthersSigner = (provider: ethers.JsonRpcApiProvider,signer: WalletSigner): ethers.Signer => {
// 创建一个适配器将 WalletSigner 转换为 ethers.Signer
return new ethers.JsonRpcSigner(provider, signer.getAddress());
};

// 🔧 添加通用错误类型
export interface WalletError extends Error {
code?: number;
data?: unknown;
method?: string;
}

// 🔧 添加交易回执类型
export interface TransactionReceipt {
transactionHash: string;
blockNumber: number;
blockHash: string;
gasUsed: string;
status: number;
from: string;
to: string;
logs: unknown[];
}

// 🔧 添加网络类型
export interface NetworkInfo {
chainId: number;
name: string;
currency: string;
rpcUrl: string;
blockExplorerUrl?: string;
}

// 🔧 添加余额信息类型
export interface BalanceInfo {
value: string;
formatted: string;
decimals: number;
symbol: string;
}

// 🔧 添加钱包事件类型
export type WalletEventType = 
| 'connect' 
| 'disconnect' 
| 'accountsChanged' 
| 'chainChanged' 
| 'message';

export interface WalletEvent {
type: WalletEventType;
data?: unknown;
}

// 🔧 添加钱包配置类型
export interface WalletConfig {
autoConnect?: boolean;
shimDisconnect?: boolean;
pollingInterval?: number;
stallTimeout?: number;
}
