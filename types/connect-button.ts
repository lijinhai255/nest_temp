import { ChainConfig } from "@/components/ChainSwitcher";

export interface EnhancedConnectButtonProps {
  /** 按钮文本标签 */
  label?: string;
  /** 是否显示余额 */
  showBalance?: boolean;
  /** 按钮尺寸 */
  size?: "default" | "sm" | "lg" | "icon";
  /** 链状态显示方式 */
  chainStatus?: "full" | "icon" | "none";
  /** 账户状态显示方式 */
  accountStatus?: "full" | "address" | "avatar" | "none";
  /** 自定义类名 */
  className?: string;
  /** 是否显示链切换功能 */
  showChainSwitcher?: boolean;
  /** 支持的链列表 */
  supportedChains?: ChainConfig[];
  /** 是否显示测试网 */
  showTestnets?: boolean;
  /** 连接成功回调 */
  onConnect?: () => void;
  /** 断开连接回调 */
  onDisConnect?: () => void;
  /** 链变化回调 */
  onChainChange?: (chainId: number, chainConfig?: ChainConfig) => void;
  /** 余额变化回调 */
  onBalanceChange?: (balance: string) => void;
}

export interface ConnectButtonState {
  isChainSwitching: boolean;
  switchingChainId: number | null;
  copied: boolean;
}
