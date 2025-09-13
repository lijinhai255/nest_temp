// lib/walletManager.ts - 修复实现
import { DetectedWallet, EthereumProvider, ExtendedWallet, WalletConnectionResult, WalletConnector, WalletConnectResult } from '@/types/provider';
import { SignerFactory } from './wallets/utils/signerFactory';

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

interface EIP6963AnnounceEvent extends Event {
  detail: EIP6963ProviderDetail;
}

interface WalletProvider extends EthereumProvider {
  isMetaMask?: boolean;
  isOkxWallet?: boolean;
  isCoinbaseWallet?: boolean;
  isRabby?: boolean;
  isTrust?: boolean;
}

declare global {
  interface Window {
    okxwallet?: EthereumProvider;
    rabby?: EthereumProvider;
    trustWallet?: EthereumProvider;
  }
}

interface WindowEthereum {
  ethereum?: unknown;
  okxwallet?: EthereumProvider;
  rabby?: EthereumProvider;
  trustWallet?: EthereumProvider;
  coinbaseWalletExtension?: unknown;
}

export class WalletManager {
  private wallets = new Map<string, DetectedWallet>();
  private initialized = false;

  constructor() {
    // 不在构造函数中自动初始化，等待手动调用
  }

  public initialize(): DetectedWallet[] {
    if (this.initialized) {
      console.log("🔄 WalletManager 已经初始化，返回现有钱包");
      return this.getWallets();
    }

    console.log("🚀 初始化 WalletManager...");
    this.detectWallets();
    this.initialized = true;
    console.log("✅ WalletManager 初始化完成");
    return this.getWallets();
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public async connectWallet(walletId: string): Promise<WalletConnectionResult> {
    console.log(`🔌 WalletManager 连接钱包: ${walletId}`);
    
    const wallet = this.getWalletById(walletId);
    if (!wallet) {
      throw new Error(`钱包 ${walletId} 未找到或未安装`);
    }

    if (!wallet.createConnector) {
      throw new Error(`钱包 ${wallet.name} 缺少连接器`);
    }

    try {
      const connector = wallet.createConnector();
      const result = await connector.connect();

      // 🔧 现在可以直接访问 accounts 属性
      if (!result.accounts || result.accounts.length === 0) {
        throw new Error("连接器未返回账户信息");
      }

      const address = result.accounts[0];
      const provider: EthereumProvider = connector.provider || wallet.provider;
      const chainId = await this.getChainIdSafe(provider);

      return {
        success: true,
        address,
        chainId,
        wallet: {
          id: wallet.id,
          name: wallet.name,
          installed: wallet.installed,
        },
        provider,
        signer: SignerFactory.createFromProvider(provider, address),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error(`❌ 连接钱包 ${wallet.name} 失败:`, error);
      throw new Error(`连接钱包失败: ${errorMessage}`);
    }
  }

  private async getChainIdSafe(provider: EthereumProvider): Promise<number | undefined> {
    try {
      const chainIdHex = await provider.request({ method: "eth_chainId" });
      if (typeof chainIdHex === 'string' && /^0x[0-9a-fA-F]+$/.test(chainIdHex)) {
        return parseInt(chainIdHex, 16);
      }
    } catch (error) {
      console.warn("获取链 ID 失败:", error);
    }
    return undefined;
  }

  private detectWallets(): void {
    if (typeof window === 'undefined') {
      console.log("⚠️ 非浏览器环境，跳过钱包检测");
      return;
    }

    console.log("🔍 开始检测钱包...");
    this.detectEIP6963Wallets();
    this.detectLegacyWallets();
    console.log(`🎯 检测完成，找到 ${this.wallets.size} 个钱包`);
  }

  private detectEIP6963Wallets(): void {
    const announceEvent = 'eip6963:announceProvider';
    const requestEvent = 'eip6963:requestProvider';

    const handleAnnounce = (event: Event): void => {
      const announceEvent = event as EIP6963AnnounceEvent;
      const detail: EIP6963ProviderDetail = announceEvent.detail;
      this.addWallet(detail);
    };

    window.addEventListener(announceEvent, handleAnnounce);
    window.dispatchEvent(new Event(requestEvent));
  }

  private detectLegacyWallets(): void {
    const windowEth = window as unknown as WindowEthereum;
    const ethereum = this.getEthereumProvider(windowEth);
    
    if (!ethereum) {
      console.log("⚠️ 未找到 window.ethereum");
      return;
    }

    const provider = ethereum as WalletProvider;

    // MetaMask
    if (provider.isMetaMask) {
      this.addLegacyWallet('metamask', 'MetaMask', provider);
    }

    // OKX
    if (provider.isOkxWallet || windowEth.okxwallet) {
      const okxProvider = windowEth.okxwallet || provider;
      this.addLegacyWallet('okx', 'OKX Wallet', okxProvider);
    }

    // Coinbase
    if (provider.isCoinbaseWallet) {
      this.addLegacyWallet('coinbase', 'Coinbase Wallet', provider);
    } else {
      const coinbaseProvider = this.getCoinbaseWalletExtension(windowEth);
      if (coinbaseProvider) {
        this.addLegacyWallet('coinbase', 'Coinbase Wallet', coinbaseProvider);
      }
    }

    // Rabby
    if (provider.isRabby || windowEth.rabby) {
      const rabbyProvider = windowEth.rabby || provider;
      this.addLegacyWallet('rabby', 'Rabby Wallet', rabbyProvider);
    }

    // Trust Wallet
    if (provider.isTrust || windowEth.trustWallet) {
      const trustProvider = windowEth.trustWallet || provider;
      this.addLegacyWallet('trust', 'Trust Wallet', trustProvider);
    }
  }

  private getEthereumProvider(windowEth: WindowEthereum): EthereumProvider | null {
    try {
      const ethereum = windowEth.ethereum;
      
      if (
        ethereum &&
        typeof ethereum === 'object' &&
        'request' in ethereum &&
        typeof (ethereum as { request: unknown }).request === 'function'
      ) {
        return ethereum as EthereumProvider;
      }
    } catch (error) {
      console.warn("获取 ethereum provider 失败:", error);
    }
    return null;
  }

  private getCoinbaseWalletExtension(windowEth: WindowEthereum): EthereumProvider | null {
    try {
      const coinbaseExtension = windowEth.coinbaseWalletExtension;
      
      if (
        coinbaseExtension &&
        typeof coinbaseExtension === 'object' &&
        'request' in coinbaseExtension &&
        typeof (coinbaseExtension as { request: unknown }).request === 'function'
      ) {
        return coinbaseExtension as EthereumProvider;
      }
    } catch (error) {
      console.warn("获取 Coinbase Wallet Extension 失败:", error);
    }
    return null;
  }

  private addWallet(detail: EIP6963ProviderDetail): void {
    const wallet: DetectedWallet = {
      id: this.normalizeWalletId(detail.info.rdns),
      name: detail.info.name,
      icon: detail.info.icon,
      rdns: detail.info.rdns,
      provider: detail.provider,
      installed: true,
      createConnector: () => this.createStandardConnector(detail.provider, detail.info.name)
    };

    console.log(`🔍 检测到钱包 (EIP-6963): ${wallet.name}`, wallet);
    this.wallets.set(wallet.id, wallet);
  }

  private addLegacyWallet(id: string, name: string, provider: EthereumProvider): void {
    if (this.wallets.has(id)) {
      console.log(`⚠️ 钱包 ${name} 已存在，跳过`);
      return;
    }

    const wallet: DetectedWallet = {
      id,
      name,
      icon: this.getDefaultIcon(id),
      rdns: `legacy.${id}`,
      provider,
      installed: true,
      createConnector: () => this.createStandardConnector(provider, name)
    };

    console.log(`🔍 检测到钱包 (Legacy): ${wallet.name}`, wallet);
    this.wallets.set(wallet.id, wallet);
  }

  // 🔧 修复连接器实现 - 返回正确的类型
  private createStandardConnector(provider: EthereumProvider, walletName: string): WalletConnector {
    console.log(`🔌 为 ${walletName} 创建标准连接器`);
    
    const connector: WalletConnector = {
      provider,
      
      connect: async (): Promise<WalletConnectResult> => { // 🔧 返回 WalletConnectResult
        console.log(`🔄 ${walletName} 连接中...`);
        try {
          const accounts = await provider.request({
            method: 'eth_requestAccounts'
          });
          
          console.log(`✅ ${walletName} 连接成功:`, accounts);
          
          // 🔧 确保 accounts 是字符串数组
          const accountsArray = Array.isArray(accounts) 
            ? accounts.filter((acc): acc is string => typeof acc === 'string')
            : typeof accounts === 'string' 
              ? [accounts] 
              : [];

          if (accountsArray.length === 0) {
            throw new Error('未获取到有效的账户地址');
          }
          
          // 🔧 获取 chainId 并确保类型正确
          const chainId = await this.getChainIdAsNumber(provider);
          
          // 🔧 返回符合 WalletConnectResult 接口的对象
          const result: WalletConnectResult = {
            accounts: accountsArray,
            chainId, // 🔧 现在是 number | undefined 类型
          };
          
          return result;
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '连接失败';
          console.error(`❌ ${walletName} 连接失败:`, error);
          throw new Error(`${walletName} 连接失败: ${errorMessage}`);
        }
      },
      
      disconnect: async (): Promise<void> => {
        console.log(`${walletName} 需要用户手动断开连接`);
      }
    };

    return connector;
  }

  // 🔧 修复 chainId 获取方法 - 确保返回 number 类型
  private async getChainIdAsNumber(provider: EthereumProvider): Promise<number | undefined> {
    try {
      const chainIdHex = await provider.request({ method: "eth_chainId" });
      if (typeof chainIdHex === 'string' && /^0x[0-9a-fA-F]+$/.test(chainIdHex)) {
        return parseInt(chainIdHex, 16); // 🔧 明确返回 number 类型
      }
      // 🔧 如果已经是数字，直接返回
      if (typeof chainIdHex === 'number') {
        return chainIdHex;
      }
    } catch (error) {
      console.warn("获取链 ID 失败:", error);
    }
    return undefined;
  }

  // 🔧 保留原有方法用于其他地方
  private async getChainIdHex(provider: EthereumProvider): Promise<string | undefined> {
    try {
      const chainIdHex = await provider.request({ method: "eth_chainId" });
      if (typeof chainIdHex === 'string' && /^0x[0-9a-fA-F]+$/.test(chainIdHex)) {
        return chainIdHex;
      }
      // 🔧 如果是数字，转换为十六进制
      if (typeof chainIdHex === 'number') {
        return `0x${chainIdHex.toString(16)}`;
      }
    } catch (error) {
      console.warn("获取链 ID 失败:", error);
    }
    return undefined;
  }

  private normalizeWalletId(rdns: string): string {
    const idMap: Record<string, string> = {
      'io.metamask': 'metamask',
      'com.okex.wallet': 'okx',
      'com.coinbase.wallet': 'coinbase',
      'io.rabby': 'rabby',
      'com.trustwallet.app': 'trust'
    };
    
    return idMap[rdns] || rdns.split('.').pop() || rdns;
  }

  private getDefaultIcon(id: string): string {
    const iconMap: Record<string, string> = {
      'metamask': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSI+PC9zdmc+',
      'okx': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSI+PC9zdmc+',
      'coinbase': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSI+PC9zdmc+',
      'rabby': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSI+PC9zdmc+',
      'trust': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSI+PC9zdmc+'
    };
    
    return iconMap[id] || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSI+PC9zdmc+';
  }

  // 公共方法
  getWallets(): DetectedWallet[] {
    if (!this.initialized) {
      console.warn("⚠️ WalletManager 未初始化，返回空数组");
      return [];
    }
    return Array.from(this.wallets.values());
  }

  getWalletById(id: string): DetectedWallet | null {
    if (!this.initialized) {
      console.warn("⚠️ WalletManager 未初始化");
      return null;
    }
    return this.wallets.get(id) || null;
  }

  isWalletInstalled(id: string): boolean {
    if (!this.initialized) {
      console.warn("⚠️ WalletManager 未初始化");
      return false;
    }
    return this.wallets.has(id);
  }

  getExtendedWallets(): ExtendedWallet[] {
    return this.getWallets().map(wallet => ({
      id: wallet.id,
      name: wallet.name,
      installed: wallet.installed,
      provider: wallet.provider,
      createConnector: wallet.createConnector,
      iconUrl: wallet.icon || this.getDefaultIcon(wallet.id),
    }));
  }

  getExtendedWalletById(id: string): ExtendedWallet | null {
    const wallet = this.getWalletById(id);
    if (!wallet) return null;

    return {
      id: wallet.id,
      name: wallet.name,
      installed: wallet.installed,
      provider: wallet.provider,
      createConnector: wallet.createConnector,
      iconUrl: wallet.icon || this.getDefaultIcon(id),
    };
  }
}

// 创建单例实例
export const walletManager = new WalletManager();

export const initializeWallets = (): DetectedWallet[] => {
  return walletManager.initialize();
};

export const getInstalledWallets = (): ExtendedWallet[] => {
  return walletManager.getExtendedWallets();
};

export const getWalletById = (id: string): ExtendedWallet | null => {
  return walletManager.getExtendedWalletById(id);
};

export const isWalletInstalled = (id: string): boolean => {
  return walletManager.isWalletInstalled(id);
};
