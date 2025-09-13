import { EthereumProvider } from "@/types/provider";
import { WalletDetector } from "../types";

interface RabbyProvider extends EthereumProvider {
  isRabby?: boolean;
}

export class RabbyDetector implements WalletDetector {
  id = "rabby";
  name = "Rabby Wallet";
  rdns = "io.rabby";

  detect(provider: EthereumProvider): boolean {
    const rabbyProvider = provider as RabbyProvider;
    return Boolean(rabbyProvider.isRabby);
  }

  getIcon(): string {
    return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiM3MDg0RkYiLz4KPC9zdmc+";
  }
}