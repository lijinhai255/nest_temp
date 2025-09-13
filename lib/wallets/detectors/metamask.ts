import { EthereumProvider } from "@/types/provider";
import { WalletDetector } from "../types";

interface MetaMaskProvider extends EthereumProvider {
  isMetaMask?: boolean;
  _metamask?: {
    isUnlocked(): Promise<boolean>;
  };
}

export class MetaMaskDetector implements WalletDetector {
  id = "metamask";
  name = "MetaMask";
  rdns = "io.metamask";

  detect(provider: EthereumProvider): boolean {
    const metamaskProvider = provider as MetaMaskProvider;
    return Boolean(metamaskProvider.isMetaMask);
  }

  getIcon(): string {
    return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTI2LjY2NjcgNC4wMDA2N0wyMC4wMDAxIDkuMzMzMzRMMjEuMzMzNCA2LjAwMDY3TDI2LjY2NjcgNC4wMDA2N1oiIGZpbGw9IiNFMjc2MkQiLz4KPC9zdmc+";
  }
}