import { DetectedWallet, ExtendedWallet } from "@/types/provider";

export interface DeduplicationResult {
  filtered: DetectedWallet[];
  staticFiltered: { [groupName: string]: ExtendedWallet[] };
}

export class WalletDeduplicator {
  /**
   * 钱包去重函数
   * @param detected 检测到的钱包列表
   * @param configuredWallets 配置的钱包组
   * @returns 去重后的结果
   */
  static deduplicate(
    detected: DetectedWallet[] | undefined,
    configuredWallets: { [groupName: string]: ExtendedWallet[] } | undefined
  ): DeduplicationResult {
    console.log("🔍 开始钱包去重...", detected, configuredWallets);
    
    // 确保 detected 和 configuredWallets 是有效的
    const safeDetected = detected || [];
    const safeConfigured = configuredWallets || {};
    
    console.log(
      "检测到的钱包:",
      safeDetected.length > 0 
        ? safeDetected.map((w) => ({ name: w.name, id: w.id, rdns: w.rdns }))
        : "没有检测到钱包"
    );

    const nameMap = new Map<string, DetectedWallet>();
    const rdnsMap = new Map<string, DetectedWallet>();

    // 优先保留 EIP-6963 标准的钱包
    const sortedDetected = [...safeDetected].sort((a, b) => {
      if (a.type === "eip6963" && b.type !== "eip6963") return -1;
      if (b.type === "eip6963" && a.type !== "eip6963") return 1;
      return 0;
    });

    console.log("deduplicateDetectedWallets", sortedDetected, nameMap, rdnsMap);
    
    // 去重检测到的钱包
    const filteredDetected = this.deduplicateDetectedWallets(
      sortedDetected,
      nameMap,
      rdnsMap
    );

    // 过滤配置的钱包
    const staticFiltered = this.filterConfiguredWallets(
      safeConfigured,
      filteredDetected
    );

    console.log("✅ 去重完成");
    console.log("最终检测钱包数量:", filteredDetected.length);
    console.log("最终配置钱包组数:", Object.keys(staticFiltered).length);

    return {
      filtered: filteredDetected,
      staticFiltered,
    };
  }

  private static deduplicateDetectedWallets(
    sortedDetected: DetectedWallet[],
    nameMap: Map<string, DetectedWallet>,
    rdnsMap: Map<string, DetectedWallet>
  ): DetectedWallet[] {
    const filteredDetected: DetectedWallet[] = [];
    
    // 确保 sortedDetected 是数组且不为空
    if (!Array.isArray(sortedDetected)) {
      console.warn("⚠️ sortedDetected 不是数组，返回空结果");
      return filteredDetected;
    }
    
    if (sortedDetected.length === 0) {
      console.log("⚠️ 没有检测到钱包，返回空结果");
      return filteredDetected;
    }

    for (const wallet of sortedDetected) {
      const normalizedName = wallet.name.toLowerCase().trim();
      const existingByName = nameMap.get(normalizedName);
      const existingByRdns = rdnsMap.get(wallet.rdns);

      if (!existingByName && !existingByRdns) {
        // 没有重复，添加到结果中
        filteredDetected.push(wallet);
        nameMap.set(normalizedName, wallet);
        rdnsMap.set(wallet.rdns, wallet);
        console.log(
          `✅ 保留钱包: ${wallet.name} (${wallet.rdns}) [${wallet.type}]`
        );
      } else {
        // 有重复，优先保留 EIP-6963 标准的
        const existing = existingByName || existingByRdns;
        if (
          existing &&
          wallet.type === "eip6963" &&
          existing.type !== "eip6963"
        ) {
          // 替换为 EIP-6963 版本
          const index = filteredDetected.findIndex(
            (w) => w.rdns === existing.rdns
          );
          if (index !== -1) {
            filteredDetected[index] = wallet;
            nameMap.set(normalizedName, wallet);
            rdnsMap.set(wallet.rdns, wallet);
            console.log(
              `🔄 替换钱包: ${existing.name} -> ${wallet.name} (更好的标准)`
            );
          }
        } else {
          console.log(
            `❌ 跳过重复钱包: ${wallet.name} (${wallet.rdns}) [${wallet.type}]`
          );
        }
      }
    }

    return filteredDetected;
  }

  private static filterConfiguredWallets(
    configuredWallets: { [groupName: string]: ExtendedWallet[] },
    detectedWallets: DetectedWallet[]
  ): { [groupName: string]: ExtendedWallet[] } {
    const staticFiltered: { [groupName: string]: ExtendedWallet[] } = {};
    
    // 如果没有检测到钱包，直接返回原始配置
    if (detectedWallets.length === 0) {
      console.log("⚠️ 没有检测到钱包，返回原始配置钱包");
      return configuredWallets;
    }
    
    const detectedNames = new Set(
      detectedWallets.map((w) => w.name.toLowerCase().trim())
    );
    const detectedIds = new Set(
      detectedWallets.map((w) => w.id.toLowerCase())
    );

    Object.entries(configuredWallets).forEach(([groupName, walletsInGroup]) => {
      const filtered = walletsInGroup.filter((wallet) => {
        const normalizedName = wallet.name.toLowerCase().trim();
        const normalizedId = wallet.id.toLowerCase();

        const isDuplicate =
          detectedNames.has(normalizedName) || detectedIds.has(normalizedId);

        if (isDuplicate) {
          console.log(`🚫 过滤配置钱包: ${wallet.name} (与检测到的钱包重复)`);
          return false;
        }

        return true;
      });

      if (filtered.length > 0) {
        staticFiltered[groupName] = filtered;
      }
    });

    return staticFiltered;
  }
}