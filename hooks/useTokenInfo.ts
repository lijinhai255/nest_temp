// hooks/useTokenInfo.ts
import { useState, useEffect, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { Address, isAddress } from 'viem';
import { Token } from '@/types/addPosition';

const ERC20_ABI = [
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

// 原生代币信息
const NATIVE_TOKEN_INFO: Record<number, Token> = {
  1: { // Ethereum Mainnet
    address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address,
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    isNative: true,
  },
  // 可以添加其他链的原生代币
};

export const useTokenInfo = (tokenAddress?: Address) => {
  const [tokenInfo, setTokenInfo] = useState<Token | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publicClient = usePublicClient();

  const isNativeToken = (address?: Address): boolean => {
    if (!address) return false;
    return (
      address.toLowerCase() === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'.toLowerCase() ||
      address.toLowerCase() === '0x0000000000000000000000000000000000000000'.toLowerCase()
    );
  };

  const fetchTokenInfo = useCallback(async () => {
    if (!tokenAddress || !publicClient) {
      setTokenInfo(null);
      return;
    }

    if (!isAddress(tokenAddress)) {
      setError('Invalid token address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 检查是否是原生代币
      if (isNativeToken(tokenAddress)) {
        const chainId = await publicClient.getChainId();
        const nativeToken = NATIVE_TOKEN_INFO[chainId] || {
          address: tokenAddress,
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
          isNative: true,
        };
        setTokenInfo(nativeToken);
        return;
      }

      // 获取 ERC20 代币信息
      const [symbol, name, decimals] = await Promise.all([
        publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'symbol',
        }),
        publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'name',
        }),
        publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }),
      ]);

      setTokenInfo({
        address: tokenAddress,
        symbol: symbol as string,
        name: name as string,
        decimals: decimals as number,
        isNative: false,
      });

    } catch (err) {
      console.error('Error fetching token info:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch token info');
      
      // 设置默认信息作为后备
      setTokenInfo({
        address: tokenAddress,
        symbol: `${tokenAddress.substring(0, 6)}...`,
        name: `Token ${tokenAddress.substring(0, 8)}...`,
        decimals: 18,
        isNative: false,
      });
    } finally {
      setIsLoading(false);
    }
  }, [tokenAddress, publicClient]);

  useEffect(() => {
    fetchTokenInfo();
  }, [fetchTokenInfo]);

  return {
    tokenInfo,
    isLoading,
    error,
    refetch: fetchTokenInfo,
  };
};

// 批量获取多个代币信息
export const useMultipleTokenInfo = (tokenAddresses: Address[]) => {
  const [tokensInfo, setTokensInfo] = useState<Record<string, Token>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publicClient = usePublicClient();

  const fetchAllTokensInfo = useCallback(async () => {
    if (!publicClient || tokenAddresses.length === 0) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const tokenPromises = tokenAddresses.map(async (address) => {
        try {
          // 检查是否是原生代币
          if (address.toLowerCase() === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'.toLowerCase()) {
            const chainId = await publicClient.getChainId();
            return {
              address,
              info: NATIVE_TOKEN_INFO[chainId] || {
                address,
                symbol: 'ETH',
                name: 'Ethereum',
                decimals: 18,
                isNative: true,
              }
            };
          }

          // 获取 ERC20 代币信息
          const [symbol, name, decimals] = await Promise.all([
            publicClient.readContract({
              address,
              abi: ERC20_ABI,
              functionName: 'symbol',
            }),
            publicClient.readContract({
              address,
              abi: ERC20_ABI,
              functionName: 'name',
            }),
            publicClient.readContract({
              address,
              abi: ERC20_ABI,
              functionName: 'decimals',
            }),
          ]);

          return {
            address,
            info: {
              address,
              symbol: symbol as string,
              name: name as string,
              decimals: decimals as number,
              isNative: false,
            }
          };
        } catch (error) {
          console.error(`Error fetching info for ${address}:`, error);
          return {
            address,
            info: {
              address,
              symbol: `${address.substring(0, 6)}...`,
              name: `Token ${address.substring(0, 8)}...`,
              decimals: 18,
              isNative: false,
            }
          };
        }
      });

      const results = await Promise.all(tokenPromises);
      const infoMap = results.reduce((acc, { address, info }) => {
        acc[address] = info;
        return acc;
      }, {} as Record<string, Token>);

      setTokensInfo(infoMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tokens info');
    } finally {
      setIsLoading(false);
    }
  }, [tokenAddresses, publicClient]);

  useEffect(() => {
    fetchAllTokensInfo();
  }, [fetchAllTokensInfo]);

  return {
    tokensInfo,
    isLoading,
    error,
    refetch: fetchAllTokensInfo,
  };
};
