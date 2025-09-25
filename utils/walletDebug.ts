/**
 * 钱包连接状态调试工具
 * 用于诊断页面刷新后连接状态丢失的问题
 */

export interface WalletDebugInfo {
  timestamp: number;
  lastConnectedWallet: string | null;
  walletAddress: string | null;
  lastConnectionTime: string | null;
  wagmiState: {
    connected: boolean;
    address: string | null;
    chainId: number | null;
  };
  customState: {
    connected: boolean;
    address: string | null;
    chainId: string | null;
  };
  localStorage: {
    available: boolean;
    items: Record<string, string>;
  };
}

export class WalletDebugger {
  /**
   * 获取当前钱包状态调试信息
   */
  static getDebugInfo(): WalletDebugInfo {
    const info: WalletDebugInfo = {
      timestamp: Date.now(),
      lastConnectedWallet: null,
      walletAddress: null,
      lastConnectionTime: null,
      wagmiState: {
        connected: false,
        address: null,
        chainId: null,
      },
      customState: {
        connected: false,
        address: null,
        chainId: null,
      },
      localStorage: {
        available: false,
        items: {},
      },
    };

    // 检查 localStorage 可用性
    if (typeof window !== 'undefined' && window.localStorage) {
      info.localStorage.available = true;

      // 获取相关的存储项
      const keys = [
        'lastConnectedWallet',
        'walletAddress',
        'lastConnectionTime',
        'wagmi.store', // wagmi 的存储
        'wagmi-connected', // wagmi 连接状态
      ];

      keys.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          if (value !== null) {
            info.localStorage.items[key] = value.length > 100 ? value.substring(0, 100) + '...' : value;
          }
        } catch (error) {
          console.warn(`读取 localStorage 失败:`, error);
        }
      });

      // 解析存储的值
      info.lastConnectedWallet = info.localStorage.items['lastConnectedWallet'] || null;
      info.walletAddress = info.localStorage.items['walletAddress'] || null;
      info.lastConnectionTime = info.localStorage.items['lastConnectionTime'] || null;
    }

    return info;
  }

  /**
   * 记录调试信息到控制台
   */
  static logDebugInfo(extraInfo?: Record<string, any>): void {
    const debugInfo = this.getDebugInfo();
    console.group('🔍 钱包调试信息');
    console.log('时间戳:', new Date(debugInfo.timestamp).toLocaleString());
    console.log('上次连接钱包:', debugInfo.lastConnectedWallet);
    console.log('钱包地址:', debugInfo.walletAddress);
    console.log('连接时间:', debugInfo.lastConnectionTime ? new Date(parseInt(debugInfo.lastConnectionTime)).toLocaleString() : '无');
    console.log('LocalStorage:', debugInfo.localStorage);
    if (extraInfo) {
      console.log('额外信息:', extraInfo);
    }
    console.groupEnd();
  }

  /**
   * 清理钱包相关的存储
   */
  static clearWalletStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    const keysToRemove = [
      'lastConnectedWallet',
      'walletAddress',
      'lastConnectionTime',
      'wagmi.store',
      'wagmi-connected',
      'wagmi.disconnected',
      'wagmi.chainId',
      'wagmi.recentConnectorId',
    ];

    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        console.log(`🧹 已清理: ${key}`);
      } catch (error) {
        console.warn(`清理 ${key} 失败:`, error);
      }
    });
  }

  /**
   * 检查连接状态的完整性
   */
  static checkConnectionStateIntegrity(): {
    isValid: boolean;
    issues: string[];
  } {
    const debugInfo = this.getDebugInfo();
    const issues: string[] = [];

    // 检查是否有存储的连接信息但状态不匹配
    if (debugInfo.lastConnectedWallet && !debugInfo.wagmiState.connected) {
      issues.push('有存储的钱包信息但 wagmi 未连接');
    }

    if (debugInfo.walletAddress && debugInfo.wagmiState.address !== debugInfo.walletAddress) {
      issues.push('存储的钱包地址与 wagmi 状态不匹配');
    }

    // 检查连接时间是否合理
    if (debugInfo.lastConnectionTime) {
      const connectionTime = parseInt(debugInfo.lastConnectionTime);
      const timeDiff = Date.now() - connectionTime;
      if (timeDiff > 24 * 60 * 60 * 1000) { // 24小时
        issues.push(`连接时间过久: ${Math.round(timeDiff / (60 * 60 * 1000))}小时前`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * 在页面加载时自动检查和报告
   */
  static autoDebugOnLoad(): void {
    if (typeof window === 'undefined') return;

    // 延迟执行以确保所有状态已初始化
    setTimeout(() => {
      const integrity = this.checkConnectionStateIntegrity();

      if (!integrity.isValid) {
        console.warn('⚠️ 钱包连接状态检测到问题:');
        integrity.issues.forEach(issue => console.warn(`  - ${issue}`));

        // 记录详细调试信息
        this.logDebugInfo({ integrityCheck: integrity });
      } else {
        console.log('✅ 钱包连接状态正常');
      }
    }, 2000); // 2秒后检查
  }
}

// 自动在页面加载时运行调试
if (typeof window !== 'undefined') {
  // 等待页面完全加载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      WalletDebugger.autoDebugOnLoad();
    });
  } else {
    WalletDebugger.autoDebugOnLoad();
  }
}

export default WalletDebugger;