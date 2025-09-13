import { EthereumProvider, WalletSigner } from "@/types/provider";

export class SignerFactory {
  /**
   * 从 Provider 创建 Signer
   * @param provider 以太坊提供者
   * @param address 钱包地址
   * @returns WalletSigner 实例
   */
  static createFromProvider(provider: EthereumProvider, address: string): WalletSigner {
    return {
      provider,
      getAddress:  () => address,
      signMessage: async (message: string) => {
        return provider.request({
          method: "personal_sign",
          params: [message, address],
        }) as Promise<string>;
      },
      signTransaction: async (transaction: unknown) => {
        return provider.request({
          method: "eth_signTransaction",
          params: [transaction],
        }) as Promise<string>;
      },
      sendTransaction: async (transaction: unknown) => {
        return provider.request({
          method: "eth_sendTransaction",
          params: [transaction],
        });
      },
      getNonce: async (blockTag?: string) => {
        const result = await provider.request({
          method: "eth_getTransactionCount",
          params: [address, blockTag || "latest"],
        }) as string;
        return parseInt(result, 16);
      },
      connect: (newProvider: EthereumProvider) => {
        return SignerFactory.createFromProvider(newProvider, address);
      },
    };
  }

  /**
   * 安全转换 Signer
   * @param signer 未知类型的 signer
   * @returns 安全的 WalletSigner 或 undefined
   */
  static ensureSafe(signer: unknown): WalletSigner | undefined {
    if (!signer || typeof signer !== "object") {
      return undefined;
    }

    const signerObj = signer as Record<string, unknown>;

    if (
      typeof signerObj.getAddress === "function" &&
      typeof signerObj.signMessage === "function"
    ) {
      return {
        provider: signerObj.provider as EthereumProvider,
        getAddress: signerObj.getAddress() ,
        signMessage: signerObj.signMessage as (
          message: string
        ) => Promise<string>,
        connect:
          typeof signerObj.connect === "function"
            ? (signerObj.connect as (
                provider: EthereumProvider
              ) => WalletSigner)
            : undefined,
        getNonce:
          typeof signerObj.getNonce === "function"
            ? (signerObj.getNonce as (blockTag?: string) => Promise<number>)
            : undefined,
        signTransaction:
          typeof signerObj.signTransaction === "function"
            ? (signerObj.signTransaction as (
                transaction: unknown
              ) => Promise<string>)
            : undefined,
        sendTransaction:
          typeof signerObj.sendTransaction === "function"
            ? (signerObj.sendTransaction as (
                transaction: unknown
              ) => Promise<unknown>)
            : undefined,
      };
    }

    return undefined;
  }
}