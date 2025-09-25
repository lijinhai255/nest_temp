"use client";

import React from 'react';
import WalletDebugPanel from './WalletDebugPanel';

interface WalletDebugWrapperProps {
  children: React.ReactNode;
}

const WalletDebugWrapper: React.FC<WalletDebugWrapperProps> = ({ children }) => {
  // 仅在开发环境显示调试面板
  if (process.env.NODE_ENV === 'development') {
    return (
      <>
        {children}
        <WalletDebugPanel />
      </>
    );
  }

  return <>{children}</>;
};

export default WalletDebugWrapper;