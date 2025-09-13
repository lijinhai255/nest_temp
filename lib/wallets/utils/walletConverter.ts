import { DetectedWallet, ExtendedWallet } from "@/types/provider";

export class WalletConverter {
  /**
   * 将检测到的钱包转换为扩展钱包
   * @param wallet 检测到的钱包
   * @returns 扩展钱包实例
   */
  static detectedToExtended(wallet: DetectedWallet): ExtendedWallet {
    return {
      id: wallet.id,
      name: wallet.name,
      iconUrl: wallet.icon || "",
      iconUrlResolved: wallet.icon,
      iconLoaded: !!wallet.icon,
      rdns: wallet.rdns,
      installed: wallet.installed,
      detectionType: wallet.type,
      provider: wallet.provider,
      iconBackground: undefined,
      createConnector: () => ({
        connect: async () => {
          const accounts = (await wallet.provider.request({
            method: "eth_requestAccounts",
          })) as string[];
          return { accounts };
        },
        provider: wallet.provider,
      disconnect: async () => {
        if (wallet.provider && wallet.provider.isConnected) {
          await wallet.provider.isConnected();
        }
      },
      }),
    };
  }

  /**
   * 批量转换检测到的钱包
   * @param wallets 检测到的钱包列表
   * @returns 扩展钱包列表
   */
  static batchDetectedToExtended(wallets: DetectedWallet[]): ExtendedWallet[] {
    return wallets.map(wallet => this.detectedToExtended(wallet));
  }
}