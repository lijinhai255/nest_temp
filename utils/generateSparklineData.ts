// 生成模拟的价格数据用于 sparkline 图表
export const generateSparklineData = (basePrice: number = 1, volatility: number = 0.02, length: number = 24): number[] => {
  const data: number[] = [];
  let currentPrice = basePrice;

  for (let i = 0; i < length; i++) {
    // 生成随机波动
    const change = (Math.random() - 0.5) * 2 * volatility;
    currentPrice = currentPrice * (1 + change);

    // 确保价格不会变成负数
    currentPrice = Math.max(currentPrice, 0.01);

    data.push(currentPrice);
  }

  return data;
};

// 根据代币对生成不同特征的数据
export const generateTokenPairSparklineData = (token0Symbol: string, token1Symbol: string): number[] => {
  // 根据不同的代币对生成不同特征的模拟数据
  const basePrice = 1 + Math.random() * 2; // 1-3 的基础价格
  const volatility = 0.01 + Math.random() * 0.03; // 1-4% 的波动率

  // 为某些代币对添加特定的模式
  const pairKey = `${token0Symbol}/${token1Symbol}`.toLowerCase();

  let data = generateSparklineData(basePrice, volatility);

  // 为特定代币对添加趋势
  if (pairKey.includes('eth') || pairKey.includes('btc')) {
    // 主要加密货币通常有更强的趋势
    const trend = Math.random() > 0.5 ? 1 : -1;
    data = data.map((value, index) => value * (1 + trend * 0.001 * index));
  }

  return data;
};

// 获取 sparkline 颜色基于价格变化
export const getSparklineColor = (data: number[]): string => {
  if (data.length < 2) return '#10b981'; // 默认绿色

  const firstPrice = data[0];
  const lastPrice = data[data.length - 1];

  return lastPrice >= firstPrice ? '#10b981' : '#ef4444'; // 绿色上涨，红色下跌
};