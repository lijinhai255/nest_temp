import { ExtendedWallet } from "@/types/provider";

export class IconLoader {
  /**
   * 加载钱包图标
   * @param wallet 扩展钱包实例
   * @param onUpdate 更新回调函数
   */
  static async loadWalletIcon(
    wallet: ExtendedWallet,
    onUpdate?: () => void
  ): Promise<void> {
    if (wallet.iconLoaded) return;

    try {
      let url: string | undefined;
      if (typeof wallet.iconUrl === "string") {
        url = wallet.iconUrl;
      } else if (typeof wallet.iconUrl === "function") {
        url = await wallet.iconUrl();
      }

      if (url) {
        wallet.iconUrlResolved = url;
        wallet.iconLoaded = true;
        onUpdate?.();
      }
    } catch (error) {
      console.error(`Failed to load icon for ${wallet.name}:`, error);
    }
  }

  /**
   * 批量加载钱包图标
   * @param wallets 钱包列表
   * @param onUpdate 更新回调函数
   */
  static async loadMultipleIcons(
    wallets: ExtendedWallet[],
    onUpdate?: () => void
  ): Promise<void> {
    const loadPromises = wallets.map(wallet => 
      this.loadWalletIcon(wallet, onUpdate)
    );
    
    await Promise.allSettled(loadPromises);
  }
}