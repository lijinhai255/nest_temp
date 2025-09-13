// lib/signerAdapter.ts - 修复类型问题的 Signer 适配器

import { ethers } from 'ethers';
import { WalletSigner, TransactionRequest as CustomTransactionRequest } from '@/types/provider';

// 🔧 类型转换函数：ethers.TransactionRequest -> CustomTransactionRequest
function convertEthersToCustomTransaction(
ethersTransaction: ethers.TransactionRequest
): CustomTransactionRequest {
return {
  to: ethersTransaction.to?.toString(),
  from: ethersTransaction.from?.toString(),
  value: ethersTransaction.value?.toString(),
  data: ethersTransaction.data?.toString(),
  gas: ethersTransaction.gasLimit?.toString(),
  gasPrice: ethersTransaction.gasPrice?.toString(),
  maxFeePerGas: ethersTransaction.maxFeePerGas?.toString(),
  maxPriorityFeePerGas: ethersTransaction.maxPriorityFeePerGas?.toString(),
  nonce: ethersTransaction.nonce ? Number(ethersTransaction.nonce) : undefined,
  type: ethersTransaction.type ? Number(ethersTransaction.type) : undefined,
  chainId: ethersTransaction.chainId ? Number(ethersTransaction.chainId) : undefined,
  gasLimit: ethersTransaction.gasLimit?.toString()||undefined,
};
}



// 🔧 使用组合模式创建 Signer 兼容对象
export class WalletSignerAdapter {
private walletSigner: WalletSigner;
public provider?: ethers.Provider;

constructor(walletSigner: WalletSigner, provider?: ethers.Provider) {
  this.walletSigner = walletSigner;
  if (provider) {
    this.provider = provider;
  } else if (walletSigner.provider) {
    // 🔧 修复 any 类型问题
    this.provider = new ethers.BrowserProvider(walletSigner.provider as ethers.Eip1193Provider);
  }
}

// 🎯 创建符合 ethers.Signer 接口的对象
toEthersSigner(): ethers.Signer {
  // 🔧 修复 this 别名问题
  const walletSigner = this.walletSigner;
  const provider = this.provider;
  
  // 创建一个符合 ethers.Signer 接口的对象
  const signerLike = {
    provider,
    
    async getAddress() {
      return walletSigner.getAddress();
    },
    
    async signMessage(message: string | Uint8Array): Promise<string> {
      const messageStr = typeof message === 'string' 
        ? message 
        : ethers.toUtf8String(message);
      return walletSigner.signMessage(messageStr);
    },
    
    // ✅ 修复类型转换问题
    async signTransaction(transaction: ethers.TransactionRequest): Promise<string> {
      if (walletSigner.signTransaction) {
        // 转换 ethers 类型到自定义类型
        const customTransaction = convertEthersToCustomTransaction(transaction);
        return walletSigner.signTransaction(customTransaction);
      }
      throw new Error('signTransaction not supported by this wallet');
    },
    
    connect(newProvider: ethers.Provider): ethers.Signer {
      return new WalletSignerAdapter(walletSigner, newProvider).toEthersSigner();
    },
    
    async getNonce(blockTag?: ethers.BlockTag): Promise<number> {
      if (walletSigner.getNonce) {
        return walletSigner.getNonce(blockTag?.toString());
      }
      if (provider) {
        const address = await walletSigner.getAddress();
        return provider.getTransactionCount(address, blockTag);
      }
      throw new Error('Cannot get nonce: no provider available');
    },
    
    async populateCall(transaction: ethers.TransactionRequest): Promise<ethers.TransactionRequest> {
      const populated = { ...transaction };
      
      if (!populated.from) {
        populated.from = await walletSigner.getAddress();
      }
      
      if (populated.nonce === undefined) {
        populated.nonce = await signerLike.getNonce();
      }
      
      return populated;
    },
    
    async populateTransaction(transaction: ethers.TransactionRequest): Promise<ethers.TransactionRequest> {
      return signerLike.populateCall(transaction);
    },
    
    async estimateGas(transaction: ethers.TransactionRequest): Promise<bigint> {
      if (provider) {
        return provider.estimateGas(transaction);
      }
      throw new Error('Cannot estimate gas: no provider available');
    },
    
    async call(transaction: ethers.TransactionRequest): Promise<string> {
      if (provider) {
        return provider.call(transaction);
      }
      throw new Error('Cannot call: no provider available');
    },
    
    async resolveName(name: string): Promise<string | null> {
      if (provider) {
        return provider.resolveName(name);
      }
      return null;
    },
    
    // ✅ 修复 sendTransaction 类型转换问题
    async sendTransaction(transaction: ethers.TransactionRequest): Promise<ethers.TransactionResponse> {
      if (walletSigner.sendTransaction) {
        // 转换 ethers 类型到自定义类型
        const customTransaction = convertEthersToCustomTransaction(transaction);
        const result = await walletSigner.sendTransaction(customTransaction);
        
        // 如果返回的是交易哈希，获取完整的交易响应
        if (typeof result === 'string' && provider) {
          const tx = await provider.getTransaction(result);
          if (tx) {
            return tx;
          }
          // 如果找不到交易，创建一个基本的响应对象
          return {
            hash: result,
            wait: () => provider.waitForTransaction(result)
          } as ethers.TransactionResponse;
        }
        
        return result as ethers.TransactionResponse;
      }
      
      if (provider) {
        const populatedTx = await signerLike.populateTransaction(transaction);
        const signedTx = await signerLike.signTransaction(populatedTx);
        return provider.broadcastTransaction(signedTx);
      }
      
      throw new Error('sendTransaction not supported');
    },
    
    // 🔧 修复未使用参数的警告
    async signTypedData(
      _domain: ethers.TypedDataDomain,
      _types: Record<string, ethers.TypedDataField[]>,
      _value: Record<string, unknown>
    ): Promise<string> {
      throw new Error('signTypedData not implemented');
    }
  };
  
  return signerLike as ethers.Signer;
}
}

// 🔧 辅助函数：创建 ethers.Signer 兼容对象
export const createEthersSignerAdapter = (
walletSigner: WalletSigner, 
provider?: ethers.Provider
): ethers.Signer => {
return new WalletSignerAdapter(walletSigner, provider).toEthersSigner();
};

// 🔧 React Hook 用法
export const useEthersSigner = (walletSigner?: WalletSigner): ethers.Signer | undefined => {
if (!walletSigner) return undefined;

try {
  return createEthersSignerAdapter(walletSigner);
} catch (error) {
  console.error('Failed to create ethers signer adapter:', error);
  return undefined;
}
};

// 🔧 类型守卫函数
export const isEthersCompatible = (signer: unknown): signer is ethers.Signer => {
return (
  typeof signer === 'object' &&
  signer !== null &&
  'getAddress' in signer &&
  'signMessage' in signer &&
  'signTransaction' in signer &&
  typeof (signer as Record<string, unknown>).getAddress === 'function'
);
};

// 🆕 添加调试工具函数
export const debugTransaction = (transaction: ethers.TransactionRequest | CustomTransactionRequest) => {
console.log('Transaction debug info:', {
  type: 'gasLimit' in transaction ? 'ethers' : 'custom',
  to: transaction.to,
  value: transaction.value,
  gas: 'gas' in transaction ? transaction.gas : 'gasLimit' in transaction ? transaction.gasLimit : 'N/A',
  gasPrice: transaction.gasPrice,
});
};

// 🆕 添加安全的交易执行函数
export const safeExecuteTransaction = async (
signer: ethers.Signer,
transaction: ethers.TransactionRequest
): Promise<{ success: boolean; result?: ethers.TransactionResponse; error?: string }> => {
try {
  const result = await signer.sendTransaction(transaction);
  return { success: true, result };
} catch (error) {
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error'
  };
}
};

// 🆕 添加交易验证函数
export const validateTransaction = (transaction: ethers.TransactionRequest): string[] => {
const errors: string[] = [];

if (!transaction.to && !transaction.data) {
  errors.push('Transaction must have either "to" address or "data"');
}

if (transaction.value && BigInt(transaction.value) < 0) {
  errors.push('Transaction value cannot be negative');
}

if (transaction.gasLimit && BigInt(transaction.gasLimit) <= 0) {
  errors.push('Gas limit must be positive');
}

return errors;
};