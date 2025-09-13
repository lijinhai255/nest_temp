import { EthereumProvider } from "@/types/provider";
import { WalletDetector } from "../types";

interface CoinbaseProvider extends EthereumProvider {
  isCoinbaseWallet?: boolean;
  selectedProvider?: {
    isCoinbaseWallet?: boolean;
  };
}

export class CoinbaseDetector implements WalletDetector {
  id = "coinbaseWallet";
  name = "Coinbase Wallet";
  rdns = "com.coinbase.wallet";

  detect(provider: EthereumProvider): boolean {
    const coinbaseProvider = provider as CoinbaseProvider;
    return Boolean(
      coinbaseProvider.isCoinbaseWallet ||
      coinbaseProvider.selectedProvider?.isCoinbaseWallet
    );
  }

  getIcon(): string {
    return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiMwMDUyRkYiLz4KPC9zdmc+";
  }
}