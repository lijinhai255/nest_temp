'use client';

import TradingViewWidget from "@/components/TradingViewWidget";
import {
  CRYPTO_MARKET_OVERVIEW_CONFIG,
  CRYPTO_HEATMAP_CONFIG,
  CRYPTO_SCREENER_CONFIG,
} from "@/lib/constants/tradingview";

const ExplorePage = () => {
  const scriptUrl = `https://s3.tradingview.com/external-embedding/embed-widget-`;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            🔍 Explore Crypto Market
          </h1>
          <p className="text-xl text-foreground max-w-2xl mx-auto">
            Discover trading opportunities with real-time market data, advanced charts, and comprehensive analysis tools
          </p>
        </div>

        {/* Market Overview Section */}
        <section className="mb-12">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="order-1 xl:order-1">
              <TradingViewWidget
                title="🌟 Crypto Market Overview"
                scriptUrl={`${scriptUrl}market-overview.js`}
                config={CRYPTO_MARKET_OVERVIEW_CONFIG}
                height={650}
                className="rounded-xl border border bg-card"
              />
            </div>
            <div className="order-2 xl:order-2">
              <TradingViewWidget
                title="🔥 Crypto Heatmap"
                scriptUrl={`${scriptUrl}stock-heatmap.js`}
                config={CRYPTO_HEATMAP_CONFIG}
                height={650}
                className="rounded-xl border border bg-card"
              />
            </div>
          </div>
        </section>

        {/* Crypto Screener */}
        <section className="mb-12">
          <TradingViewWidget
            title="🎯 Advanced Crypto Screener"
            scriptUrl={`${scriptUrl}screener.js`}
            config={CRYPTO_SCREENER_CONFIG}
            height={800}
            className="rounded-xl border border bg-card"
          />
        </section>

        {/* Info Section */}
        <section className="text-center py-12">
          <div className="bg-primary/10 rounded-2xl p-8 border border-primary/20">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              📊 Professional Trading Tools
            </h2>
            <p className="text-lg text-foreground mb-6 max-w-3xl mx-auto">
              Access institutional-grade trading widgets, real-time market data, and advanced technical analysis
              to make informed trading decisions in the dynamic cryptocurrency market.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="text-center">
                <div className="text-4xl mb-3">📈</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Real-time Data</h3>
                <p className="text-foreground/80">Live market data from multiple exchanges</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🎯</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Advanced Tools</h3>
                <p className="text-foreground/80">Professional screener and analysis tools</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🔒</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Secure & Reliable</h3>
                <p className="text-foreground/80">Enterprise-grade data infrastructure</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ExplorePage;