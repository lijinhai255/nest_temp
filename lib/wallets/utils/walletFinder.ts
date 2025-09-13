import { ExtendedWallet } from "@/types/provider";

export class WalletFinder {
  /**
   * 在钱包实例中查找指定 ID 的钱包
   * @param walletId 钱包 ID
   * @param walletInstances 钱包实例组
   * @returns 找到的钱包或 undefined
   */
  static findById(
    walletId: string,
    walletInstances: { [groupName: string]: ExtendedWallet[] }
  ): ExtendedWallet | undefined {
    for (const group of Object.values(walletInstances)) {
      const wallet = group.find(w => w.id === walletId);
      if (wallet) return wallet;
    }
    return undefined;
  }

  /**
   * 根据名称查找钱包
   * @param walletName 钱包名称
   * @param walletInstances 钱包实例组
   * @returns 找到的钱包或 undefined
   */
  static findByName(
    walletName: string,
    walletInstances: { [groupName: string]: ExtendedWallet[] }
  ): ExtendedWallet | undefined {
    const normalizedName = walletName.toLowerCase().trim();
    
    for (const group of Object.values(walletInstances)) {
      const wallet = group.find(w => 
        w.name.toLowerCase().trim() === normalizedName
      );
      if (wallet) return wallet;
    }
    return undefined;
  }

  /**
   * 根据 RDNS 查找钱包
   * @param rdns 钱包 RDNS
   * @param walletInstances 钱包实例组
   * @returns 找到的钱包或 undefined
   */
  static findByRdns(
    rdns: string,
    walletInstances: { [groupName: string]: ExtendedWallet[] }
  ): ExtendedWallet | undefined {
    for (const group of Object.values(walletInstances)) {
      const wallet = group.find(w => w.rdns === rdns);
      if (wallet) return wallet;
    }
    return undefined;
  }
}