// utils/tokenUtils.ts
import { Address } from 'viem';

// 代币信息配置
export const TOKEN_INFO: Record<string, { symbol: string; name: string; decimals: number }> = {
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE": { 
    symbol: "ETH", 
    name: "Ethereum", 
    decimals: 18 
  },
  "0x0000000000000000000000000000000000000000": { 
    symbol: "ETH", 
    name: "Ethereum", 
    decimals: 18 
  },
  "0xEaaAbd33D863Ee55BD41706E977e97CCE6dBd0d0": { 
    symbol: "MyTokenC", 
    name: "My Token C", 
    decimals: 18 
  },
  
  "0xD61bfEBA1E28356e653977E4fC5AA82F25396256": { 
    symbol: "MyTokenA", 
    name: "My Token A", 
    decimals: 18 
  },
  "0xbe04b4418BF39066628CCf1e7f8f0aEcC8139E6F": { 
    symbol: "MyTokenB", 
    name: "My Token B",
    decimals: 18
  },
    "0xCf7D10bB0bF822857c91b381c68a555bEB2955f4": { 
    symbol: "MyTokenD", 
    name:"My Token D",
    decimals: 18
  },
  "0x094C27cf4418De2ea944F39d636f059Bf140549c":{
    symbol: "MyTokenE", 
    name: "My Token E", 
    decimals: 18 
  },
  "0x7B5Bcf8E85106d9fc9623816936Ba6a95Dd25A4E":{
     symbol: "MyTokenF", 
    name: "My Token F", 
    decimals: 18 
  },
  // 添加你现有的代币
  "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2": {
    symbol: "WETH",
    name: "Wrapped Ethereum",
    decimals: 18
  },
  "0xdAC17F958D2ee523a2206206994597C13D831ec7": {
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6
  },
  "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599": {
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    decimals: 8
  },
};

// 获取代币信息
export const getTokenInfo = (address: Address): { symbol: string; name: string; decimals: number; isNative: boolean } => {
  const info = TOKEN_INFO[address] || {
    symbol: `${address.substring(0, 6)}...`,
    name: `Token ${address.substring(0, 8)}...`,
    decimals: 18,
  };
  
  const isNative = address === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" || 
                   address === "0x0000000000000000000000000000000000000000";
  
  return { ...info, isNative };
};

// 获取友好的地址显示
export const getFormattedAddress = (address: string) => {
  const tokenInfo = getTokenInfo(address as Address);
  if (tokenInfo.name !== `Token ${address.substring(0, 8)}...`) {
    return tokenInfo.name;
  }
  return `${address.substring(0, 6)}...${address.substring(38)}`;
};

// 获取代币显示名称
export const getTokenDisplayName = (address: string) => {
  const tokenInfo = getTokenInfo(address as Address);
  return tokenInfo.symbol;
};

// 检查是否为原生代币
export const isNativeToken = (address: string): boolean => {
  return address === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" || 
         address === "0x0000000000000000000000000000000000000000";
};

// 获取代币图标
export const getTokenIcon = (address: string): string => {
  const tokenInfo = getTokenInfo(address as Address);
  
  // 根据代币类型返回不同图标
  if (tokenInfo.isNative) return "⟠";
  if (tokenInfo.symbol === "USDT") return "₮";
  if (tokenInfo.symbol === "WBTC") return "₿";
  if (tokenInfo.symbol.includes("MyToken")) return "🪙";
  
  return "🔵"; // 默认图标
};

// 获取代币颜色
export const getTokenColor = (address: string): string => {
  const tokenInfo = getTokenInfo(address as Address);
  
  if (tokenInfo.isNative) return "bg-blue-600";
  if (tokenInfo.symbol === "USDT") return "bg-green-600";
  if (tokenInfo.symbol === "WBTC") return "bg-orange-500";
  if (tokenInfo.symbol === "MyTokenA") return "bg-purple-600";
  if (tokenInfo.symbol === "MyTokenB") return "bg-pink-600";
  if (tokenInfo.symbol === "MyTokenC") return "bg-indigo-600";
  
  return "bg-gray-600"; // 默认颜色
};
