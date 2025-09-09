// 合约地址 - 这里使用示例地址，实际使用时需要替换为真实部署的合约地址
export const RccStakeContract = "0x1234567890123456789012345678901234567890"; // 替换为实际的合约地址

// 可以添加其他网络的合约地址
export const contractAddresses = {
  // 主网
  mainnet: {
    stakeContract: "0x0000000000000000000000000000000000000000", // 替换为主网合约地址
  },
  // Sepolia 测试网
  sepolia: {
    stakeContract: "0x1234567890123456789012345678901234567890", // 替换为 Sepolia 测试网合约地址
  },
  // 其他网络...
};

// 其他合约相关的工具函数
export const getContractAddress = (networkId: number) => {
  switch (networkId) {
    case 1: // Ethereum Mainnet
      return contractAddresses.mainnet;
    case 11155111: // Sepolia Testnet
      return contractAddresses.sepolia;
    default:
      throw new Error(`Network with id ${networkId} not supported`);
  }
};