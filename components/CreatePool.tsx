"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import TokenSelector from "@/components/TokenSelector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { usePoolManagerWithClients } from "@/hooks/usePoolManagerWithClients";
import { Address } from "viem";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useTokenBalance } from "@/hooks/useTokenBalance";

// Token interface
interface Token {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
}

// Simplified ERC20 token information
const TOKEN_INFO: Record<
  string,
  { symbol: string; name: string; decimals: number }
> = {
  // Common token address mappings
  "0xD61bfEBA1E28356e653977E4fC5AA82F25396256": {
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
  },
  "0x6B175474E89094C44Da98b954EedeAC495271d0F": {
    symbol: "DAI",
    name: "Dai Stablecoin",
    decimals: 18,
  },
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48": {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
  },
  "0xdAC17F958D2ee523a2206206994597C13D831ec7": {
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
  },
};

// Fee options
const FEE_OPTIONS = [
  { value: "100", label: "0.01%" },
  { value: "500", label: "0.05%" },
  { value: "3000", label: "0.3%" },
  { value: "10000", label: "1%" },
];

interface CreatePoolProps {
  onPoolCreated?: () => void;
}

export default function CreatePool({ onPoolCreated }: CreatePoolProps) {
  const { toast } = useToast();
  const {
    createAndInitializePoolIfNecessary,
    fetchPairs,
    pairs,
    isLoading,
    error,
  } = usePoolManagerWithClients();

  // States
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [token0, setToken0] = useState<Token | undefined>();
  const [token1, setToken1] = useState<Token | undefined>();

  const [fee, setFee] = useState("3000"); // Default 0.3%
  const [tickLower, setTickLower] = useState("-100000");
  const [tickUpper, setTickUpper] = useState("100000");
  const [priceRange, setPriceRange] = useState<[number, number]>([0.8, 1.2]); // Price range, relative to current price
  const [loadingTokens, setLoadingTokens] = useState(false);

  // Use custom hook to get token balances
  const {
    balance: token0Balance,
    isLoading: token0BalanceLoading,
    symbol: token0Symbol,
  } = useTokenBalance(token0?.address);

  const {
    balance: token1Balance,
    isLoading: token1BalanceLoading,
    symbol: token1Symbol,
  } = useTokenBalance(token1?.address);

  // Get available token pairs from contract
  useEffect(() => {
    const loadTokenPairs = async () => {
      try {
        setLoadingTokens(true);
        await fetchPairs();
      } catch (error) {
        console.error("Failed to fetch token pairs:", error);
        toast({
          title: "Error",
          description: "Failed to fetch token pairs",
          variant: "destructive",
        });
      } finally {
        setLoadingTokens(false);
      }
    };

    loadTokenPairs();
  }, []);

  // Handle fetched token pairs
  useEffect(() => {
    if (pairs && pairs.length > 0) {
      // Collect all unique token addresses
      const uniqueTokens = new Set<Address>();
      pairs.forEach((pair) => {
        uniqueTokens.add(pair.token0);
        uniqueTokens.add(pair.token1);
      });

      // Convert to Token objects
      const tokens: Token[] = Array.from(uniqueTokens).map((address) => {
        // Try to get token info from predefined mapping
        const info = TOKEN_INFO[address] || {
          symbol: address.substring(0, 6),
          name: `Token ${address.substring(0, 8)}...`,
          decimals: 18,
        };

        return {
          address,
          symbol: info.symbol,
          name: info.name,
          decimals: info.decimals,
        };
      });

      setAvailableTokens(tokens);

      // Set default selected tokens
      if (tokens.length >= 2 && !token0 && !token1) {
        setToken0(tokens[0]);
        setToken1(tokens[1]);
      }
    }
  }, [pairs, token0, token1]);

  // Handle token swap
  const handleSwapTokens = useCallback(() => {
    const tempToken = token0;
    setToken0(token1);
    setToken1(tempToken);
    // No need to manually swap balances as they will update automatically with token address changes
  }, [token0, token1]);

  // Handle pool creation
  const handleCreatePool = async () => {
    if (!token0 || !token1) {
      toast({
        title: "Error",
        description: "Please select two different tokens",
        variant: "destructive",
      });
      return;
    }

    if (token0.address === token1.address) {
      toast({
        title: "Error",
        description: "Cannot select the same token",
        variant: "destructive",
      });
      return;
    }

    try {
      // Calculate sqrtPriceX96
      // In real applications, this value should be calculated based on current price or user input
      // Using an example value here
      const sqrtPriceX96 = 79228162514264337593543950336n;

      // Pool creation parameters
      const params = {
        token0: token0.address,
        token1: token1.address,
        fee: parseInt(fee),
        tickLower: parseInt(tickLower),
        tickUpper: parseInt(tickUpper),
        sqrtPriceX96: sqrtPriceX96,
      };

      // Call contract method
      await createAndInitializePoolIfNecessary(params);

      toast({
        title: "Success",
        description: "Pool created successfully",
      });

      // Notify parent component to refresh list
      onPoolCreated?.();
    } catch (err) {
      console.error("Failed to create pool:", err);
      toast({
        title: "Error",
        description: error || "Failed to create pool, please try again",
        variant: "destructive",
      });
    }
  };

  // Calculate ticks corresponding to price range
  const updateTicksFromPriceRange = useCallback((range: [number, number]) => {
    // This is a simplified calculation, real applications should use more precise formulas
    // tick = log(price) * 2^23
    const lowerTick = Math.floor(Math.log(range[0]) * 2 ** 23);
    const upperTick = Math.ceil(Math.log(range[1]) * 2 ** 23);

    setTickLower(lowerTick.toString());
    setTickUpper(upperTick.toString());
  }, []);

  // Handle price range changes
  const handlePriceRangeChange = useCallback(
    (values: number[]) => {
      const newRange: [number, number] = [values[0], values[1]];
      setPriceRange(newRange);
      updateTicksFromPriceRange(newRange);
    },
    [updateTicksFromPriceRange]
  );

  return (
    <div className="w-full">
      <div className="space-y-6">
        {loadingTokens ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600">Loading tokens...</span>
          </div>
        ) : (
          <>
            {/* Token selection area */}
            <div className="space-y-4">
              <TokenSelector
                selectedToken={token0}
                onTokenChange={setToken0}
                availableTokens={availableTokens}
                label="First Token"
                balance={token0Balance}
                showBalance={true}
              />

              {/* Swap button */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  onClick={handleSwapTokens}
                >
                  ↓↑
                </Button>
              </div>
              <TokenSelector
                selectedToken={token1}
                onTokenChange={setToken1}
                availableTokens={availableTokens}
                label="Second Token"
                balance={token1Balance}
                showBalance={true}
              />
            </div>

            {/* Fee selection */}
            <div className="space-y-2">
              <Label htmlFor="fee">Fee Tier</Label>
              <Select value={fee} onValueChange={setFee}>
                <SelectTrigger id="fee">
                  <SelectValue placeholder="Select fee tier" />
                </SelectTrigger>
                <SelectContent>
                  {FEE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                Higher fee tiers are suitable for more volatile token pairs,
                lower fee tiers for stable pairs
              </p>
            </div>

            {/* Price range settings */}
            <div className="space-y-4">
              <div>
                <Label>Price Range</Label>
                <p className="text-sm text-gray-500 mb-4">
                  Set the price range where you want to provide liquidity
                </p>

                <div className="py-4">
                  <Slider
                    defaultValue={[0.8, 1.2]}
                    min={0.1}
                    max={10}
                    step={0.01}
                    value={[priceRange[0], priceRange[1]]}
                    onValueChange={handlePriceRangeChange}
                  />
                </div>

                <div className="flex justify-between">
                  <div>
                    <Label htmlFor="minPrice">Min Price</Label>
                    <Input
                      id="minPrice"
                      type="number"
                      value={priceRange[0]}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0) {
                          const newRange: [number, number] = [
                            val,
                            priceRange[1],
                          ];
                          setPriceRange(newRange);
                          updateTicksFromPriceRange(newRange);
                        }
                      }}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="maxPrice">Max Price</Label>
                    <Input
                      id="maxPrice"
                      type="number"
                      value={priceRange[1]}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0) {
                          const newRange: [number, number] = [
                            priceRange[0],
                            val,
                          ];
                          setPriceRange(newRange);
                          updateTicksFromPriceRange(newRange);
                        }
                      }}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Display Tick values */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <Label htmlFor="tickLower">Lower Tick</Label>
                  <Input
                    id="tickLower"
                    value={tickLower}
                    onChange={(e) => setTickLower(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="tickUpper">Upper Tick</Label>
                  <Input
                    id="tickUpper"
                    value={tickUpper}
                    onChange={(e) => setTickUpper(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Create button */}
            <Button
              className="w-full"
              onClick={handleCreatePool}
              disabled={isLoading || !token0 || !token1 || loadingTokens}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Pool"
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
