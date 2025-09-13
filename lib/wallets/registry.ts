import { WalletConfig } from "./types";
import { MetaMaskDetector } from "./detectors/metamask";
import { OKXDetector } from "./detectors/okx";
import { CoinbaseDetector } from "./detectors/coinbase";
import { RabbyDetector } from "./detectors/rabby";
import { TrustDetector } from "./detectors/trust";


// 注册所有支持的钱包
export const WALLET_REGISTRY: WalletConfig[] = [
  {
    id: "metamask",
    name: "MetaMask",
    rdns: "io.metamask",
    detector: new MetaMaskDetector(),
  },
  {
    id: "okx",
    name: "OKX Wallet", 
    rdns: "com.okx.wallet",
    detector: new OKXDetector(),
  },
  {
    id: "coinbaseWallet",
    name: "Coinbase Wallet",
    rdns: "com.coinbase.wallet", 
    detector: new CoinbaseDetector(),
  },
  {
    id: "rabby",
    name: "Rabby Wallet",
    rdns: "io.rabby",
    detector: new RabbyDetector(),
  },
  {
    id: "trustWallet", 
    name: "Trust Wallet",
    rdns: "com.trustwallet.app",
    detector: new TrustDetector(),
  },
];

// 根据 ID 获取钱包配置
export function getWalletConfig(id: string): WalletConfig | undefined {
  return WALLET_REGISTRY.find(wallet => wallet.id === id);
}

// 根据 RDNS 获取钱包配置
export function getWalletConfigByRdns(rdns: string): WalletConfig | undefined {
  return WALLET_REGISTRY.find(wallet => wallet.rdns === rdns);
}
