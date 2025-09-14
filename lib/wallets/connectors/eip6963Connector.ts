import { 
  EthereumProvider, 
  WalletConnectionResult,
  DetectedWallet
} from "@/types/provider";
import { SignerFactory } from "../utils/signerFactory";

export class EIP6963Connector {
  /**
   * 使用 EIP-6963 标准连接钱包
   */
  static async connect(wallet: DetectedWallet): Promise<WalletConnectionResult> {
    try {
      console.log(`🔌 EIP-6963 连接钱包: ${wallet.name}`);
      
      if (!wallet.provider || typeof wallet.provider.request !== 'function') {
        throw new Error(`钱包 ${wallet.name} 缺少有效的 provider`);
      }
      
      // 请求账户访问权限
      const accounts = await wallet.provider.request({
        method: "eth_requestAccounts",
      }) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error("未获取到账户信息");
      }

      const address = accounts[0];
      
      // 获取链 ID
      const chainIdHex = await wallet.provider.request({ method: "eth_chainId" });
      const chainId = typeof chainIdHex === 'string' ? parseInt(chainIdHex, 16) : undefined;

      return {
        success: true,
        address,
        chainId,
        wallet: {
          id: wallet.id,
          name: wallet.name,
          installed: true,
        },
        provider: wallet.provider,
        signer: SignerFactory.createFromProvider(wallet.provider, address),
      };
    } catch (error) {
      console.error(`❌ EIP-6963 连接失败:`, error);
      throw error;
    }
  }
  
  /**
   * 检查钱包是否支持 EIP-6963 标准
   */
  static isEIP6963Compatible(provider: EthereumProvider): boolean {
    return (
      provider && 
      typeof provider === 'object' && 
      typeof provider.request === 'function'
    );
  }
}
