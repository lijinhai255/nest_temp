"use client";

import WallerProvider from "@/provider/index";
import { chains, walletList } from "@/wagmi";
import { useEffect, useState } from "react";
import { ChainInfo, EthereumProvider, WalletGroup } from "@/types/provider";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<EthereumProvider | undefined>(
    undefined
  );

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const ethereum = window.ethereum as EthereumProvider;
      setProvider(ethereum);
    }
  }, []);

  return (
    <main className="font-work-sans">
      {provider ? (
        <WallerProvider
          chains={chains as unknown as ChainInfo[]}
          provider={provider}
          wallets={walletList as unknown as WalletGroup[]}
        >
          {children}
        </WallerProvider>
      ) : (
        <div>{children}</div>
      )}
    </main>
  );
}
