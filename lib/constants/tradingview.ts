// Crypto Market Overview Widget Configuration
export const CRYPTO_MARKET_OVERVIEW_CONFIG = {
  colorTheme: 'light',
  dateRange: '12M',
  showChart: true,
  locale: 'en',
  largeChartUrl: '',
  isTransparent: true,
  showSymbolLogo: true,
  showFloatingTooltip: true,
  width: '100%',
  height: 600,
  plotLineColorGrowing: '#26a69a',
  plotLineColorFalling: '#ef5350',
  gridLineColor: 'rgba(240, 243, 250, 0)',
  scaleFontColor: '#666666',
  belowLineFillColorGrowing: 'rgba(38, 166, 154, 0.12)',
  belowLineFillColorFalling: 'rgba(239, 83, 80, 0.12)',
  belowLineFillColorGrowingBottom: 'rgba(38, 166, 154, 0)',
  belowLineFillColorFallingBottom: 'rgba(239, 83, 80, 0)',
  symbolActiveColor: 'rgba(38, 166, 154, 0.05)',
  tabs: [
    {
      title: 'DeFi',
      symbols: [
        { s: 'BINANCE:UNIUSDT', d: 'Uniswap' },
        { s: 'BINANCE:AAVEUSDT', d: 'Aave' },
        { s: 'BINANCE:COMPUSDT', d: 'Compound' },
        { s: 'BINANCE:MKRUSDT', d: 'Maker' },
        { s: 'BINANCE:YFIUSDT', d: 'yearn.finance' },
        { s: 'BINANCE:SNXUSDT', d: 'Synthetix' },
      ],
    },
    {
      title: 'Layer 1',
      symbols: [
        { s: 'BINANCE:ETHUSDT', d: 'Ethereum' },
        { s: 'BINANCE:SOLUSDT', d: 'Solana' },
        { s: 'BINANCE:AVAXUSDT', d: 'Avalanche' },
        { s: 'BINANCE:MATICUSDT', d: 'Polygon' },
        { s: 'BINANCE:DOTUSDT', d: 'Polkadot' },
        { s: 'BINANCE:ATOMUSDT', d: 'Cosmos' },
      ],
    },
    {
      title: 'Layer 2 & Scaling',
      symbols: [
        { s: 'BINANCE:OPUSDT', d: 'Optimism' },
        { s: 'BINANCE:ARBUSDT', d: 'Arbitrum' },
        { s: 'BINANCE:IMXUSDT', d: 'Immutable X' },
        { s: 'BINANCE:MATICUSDT', d: 'Polygon' },
        { s: 'BINANCE:LRCUSDT', d: 'Loopring' },
        { s: 'BINANCE:GMTUSDT', d: 'Stepn' },
      ],
    },
  ],
};

// Crypto Heatmap Widget Configuration
export const CRYPTO_HEATMAP_CONFIG = {
  dataSource: 'Crypto',
  blockSize: 'market_cap',
  blockColor: 'change',
  grouping: 'sector',
  isTransparent: true,
  locale: 'en',
  symbolUrl: '',
  colorTheme: 'light',
  hasTopBar: false,
  isDataSetEnabled: false,
  isZoomEnabled: true,
  hasSymbolTooltip: true,
  width: '100%',
  height: 600,
};

// Top Cryptocurrencies Widget Configuration
export const TOP_CRYPTO_CONFIG = {
  symbols: [
    {
      description: '',
      proName: 'BINANCE:BTCUSDT',
    },
    {
      description: '',
      proName: 'BINANCE:ETHUSDT',
    },
    {
      description: '',
      proName: 'COINBASE:SOLUSD',
    },
    {
      description: '',
      proName: 'BINANCE:BNBUSDT',
    },
    {
      description: '',
      proName: 'BINANCE:XRPUSDT',
    },
    {
      description: '',
      proName: 'BINANCE:ADAUSDT',
    },
    {
      description: '',
      proName: 'BINANCE:AVAXUSDT',
    },
    {
      description: '',
      proName: 'BINANCE:DOTUSDT',
    },
    {
      description: '',
      proName: 'BINANCE:MATICUSDT',
    },
    {
      description: '',
      proName: 'BINANCE:LINKUSDT',
    },
  ],
  showSymbolLogo: true,
  colorTheme: 'light',
  isTransparent: true,
  displayMode: 'adaptive',
  width: '100%',
  height: 600,
  locale: 'en',
};

// Crypto Screener Widget Configuration
export const CRYPTO_SCREENER_CONFIG = {
  width: '100%',
  height: 600,
  defaultColumn: 'overview',
  screener_type: 'crypto_mkt',
  displayCurrency: 'USD',
  colorTheme: 'light',
  locale: 'en',
  isTransparent: true,
};

// Advanced Chart Widget Configuration for specific crypto
export const CRYPTO_CHART_CONFIG = (symbol: string) => ({
  autosize: true,
  symbol: symbol.toUpperCase(),
  interval: 'D',
  timezone: 'Etc/UTC',
  theme: 'light',
  style: '1',
  locale: 'en',
  enable_publishing: false,
  allow_symbol_change: true,
  calendar: false,
  support_host: 'https://www.tradingview.com',
  height: 600,
  width: '100%',
});

// Market Data Widget Configuration
export const CRYPTO_MARKET_DATA_CONFIG = {
  symbolsGroups: [
    {
      name: 'DeFi Giants',
      symbols: [
        { name: 'BINANCE:UNIUSDT', displayName: 'Uniswap' },
        { name: 'BINANCE:AAVEUSDT', displayName: 'Aave' },
        { name: 'BINANCE:COMPUSDT', displayName: 'Compound' },
        { name: 'BINANCE:MKRUSDT', displayName: 'Maker' },
        { name: 'BINANCE:YFIUSDT', displayName: 'yearn.finance' },
        { name: 'BINANCE:CRVUSDT', displayName: 'Curve DAO' },
      ],
    },
    {
      name: 'Layer 1 Leaders',
      symbols: [
        { name: 'BINANCE:ETHUSDT', displayName: 'Ethereum' },
        { name: 'BINANCE:SOLUSDT', displayName: 'Solana' },
        { name: 'BINANCE:AVAXUSDT', displayName: 'Avalanche' },
        { name: 'BINANCE:DOTUSDT', displayName: 'Polkadot' },
        { name: 'BINANCE:ATOMUSDT', displayName: 'Cosmos' },
        { name: 'BINANCE:ALGOUSDT', displayName: 'Algorand' },
      ],
    },
    {
      name: 'Hot Trending',
      symbols: [
        { name: 'BINANCE:PEPEUSDT', displayName: 'Pepe' },
        { name: 'BINANCE:FLOKIUSDT', displayName: 'Floki' },
        { name: 'BINANCE:DOGEUSDT', displayName: 'Dogecoin' },
        { name: 'BINANCE:SHIBUSDT', displayName: 'Shiba Inu' },
        { name: 'BINANCE:GALAUSDT', displayName: 'Gala' },
        { name: 'BINANCE:AXSUSDT', displayName: 'Axie Infinity' },
      ],
    },
  ],
  showSymbolLogo: true,
  colorTheme: 'light',
  isTransparent: true,
  displayMode: 'adaptive',
  width: '100%',
  height: 600,
  locale: 'en',
};

// Technical Analysis Widget Configuration
export const CRYPTO_TECHNICAL_ANALYSIS_CONFIG = (symbol: string) => ({
  interval: '1h',
  width: '100%',
  isTransparent: true,
  height: 400,
  symbol: symbol.toUpperCase(),
  showIntervalTabs: true,
  displayMode: 'single',
  locale: 'en',
  colorTheme: 'light',
});

// Symbol Info Widget Configuration
export const CRYPTO_SYMBOL_INFO_CONFIG = (symbol: string) => ({
  symbol: symbol.toUpperCase(),
  width: '100%',
  isTransparent: true,
  height: 170,
  colorTheme: 'light',
  locale: 'en',
});