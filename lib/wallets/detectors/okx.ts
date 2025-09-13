import { EthereumProvider } from "@/types/provider";
import { WalletDetector } from "../types";

interface OKXProvider extends EthereumProvider {
  isOkxWallet?: boolean;
  isOKExWallet?: boolean;
}

export class OKXDetector implements WalletDetector {
  id = "okx";
  name = "OKX Wallet";
  rdns = "com.okx.wallet";

  detect(provider: EthereumProvider): boolean {
    const okxProvider = provider as OKXProvider;
    return Boolean(okxProvider.isOkxWallet || okxProvider.isOKExWallet);
  }

  getIcon(): string {
    return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzAwMCIvPgo8L3N2Zz4=";
  }
}