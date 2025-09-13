import { cn } from "@/lib/utils";
import { ChainConfig } from "./ChainSwitcher";

interface ChainIconProps {
  chain: ChainConfig;
  size?: "sm" | "md";
  className?: string;
}

const ChainIcon = ({ chain, size = "sm", className }: ChainIconProps) => {
  const sizeMap = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
  };

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-white font-bold text-xs",
        sizeMap[size],
        className
      )}
      style={{ backgroundColor: chain.color || "#666" }}
    >
      {chain.shortName.charAt(0)}
    </div>
  );
};

export default ChainIcon;
