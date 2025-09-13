

import { DetectedWallet, EthereumProvider } from '@/types/provider';

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

// 简单的钱包标识
interface WalletProvider extends EthereumProvider {
isMetaMask?: boolean;
isOkxWallet?: boolean;
isCoinbaseWallet?: boolean;
isRabby?: boolean;
}

export class WalletManager {
private wallets = new Map<string, DetectedWallet>();

constructor() {
  this.detectWallets();
}

// 🔧 简化的钱包检测
private detectWallets(): void {
  if (typeof window === 'undefined') return;

  // EIP-6963 检测
  this.setupEIP6963();
  
  // 传统检测
  this.detectLegacyWallets();
}

// 🔧 简化的 EIP-6963 处理
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

// 🔧 简化的类型检查
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

// 🔧 添加钱包到集合
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

// 🔧 简化的传统钱包检测
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

// 🔧 简化的钱包识别
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

// 🔧 简化的图标获取
private getWalletIcon(rdns: string): string {
  const icons: Record<string, string> = {
    'io.metamask': '🦊',
    'com.okex.wallet': '⭕',
    'com.coinbase.wallet': '🔵',
    'io.rabby': '🐰',
  };
  
  return icons[rdns] || '💼';
}

// 🔧 公共 API
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
}

// 单例
export const walletManager = new WalletManager();