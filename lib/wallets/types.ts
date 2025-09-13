import { EthereumProvider } from "@/types/provider";

export interface WalletDetector {
  id: string;
  name: string;
  rdns: string;
  detect(provider: EthereumProvider): boolean;
  getIcon?(): string;
}

export interface WalletConfig {
  id: string;
  name: string;
  rdns: string;
  icon?: string;
  detector: WalletDetector;
}
