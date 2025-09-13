// lib/walletManager.ts - 最终修复版本

// ✅ 导入修复后的类型定义
import { 
DetectedWallet, 
EthereumProvider, 
WalletSigner,
WalletConnectionResult,
TransactionRequest
} from '@/types/provider';

interface EIP6963ProviderInfo {
uuid: string;
name: string;
icon: string;
rdns: string;
}

interface EIP6963ProviderDetail {
info: EIP6963ProviderInfo;
provider: EthereumProvider;
}

interface WalletProvider extends EthereumProvider {
isMetaMask?: boolean;
isOkxWallet?: boolean;
isCoinbaseWallet?: boolean;
isRabby?: boolean;
}

export class WalletManager {
private wallets = new Map<string, DetectedWallet>();
private currentWallet: DetectedWallet | null = null;
private initialized = false;

constructor() {
  // 不在构造函数中自动初始化，等待手动调用
}

// 🆕 初始化方法 - 可以被外部调用
public initialize(): void {
  if (this.initialized) return;
  
  this.detectWallets();
  this.initialized = true;
}

// 🔧 连接钱包方法
public async connectWallet(walletId: string): Promise<WalletConnectionResult> {
  // 确保已初始化
  if (!this.initialized) {
    this.initialize();
  }

  const wallet = this.wallets.get(walletId);
  if (!wallet) {
    return {
      success: false,
      error: `钱包未找到: ${walletId}`,
    };
  }

  try {
    const accounts = await wallet.provider.request({
      method: 'eth_requestAccounts',
    }) as string[];

    if (!accounts || accounts.length === 0) {
      return {
        success: false,
        error: '用户拒绝连接',
      };
    }

    const address = accounts[0];
    this.currentWallet = wallet;

    // ✅ 创建符合接口的 signer
    const signer: WalletSigner = {
      provider: wallet.provider,
      
      getAddress():string {
        return address;
      },

      async signMessage(message: string): Promise<string> {
        return await wallet.provider.request({
          method: 'personal_sign',
          params: [message, address],
        }) as string;
      },

      // ✅ 可选方法 - 使用 TransactionRequest 类型
      async signTransaction(transaction: TransactionRequest): Promise<string> {
        return await wallet.provider.request({
          method: 'eth_signTransaction',
          params: [transaction],
        }) as string;
      },

      // ✅ 可选方法 - 使用 TransactionRequest 类型
      async sendTransaction(transaction: TransactionRequest): Promise<unknown> {
        return await wallet.provider.request({
          method: 'eth_sendTransaction',
          params: [transaction],
        });
      }
    };

    return {
      success: true,
      address,
      chainId: await this.getChainId(wallet.provider),
      wallet: {
        id: wallet.id,
        name: wallet.name,
        rdns: wallet.rdns,
        icon: wallet.icon,
        installed: wallet.installed,
        type: wallet.type,
      },
      provider: wallet.provider,
      signer,
    };

  } catch (error) {
    console.error('连接钱包失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '连接失败',
    };
  }
}

private async getChainId(provider: EthereumProvider): Promise<number> {
  try {
    const chainId = await provider.request({
      method: 'eth_chainId',
    }) as string;
    return parseInt(chainId, 16);
  } catch {
    return 1; // 默认以太坊主网
  }
}

private detectWallets(): void {
  if (typeof window === 'undefined') return;

  this.setupEIP6963();
  this.detectLegacyWallets();
}

private setupEIP6963(): void {
  const handleProvider = (event: Event) => {
    if (event.type === 'eip6963:announceProvider' && 'detail' in event) {
      const detail = (event as { detail: unknown }).detail;
      if (this.isValidDetail(detail)) {
        this.addWallet(detail);
      }
    }
  };

  window.addEventListener('eip6963:announceProvider', handleProvider);
  window.dispatchEvent(new Event('eip6963:requestProvider'));
}

private isValidDetail(detail: unknown): detail is EIP6963ProviderDetail {
  if (!detail || typeof detail !== 'object') return false;
  
  const d = detail as Record<string, unknown>;
  const info = d.info as Record<string, unknown>;
  
  return !!(
    info?.name && 
    info?.rdns && 
    info?.icon && 
    d.provider && 
    typeof (d.provider as Record<string, unknown>).request === 'function'
  );
}

private addWallet(detail: EIP6963ProviderDetail): void {
  const wallet: DetectedWallet = {
    id: detail.info.rdns,
    name: detail.info.name,
    rdns: detail.info.rdns,
    icon: detail.info.icon,
    provider: detail.provider,
    installed: true,
    type: 'eip6963',
  };
  
  this.wallets.set(detail.info.rdns, wallet);
}

private detectLegacyWallets(): void {
  const { ethereum } = window;
  if (!ethereum) return;

  const providers = ethereum.providers || [ethereum];
  
  providers.forEach((provider: WalletProvider, index: number) => {
    const wallet = this.identifyWallet(provider, index);
    if (wallet && !this.wallets.has(wallet.rdns)) {
      this.wallets.set(wallet.rdns, wallet);
    }
  });
}

private identifyWallet(provider: WalletProvider, index: number): DetectedWallet | null {
  const walletConfigs = [
    {
      flag: 'isMetaMask',
      name: 'MetaMask',
      rdns: 'io.metamask',
      condition: (p: WalletProvider) => p.isMetaMask && !p.isOkxWallet && !p.isRabby
    },
    {
      flag: 'isOkxWallet',
      name: 'OKX Wallet',
      rdns: 'com.okex.wallet',
      condition: (p: WalletProvider) => !!p.isOkxWallet
    },
    {
      flag: 'isCoinbaseWallet',
      name: 'Coinbase Wallet',
      rdns: 'com.coinbase.wallet',
      condition: (p: WalletProvider) => !!p.isCoinbaseWallet
    },
    {
      flag: 'isRabby',
      name: 'Rabby Wallet',
      rdns: 'io.rabby',
      condition: (p: WalletProvider) => !!p.isRabby
    }
  ];

  for (const config of walletConfigs) {
    if (config.condition(provider)) {
      return {
        id: `${config.rdns}-${index}`,
        name: config.name,
        rdns: config.rdns,
        icon: this.getWalletIcon(config.rdns),
        provider,
        installed: true,
        type: 'legacy',
      };
    }
  }

  return null;
}

private getWalletIcon(rdns: string): string {
  const icons: Record<string, string> = {
    'io.metamask': '🦊',
    'com.okex.wallet': '⭕',
    'com.coinbase.wallet': '🔵',
    'io.rabby': '🐰',
  };
  
  return icons[rdns] || '💼';
}

// 公共 API
public getAllWallets(): DetectedWallet[] {
  return Array.from(this.wallets.values());
}

public getWallet(id: string): DetectedWallet | undefined {
  return this.wallets.get(id);
}

public getInstalledWallets(): DetectedWallet[] {
  return this.getAllWallets().filter(w => w.installed);
}

public isInstalled(rdns: string): boolean {
  return this.wallets.has(rdns);
}

public getWalletCount(): number {
  return this.wallets.size;
}

public getCurrentWallet(): DetectedWallet | null {
  return this.currentWallet;
}

public disconnect(): void {
  this.currentWallet = null;
}

public isInitialized(): boolean {
  return this.initialized;
}
}

// 创建单例实例
export const walletManager = new WalletManager();

// 🆕 导出初始化函数
export const initializeWallets = () => {
 return walletManager.initialize();
};

// 🆕 导出异步版本
export const initializeWalletsAsync = (): Promise<void> => {
return new Promise((resolve) => {
  walletManager.initialize();
  
  // 给一点时间让 EIP-6963 事件触发
  setTimeout(() => {
    resolve();
  }, 100);
});
};

// 🆕 导出便捷函数
export const getDetectedWallets = (): DetectedWallet[] => {
if (!walletManager.isInitialized()) {
  walletManager.initialize();
}
return walletManager.getAllWallets();
};

export const connectToWallet = async (walletId: string): Promise<WalletConnectionResult> => {
return await walletManager.connectWallet(walletId);
};

// 导出类型
export type { TransactionRequest };