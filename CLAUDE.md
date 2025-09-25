# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with CSS variables
- **UI Components**: shadcn/ui (New York style)
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query) + SWR
- **Blockchain**: Wagmi v2, Viem, RainbowKit, Ethers.js v6
- **Database**: Supabase (SSR)
- **Icons**: Lucide React

## Development Commands

```bash
# Development server with Turbopack
npm run dev
# or
pnpm dev

# Build with Turbopack
npm run build

# Start production server
npm start

# Linting
npm run lint
```

## Project Architecture

### Directory Structure

- **`app/`**: Next.js App Router pages and API routes
- **`components/`**: React components organized by domain
  - **`ui/`**: shadcn/ui components
  - Domain-specific components (swap, positions, etc.)
- **`lib/`**: Utility functions and configurations
- **`hooks/`**: Custom React hooks
- **`store/`**: Zustand state management
- **`utils/`**: Helper utilities
- **`types/`**: TypeScript type definitions
- **`provider/`**: React context providers

### Blockchain Integration

The app integrates with multiple EVM chains using:
- **Supported Chains**: Sepolia, Mainnet, Polygon, Optimism, Arbitrum, Base
- **Wallets**: MetaMask, OKX Wallet, imToken, Coinbase Wallet, Trust Wallet, WalletConnect
- **Contract**: MTK_CONTRACT_ADDRESS defined in `wagmi.ts`

### Key Configuration Files

- **`wagmi.ts`**: Web3 wallet and chain configuration
- **`components.json`**: shadcn/ui component configuration
- **`tailwind.config.js`**: Tailwind CSS with custom theme

### Development Notes

- Uses Turbopack for faster development builds
- shadcn/ui components are configured with CSS variables and proper TypeScript support
- Project uses pnpm as the package manager
- Environment variables should be set in `.env.local`