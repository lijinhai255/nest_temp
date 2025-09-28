'use client';

import { useParams } from "next/navigation";
import TradingViewWidget from "@/components/TradingViewWidget";
import {
  CRYPTO_CHART_CONFIG,
  CRYPTO_TECHNICAL_ANALYSIS_CONFIG,
  CRYPTO_SYMBOL_INFO_CONFIG,
} from "@/lib/constants/tradingview";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const CryptoDetailPage = () => {
  const params = useParams();
  const symbol = params.symbol as string;
  const scriptUrl = `https://s3.tradingview.com/external-embedding/embed-widget-`;

  if (!symbol) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">Symbol not found</h1>
          <Link
            href="/explore"
            className="text-primary hover:text-primary/80 underline"
          >
            Back to Explore
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Back Button */}
        <div className="mb-8">
          <Link
            href="/explore"
            className="inline-flex items-center text-primary hover:text-primary/80 transition-colors mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Explore
          </Link>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            📊 {symbol.toUpperCase()} Analysis
          </h1>
          <p className="text-xl text-foreground">
            Comprehensive trading analysis and real-time charts for {symbol.toUpperCase()}
          </p>
        </div>

        {/* Symbol Info and Main Chart */}
        <section className="mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
              <TradingViewWidget
                title="📋 Symbol Info"
                scriptUrl={`${scriptUrl}symbol-info.js`}
                config={CRYPTO_SYMBOL_INFO_CONFIG(symbol)}
                height={170}
                className="rounded-xl border border bg-card"
              />
            </div>
            <div className="lg:col-span-3">
              <TradingViewWidget
                title="📈 Price Chart"
                scriptUrl={`${scriptUrl}advanced-chart.js`}
                config={CRYPTO_CHART_CONFIG(`BINANCE:${symbol}USDT`)}
                height={600}
                className="rounded-xl border border bg-card"
              />
            </div>
          </div>
        </section>

        {/* Technical Analysis */}
        <section className="mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <TradingViewWidget
                title="🔧 Technical Analysis"
                scriptUrl={`${scriptUrl}technical-analysis.js`}
                config={CRYPTO_TECHNICAL_ANALYSIS_CONFIG(`BINANCE:${symbol}USDT`)}
                height={500}
                className="rounded-xl border border bg-card"
              />
            </div>
            <div>
              <TradingViewWidget
                title="📊 Alternative Chart View"
                scriptUrl={`${scriptUrl}advanced-chart.js`}
                config={{
                  ...CRYPTO_CHART_CONFIG(`BINANCE:${symbol}USDT`),
                  style: '8', // Different chart style
                }}
                height={500}
                className="rounded-xl border border bg-card"
              />
            </div>
          </div>
        </section>

        {/* Market Depth and Additional Info */}
        <section className="mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <TradingViewWidget
                title="📈 Market Overview"
                scriptUrl={`${scriptUrl}market-overview.js`}
                config={{
                  colorTheme: 'dark',
                  dateRange: '12M',
                  showChart: true,
                  locale: 'en',
                  width: '100%',
                  height: 400,
                  isTransparent: true,
                  showSymbolLogo: true,
                  tabs: [
                    {
                      title: 'Related Tokens',
                      symbols: [
                        { s: `BINANCE:${symbol}USDT`, d: symbol.toUpperCase() },
                        { s: 'BINANCE:BTCUSDT', d: 'Bitcoin' },
                        { s: 'BINANCE:ETHUSDT', d: 'Ethereum' },
                      ],
                    },
                  ],
                }}
                height={400}
                className="rounded-xl border border bg-card"
              />
            </div>
            <div>
              <div className="bg-card border border-border rounded-xl p-6 h-full">
                <h3 className="text-2xl font-bold text-foreground mb-4">💡 Trading Insights</h3>
                <div className="space-y-4 text-foreground">
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Market Sentiment</h4>
                    <p>Real-time technical analysis indicators provide insights into current market conditions and potential price movements.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Key Levels</h4>
                    <p>Support and resistance levels are automatically calculated based on historical price action and volume data.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Risk Management</h4>
                    <p>Always use proper risk management techniques and consider setting stop-loss orders when trading volatile crypto assets.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Data Source</h4>
                    <p>All data is provided in real-time from Binance exchange, one of the largest and most liquid cryptocurrency exchanges.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Related Tokens */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
            🔗 Related Trading Pairs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { symbol: 'BTCUSDT', name: 'Bitcoin' },
              { symbol: 'ETHUSDT', name: 'Ethereum' },
              { symbol: 'BNBUSDT', name: 'Binance Coin' },
              { symbol: 'SOLUSDT', name: 'Solana' },
            ].map((token) => (
              <Link
                key={token.symbol}
                href={`/explore/${token.symbol}`}
                className="block bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-all duration-300 hover:scale-105"
              >
                <h3 className="text-xl font-bold text-foreground mb-2">{token.name}</h3>
                <p className="text-lg font-mono text-green-400">{token.symbol}</p>
                <p className="text-sm text-gray-400 mt-2">Click for detailed analysis</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default CryptoDetailPage;