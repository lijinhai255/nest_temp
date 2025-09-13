import { ChainConfig } from "@/components/ChainSwitcher";

export const formatAddress = (
  addr: string,
  type: "full" | "address" | "avatar" | "none"
) => {
  if (!addr) return "";

  switch (type) {
    case "full":
      return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
    case "address":
      return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
    case "avatar":
      return addr.substring(0, 4);
    case "none":
      return "";
    default:
      return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  }
};

export const formatBalance = (bal: string) => {
  const num = parseFloat(bal);
  if (num === 0) return "0.0000";
  if (num < 0.0001) return "< 0.0001";
  return num.toFixed(4);
};

export const getCurrentChain = (
  chainID: string,
  supportedChains: ChainConfig[]
): ChainConfig | undefined => {
  if (!chainID) return undefined;
  return supportedChains.find((chain) => chain.id === parseInt(chainID));
};

export const getFilteredChains = (
  supportedChains: ChainConfig[],
  showTestnets: boolean
): ChainConfig[] => {
  const testnetIds = [11155111, 5, 80001]; // Sepolia, Goerli, Mumbai

  if (showTestnets) {
    return supportedChains;
  }

  return supportedChains.filter((chain) => !testnetIds.includes(chain.id));
};

export const viewOnExplorer = (
  address: string,
  currentChain?: ChainConfig
) => {
  if (address) {
    const baseUrl =
      currentChain?.blockExplorerUrls?.[0] || "https://etherscan.io";
    window.open(`${baseUrl}/address/${address}`, "_blank");
  }
};
