"use client";

import React, { useState } from 'react';
import WalletDebugger from '@/utils/walletDebug';

const WalletDebugPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  const handleClearStorage = () => {
    if (confirm('确定要清理所有钱包相关的存储吗？这将断开当前的钱包连接。')) {
      WalletDebugger.clearWalletStorage();
      window.location.reload();
    }
  };

  const handleShowDebug = () => {
    WalletDebugger.logDebugInfo({
      action: 'manual_debug',
      userAgent: navigator.userAgent,
      location: window.location.href
    });
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          zIndex: 9999,
          padding: '5px 10px',
          background: '#333',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        🔍 Debug
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        width: '400px',
        maxHeight: '600px',
        background: 'white',
        border: '1px solid #ccc',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 9999,
        fontFamily: 'monospace',
        fontSize: '12px'
      }}
    >
      <div
        style={{
          padding: '10px',
          borderBottom: '1px solid #eee',
          background: '#f5f5f5',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <strong>🔍 钱包调试面板</strong>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: '10px' }}>
        <div style={{ marginBottom: '10px' }}>
          <button
            onClick={handleShowDebug}
            style={{
              padding: '5px 10px',
              margin: '2px',
              background: '#007cba',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            📊 显示调试信息
          </button>

          <button
            onClick={handleClearStorage}
            style={{
              padding: '5px 10px',
              margin: '2px',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🧹 清理存储
          </button>

          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '5px 10px',
              margin: '2px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 刷新页面
          </button>
        </div>

        <div style={{ marginTop: '10px' }}>
          <strong>📋 快速检查:</strong>
          <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
            <li>
              <code>localStorage.getItem(&apos;lastConnectedWallet&apos;)</code>: {' '}
              <span style={{ color: localStorage.getItem('lastConnectedWallet') ? 'green' : 'red' }}>
                {localStorage.getItem('lastConnectedWallet') || 'null'}
              </span>
            </li>
            <li>
              <code>localStorage.getItem(&apos;walletAddress&apos;)</code>: {' '}
              <span style={{ color: localStorage.getItem('walletAddress') ? 'green' : 'red' }}>
                {localStorage.getItem('walletAddress') || 'null'}
              </span>
            </li>
            <li>
              <code>wagmi.store</code>: {' '}
              <span style={{ color: localStorage.getItem('wagmi.store') ? 'green' : 'red' }}>
                {localStorage.getItem('wagmi.store') ? '存在' : '不存在'}
              </span>
            </li>
          </ul>
        </div>

        <div style={{ marginTop: '10px', fontSize: '11px', color: '#666' }}>
          <strong>💡 提示:</strong>
          <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
            <li>查看浏览器控制台获取详细调试信息</li>
            <li>如果自动连接失败，尝试清理存储后重新连接</li>
            <li>检查钱包插件是否已启用并解锁</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WalletDebugPanel;