"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useState } from "react";
import { Grid2X2, List } from "lucide-react"; // 导入图标组件
import { Wallet } from "@rainbow-me/rainbowkit";
import {
  DetectedWallet,
  ExtendedWallet,
  WalletConnectionResult,
} from "@/types/provider";

interface WalletConnectModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectWallet: (walletId: string) => Promise<WalletConnectionResult>;
  onClose: () => void;
  walletInstances?: { [groupName: string]: ExtendedWallet[] }; // 使用可选属性操作符 ?
  detectedWallets?: DetectedWallet[]; // 如果需要这个属性
  walletsLoading?: boolean; // 如果需要这个属性
  connecting?: boolean;
  error?: Error | null; // 修正拼写错误并使用正确的联合类型语法
}

// 新增的钱包列表组件
interface WalletListProps {
  walletInstances: { [groupName: string]: ExtendedWallet[] } | undefined;
  isGridLayout: boolean;
  onSelectWallet: (walletId: string) => Promise<WalletConnectionResult>;
}

const WalletListComponent = ({
  walletInstances,
  isGridLayout,
  onSelectWallet,
}: WalletListProps) => {
  return (
    <div
      className={`${
        isGridLayout ? "grid grid-cols-2" : "max-h-[400px] overflow-y-auto pr-2"
      } gap-4 py-4`}
    >
      {walletInstances &&
        Object.entries(walletInstances).map(([groupName, wallets]) => (
          <div key={groupName}>
            <h3 className="font-medium mb-2 text-foreground">{groupName}</h3>
            <div className="space-y-2">
              {Array.isArray(wallets) &&
                wallets?.map((walletInstance) => (
                  <div
                    key={walletInstance.id}
                    onClick={() => onSelectWallet(walletInstance.id)}
                    className="flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-accent cursor-pointer"
                  >
                    <div className="flex flex-col w-full">
                      <div className="flex items-center">
                        <div
                          className="w-8 h-8 mr-2 rounded-full flex items-center justify-center"
                          style={{
                            backgroundColor: walletInstance.iconBackground,
                          }}
                        >
                          {walletInstance.iconUrlResolved ? (
                            <Image
                              src={walletInstance.iconUrlResolved}
                              alt={walletInstance.name}
                              className="w-6 h-6"
                              width={50}
                              height={50}
                            />
                          ) : (
                            <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                          )}
                        </div>
                        <span className="text-foreground">
                          {walletInstance.name}
                        </span>
                        {!isGridLayout &&
                          walletInstance.downloaded === false && (
                            <span className="ml-auto text-xs text-muted-foreground">
                              已检测
                            </span>
                          )}
                      </div>
                      {!isGridLayout && (
                        <div className="text-xs text-muted-foreground mt-1 ml-10">
                          {walletInstance.description ||
                            `适用于 ${
                              walletInstance.platforms ||
                              "iOS、Android 和 Chrome"
                            }`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
    </div>
  );
};

const WalletConnectModal = ({
  isOpen,
  onOpenChange,
  onSelectWallet,
  onClose,
  walletInstances,
}: WalletConnectModalProps) => {
  // 添加布局状态，true 表示网格布局（一行两个），false 表示列表布局（一行一个）
  const [isGridLayout, setIsGridLayout] = useState(true);

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-background border-border">
        <AlertDialogHeader>
          <div className="flex justify-between items-center">
            <AlertDialogTitle className="text-foreground">
              连接钱包
            </AlertDialogTitle>
            <div className="flex space-x-2">
              <Button
                onClick={() => setIsGridLayout(true)}
                variant="link"
                className={`p-1 h-auto w-auto ${
                  isGridLayout ? "bg-accent" : ""
                }`}
                title="网格视图"
              >
                <Grid2X2 size={18} className="text-foreground" />
              </Button>
              <Button
                onClick={() => setIsGridLayout(false)}
                variant="link"
                className={`p-1 h-auto w-auto ${
                  !isGridLayout ? "bg-accent" : ""
                }`}
                title="列表视图"
              >
                <List size={18} className="text-foreground" />
              </Button>
            </div>
          </div>
          <AlertDialogDescription className="text-muted-foreground">
            请选择要连接的钱包类型
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* 使用封装后的钱包列表组件 */}
        <WalletListComponent
          walletInstances={walletInstances}
          isGridLayout={isGridLayout}
          onSelectWallet={onSelectWallet}
        />

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={onClose}
            className="bg-background text-foreground hover:bg-accent"
          >
            取消
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default WalletConnectModal;
