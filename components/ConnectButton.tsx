"use client";

import { Button } from "@/components/ui/button";
import { Wallet, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectButtonProps {
  label: string;
  size: "default" | "sm" | "lg" | "icon";
  className: string;
  isConnecting: boolean;
  onClick: () => void;
}

const ConnectButton = ({
  label,
  size,
  className,
  isConnecting,
  onClick,
}: ConnectButtonProps) => {
  const getButtonStyles = () => {
    const baseStyles = "transition-all duration-200";

    switch (size) {
      case "sm":
        return cn(baseStyles, "h-8 px-3 text-sm", className);
      case "lg":
        return cn(baseStyles, "h-12 px-6 text-base", className);
      case "icon":
        return cn(baseStyles, "h-10 w-10 p-0", className);
      default:
        return cn(baseStyles, "h-10 px-4", className);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={onClick}
        className={getButtonStyles()}
        disabled={isConnecting}
      >
        {isConnecting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            连接中...
          </>
        ) : (
          <>
            {size !== "icon" && <Wallet className="w-4 h-4 mr-2" />}
            {size === "icon" ? <Wallet className="w-4 h-4" /> : label}
          </>
        )}
      </Button>
    </div>
  );
};

export default ConnectButton;
