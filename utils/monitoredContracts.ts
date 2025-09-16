  import CryptoMonkeys from "@/lib/abi/CryptoMonkeys.json";
  import {
    AbiItem,
  } from "@/app/(root)/wagmi/components/ContractPerformanceMonitor";
  import counterABI from "@/lib/abi/Counter.json";
  import MetaNodeStake from "@/lib/abi/MetaNodeStake.json";
  import MetaNodeToken from "@/lib/abi/MetaNodeToken.json"
  const normalizeAbi = (abi: readonly Record<string, unknown>[]): AbiItem[] => {
    return abi.map((item) => ({
      ...item,
      type: String(item.type || "function") as
        | "function"
        | "event"
        | "constructor"
        | "fallback"
        | "receive"
        | "error",
    })) as AbiItem[]; // 返回 AbiItem[] 而不是 Abi
  };
// 常用测试网络的代币合约地址
export const TEST_TOKENS = {
  // Sepolia 测试网
  11155111: {
    name: "MIK (Sepolia 测试网)",
    address: "0x29c3A0FD12E14E88B73d6ff796AFEd06BF5e5d13",
    decimals: 6,
  },
  // Goerli 测试网
  5: {
    name: "USDT (测试)",
    address: "0x509Ee0d083DdF8AC028f2a56731412edD63223B9",
    decimals: 6,
  },
};
export  const monitoredContracts = [
    {
      address: MetaNodeStake.address as string,
      name: "MetaNodeStake",
      abi: normalizeAbi(MetaNodeStake.abi as readonly Record<string, unknown>[]),
    },
    {
      address: MetaNodeToken.address as string,
      name: "MetaNodeToken",
      abi: normalizeAbi(
        MetaNodeToken.abi as readonly Record<string, unknown>[]
      ),
    },
  ];