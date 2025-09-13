// configuredWalletConnector.ts - 简化版本
import { 
  ExtendedWallet, 
  WalletConnectionResult, 
  EthereumProvider 
} from "@/types/provider";
import { SignerFactory } from "../utils/signerFactory";

export class ConfiguredWalletConnector {
  static async connect(wallet: ExtendedWallet): Promise<WalletConnectionResult> {
    try {
      console.log("🔍 尝试连接钱包:", wallet.name, wallet.id);
      
      if (!wallet.installed) {
        throw new Error(`钱包 ${wallet.name} 未安装`);
      }
      
      // 优先使用 createConnector
      if (wallet.createConnector) {
        console.log("📦 使用 createConnector 连接");
        return await this.connectWithConnector(wallet);
      }

      // 备用方案：直接使用 provider
      if (wallet.provider) {
        console.log("🌐 直接使用 provider 连接");
        return await this.connectWithProvider(wallet);
      }

      throw new Error(`钱包 ${wallet.name} 缺少连接方式`);
    } catch (error) {
      console.error("❌ 连接钱包失败:", error);
      throw error;
    }
  }

  private static async connectWithConnector(wallet: ExtendedWallet): Promise<WalletConnectionResult> {
    try {
      console.log("🔌 创建连接器...");
      const connector = wallet.createConnector!();
      
      console.log("🔍 连接器详情:", {
        type: typeof connector,
        methods: Object.keys(connector),
        hasConnect: typeof connector.connect === 'function',
        hasProvider: !!connector.provider
      });

      if (typeof connector.connect !== 'function') {
        throw new Error("连接器缺少 connect 方法");
      }

      console.log("🔄 调用连接器连接...");
      const result = await connector.connect();
      
      console.log("✅ 连接器返回结果:", result);

      if (!result.accounts || result.accounts.length === 0) {
        throw new Error("连接器未返回账户信息");
      }

      const address = result.accounts[0];
      const provider = result.provider || connector.provider;
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
      console.error("❌ 连接器连接失败:", error);
      throw error;
    }
  }

  private static async connectWithProvider(wallet: ExtendedWallet): Promise<WalletConnectionResult> {
    try {
      console.log("🌐 使用 provider 直接连接");
      
      if (!wallet.provider || typeof wallet.provider.request !== 'function') {
        throw new Error("无效的 provider");
      }
      
      const accounts = await wallet.provider.request({
        method: "eth_requestAccounts",
      }) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error("Provider 未返回账户信息");
      }

      const address = accounts[0];
      const chainId = await this.getChainIdSafe(wallet.provider);

      return {
        success: true,
        address,
        chainId,
        wallet: {
          id: wallet.id,
          name: wallet.name,
          installed: wallet.installed,
        },
        provider: wallet.provider,
        signer: SignerFactory.createFromProvider(wallet.provider, address),
      };
    } catch (error) {
      console.error("❌ Provider 连接失败:", error);
      throw error;
    }
  }

  private static async getChainIdSafe(provider: EthereumProvider): Promise<number | undefined> {
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
}
