import { EthereumProvider } from "@/types/provider";
import { WalletDetector } from "../types";

interface TrustProvider extends EthereumProvider {
  isTrustWallet?: boolean;
  isTrust?: boolean;
}

export class TrustDetector implements WalletDetector {
  id = "trustWallet";
  name = "Trust Wallet";
  rdns = "com.trustwallet.app";

  detect(provider: EthereumProvider): boolean {
    const trustProvider = provider as TrustProvider;
    return Boolean(trustProvider.isTrustWallet || trustProvider.isTrust);
  }

  getIcon(): string {
    return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiMzMzc1QkIiLz4KPC9zdmc+";
  }
}