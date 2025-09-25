"use client";

import WallerProvider from "@/provider/index";
import { chains, walletList } from "@/wagmi";
import { useEffect, useState, Suspense } from "react";
import { ChainInfo, EthereumProvider, WalletGroup } from "@/types/provider";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/provider/toaster";

// 导航栏加载状态组件
function NavbarFallback() {
  return (
    <header className="px-5 py-3 shadow-sm font-work-sans text-muted-foreground">
      <nav className="flex justify-between items-center">
        <div className="w-[120px] h-[30px] bg-gray-200 animate-pulse rounded" />
        <div className="flex items-center gap-5">
          <div className="w-12 h-6 bg-gray-200 animate-pulse rounded" />
          <div className="w-12 h-6 bg-gray-200 animate-pulse rounded" />
          <div className="w-8 h-8 bg-gray-200 animate-pulse rounded-full" />
          <div className="w-24 h-10 bg-gray-200 animate-pulse rounded-full" />
        </div>
      </nav>
    </header>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<EthereumProvider | undefined>(undefined);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined" && window.ethereum) {
      const ethereum = window.ethereum as EthereumProvider;
      setProvider(ethereum);
    }
  }, []);

  // 服务端渲染时显示骨架屏
  if (!isMounted) {
    return (
      <main className="font-work-sans bg-background">
        <NavbarFallback />
        {children}
      </main>
    );
  }

  return (
    <main className="font-work-sans bg-background">
      {provider ? (
        <WallerProvider
          chains={chains as unknown as ChainInfo[]}
          provider={provider}
          wallets={walletList as unknown as WalletGroup[]}
        >
          <Suspense fallback={<NavbarFallback />}>
            <Navbar />
          </Suspense>
          {children}
          <Toaster />
        </WallerProvider>
      ) : (
        <main className="font-work-sans bg-background">
          <NavbarFallback />
          {children}
        </main>
      )}
    </main>
  );
}
