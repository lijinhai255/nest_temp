import { 
ExtendedWallet, 
WalletConnectionResult, 
EthereumProvider 
} from "@/types/provider";
import { SignerFactory } from "../utils/signerFactory";

export class ConfiguredWalletConnector {
/**
 * 连接配置的钱包
 * @param wallet 扩展钱包实例
 * @returns 连接结果
 */
static async connect(wallet: ExtendedWallet): Promise<WalletConnectionResult> {
  try {
    // 如果钱包有自己的连接器
    if (wallet.createConnector) {
      return await this.connectWithConnector(wallet);
    }

    // 如果钱包有直接的 provider
    if (wallet.provider) {
      return await this.connectWithProvider(wallet);
    }

    throw new Error(`无法连接到钱包 ${wallet.name}`);
  } catch (error) {
    throw new Error(`连接配置钱包失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

private static async connectWithConnector(wallet: ExtendedWallet): Promise<WalletConnectionResult> {
  const connector = wallet.createConnector!();
  const connectionResult = await connector.connect();
  
  if (connectionResult.accounts && connectionResult.accounts.length > 0) {
    const address = connectionResult.accounts[0];
    
    // 🔧 修复：获取数字类型的链 ID
    const chainId = await this.getChainId(connector.provider);

    return {
      success: true,
      address,
      chainId, // 现在是 number | undefined
      wallet: {
        id: wallet.id,
        name: wallet.name,
        installed: wallet.installed,
      },
      provider: connector.provider,
      signer: SignerFactory.createFromProvider(connector.provider, address),
    };
  }

  throw new Error(`连接器未返回账户信息`);
}

private static async connectWithProvider(wallet: ExtendedWallet): Promise<WalletConnectionResult> {
  const accounts = await wallet.provider!.request({
    method: "eth_requestAccounts",
  }) as string[];

  if (accounts && accounts.length > 0) {
    const address = accounts[0];
    
    // 🔧 修复：获取数字类型的链 ID
    const chainId = await this.getChainId(wallet.provider!);

    return {
      success: true,
      address,
      chainId, // 现在是 number | undefined
      wallet: {
        id: wallet.id,
        name: wallet.name,
        installed: wallet.installed,
      },
      provider: wallet.provider!,
      signer: SignerFactory.createFromProvider(wallet.provider!, address),
    };
  }

  throw new Error(`Provider 未返回账户信息`);
}

// 🔧 修复：返回 number | undefined 而不是 string | undefined
private static async getChainId(provider: EthereumProvider): Promise<number | undefined> {
  try {
    const chainIdHex = await provider.request({
      method: "eth_chainId",
    }) as string;

    // 🔧 将十六进制字符串转换为数字
    if (typeof chainIdHex === 'string') {
      return parseInt(chainIdHex, 16);
    }

    return undefined;
  } catch (error) {
    console.warn("获取链 ID 失败:", error);
    return undefined;
  }
}

// 🆕 添加辅助方法：验证链 ID 格式
private static isValidChainIdHex(chainId: unknown): chainId is string {
  return typeof chainId === 'string' && /^0x[0-9a-fA-F]+$/.test(chainId);
}

// 🆕 添加更安全的链 ID 获取方法
private static async getChainIdSafe(provider: EthereumProvider): Promise<number | undefined> {
  try {
    const chainIdHex = await provider.request({
      method: "eth_chainId",
    });

    // 验证返回值格式
    if (this.isValidChainIdHex(chainIdHex)) {
      const chainIdNumber = parseInt(chainIdHex, 16);
      
      // 验证转换结果是否为有效数字
      if (!isNaN(chainIdNumber) && chainIdNumber > 0) {
        return chainIdNumber;
      }
    }

    console.warn("获取到无效的链 ID 格式:", chainIdHex);
    return undefined;
  } catch (error) {
    console.warn("获取链 ID 失败:", error);
    return undefined;
  }
}
}