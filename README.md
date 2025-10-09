# 🚀 YC Project - ETH Staking Platform

一个基于区块链的 **ETH 质押挖矿平台**，用户可以质押 ETH 来赚取 MetaNode 代币奖励。

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Ethereum](https://img.shields.io/badge/Ethereum-Sepolia-blue)
![Wagmi](https://img.shields.io/badge/Wagmi-2.x-orange)
![Viem](https://img.shields.io/badge/Viem-2.x-purple)

## ✨ 特性

- 🔗 **多钱包支持** - MetaMask, WalletConnect, Coinbase Wallet 等
- 💰 **ETH 质押** - 质押 ETH 赚取 MetaNode 代币奖励
- ⏰ **智能冷却机制** - 区块级精度的解质押冷却时间
- 📊 **实时数据同步** - 区块链状态实时更新
- 🎨 **现代化 UI** - 基于 Shadcn/ui 和 Tailwind CSS
- 📱 **响应式设计** - 完美的移动端体验
- 🛡️ **安全可靠** - 多重安全检查和验证机制

## 🏗️ 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **UI**: Shadcn/ui + Radix UI + Tailwind CSS
- **区块链**: Viem + Wagmi + RainbowKit
- **状态管理**: React Hooks + Context
- **样式**: Tailwind CSS
- **网络**: Sepolia 测试网

## 🚀 快速开始

### 环境要求

- Node.js 18.0+
- npm/yarn/pnpm

### 安装依赖

```bash
# 使用 npm
npm install

# 或使用 yarn
yarn install

# 或使用 pnpm
pnpm install
```

### 环境配置

创建 `.env.local` 文件并配置以下环境变量：

```env
# 合约配置
NEXT_PUBLIC_CONTRACT_ADDRESS=0x5cE3E2e0a0d2a6E5eE5B4A6c5E5D3D3B3F3E3E3F
NEXT_PUBLIC_NETWORK_ID=11155111

# RPC 配置
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# 功能开关
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_DEBUG=false
```

### 启动开发服务器

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

## 📖 使用说明

### 1. 连接钱包

点击页面右上角的"连接钱包"按钮，选择您的钱包（推荐使用 MetaMask）。

### 2. 质押 ETH

1. 在质押页面输入要质押的 ETH 数量
2. 确保钱包中有足够的 ETH 余额
3. 点击"Stake ETH"按钮
4. 在钱包中确认交易

### 3. 赚取奖励

- 奖励会根据您的质押数量和时间自动累积
- 可以随时点击"Claim Rewards"领取奖励
- 奖励以 MetaNode 代币形式发放

### 4. 解质押和提取

1. 前往解质押页面
2. 输入要解质押的 ETH 数量
3. 等待冷却时间结束（约 1000 个区块）
4. 冷却结束后点击"Withdraw ETH"提取到钱包

## 🎯 核心功能

### 质押功能
- 支持 ETH 质押到智能合约
- 实时显示质押余额和奖励
- 最小质押金额限制
- 交易状态实时反馈

### 解质押机制
- 申请解质押后进入冷却期
- 区块级精度的冷却时间计算
- 本地存储 + 事件日志双重数据源
- 实时倒计时显示

### 安全特性
- 多重安全检查机制
- 交易前状态验证
- 异常数据自动修复
- 完善的错误处理

## 📊 项目结构

```
my-app/
├── app/                    # Next.js App Router
│   ├── (root)/
│   │   ├── page.tsx       # 主页 - 质押界面
│   │   └── withdraw/      # 解质押页面
│   └── api/               # API 路由
├── components/            # React 组件
│   ├── ui/               # UI 基础组件
│   ├── CooldownTimer.tsx # 冷却计时器
│   └── ContractStatusPanel.tsx
├── hooks/                # 自定义 Hooks
│   ├── useStakingContract.ts # 质押合约交互
│   └── usePublicClient.ts
├── lib/                  # 工具库
│   ├── abi/             # 智能合约 ABI
│   └── utils.ts
├── provider/            # Context Provider
└── public/             # 静态资源
```

## 🔧 开发

### 可用脚本

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 代码检查
npm run lint
```

### 技术文档

详细的技术文档请查看 [Stake_Project_Documentation.md](./Stake_Project_Documentation.md)

### 合约信息

- **合约地址**: `0x5cE3E2e0a0d2a6E5eE5B4A6c5E5D3D3B3F3E3E3F`
- **网络**: Sepolia 测试网
- **代币**: MetaNode (MN)
- **代币水龙头**: [Sepolia Faucet](https://sepoliafaucet.com/)

## 🛠️ 故障排除

### 常见问题

**Q: 连接钱包失败怎么办？**
A: 确保钱包已安装并解锁，网络切换到 Sepolia 测试网。

**Q: 交易失败的原因？**
A: 检查钱包余额是否充足，网络是否正确，gas 费用是否足够。

**Q: 冷却时间过长？**
A: Sepolia 测试网出块时间约 12 秒，1000 个区块约需要 3.3 小时。

**Q: 奖励显示异常？**
A: 测试网奖励数值可能较大，前端已自动缩放显示。

### 调试模式

开启调试模式获取更多信息：

```typescript
// 在组件中调用
debugContract();
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 联系我们

- 项目地址: [GitHub Repository]
- 技术文档: [Documentation Site]
- 社区讨论: [Discord/Telegram]

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React 框架
- [Viem](https://viem.sh/) - 以太坊交互库
- [Wagmi](https://wagmi.sh/) - React Hooks for Ethereum
- [RainbowKit](https://www.rainbowkit.com/) - 钱包连接库
- [Shadcn/ui](https://ui.shadcn.com/) - UI 组件库

---

⭐ 如果这个项目对您有帮助，请给我们一个 Star！
