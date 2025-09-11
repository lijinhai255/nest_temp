import { Tables } from "@/lib/db/supabase";

export type Startup = Tables<"startup"> & {
  _createdAt?: string;
};

export type Author = Tables<"author"> & {_createdAt: string};

export type StartupWithAuthor = Startup & { author: Author | null };

// 修改 UserProfileEditProps 接口，使其与 Author 类型兼容
export interface UserProfileEditProps {
  initialData: Partial<Author>; // 使用 Partial<Author> 使所有 Author 属性变为可选
  onSuccess?: () => void;
  walletAddress?: string;
}

// JSON-RPC 请求类型
export interface JsonRpcRequest {
  id?: string | number;
  jsonrpc?: string;
  method: string;
  params?: unknown[];
}


// 定义合约调用性能指标类型
export interface ContractMetric {
  id: string;
  userId: string;
  contractAddress: string;
  contractName?: string;
  functionName: string;
  functionArgs?: readonly unknown[];
  startTimestamp: number;
  endTimestamp: number;
  duration: number;
  gasUsed?: bigint;
  status: "success" | "error";
  transactionHash?: string;
  error?: string;
}

// 定义合约调用性能统计类型
export interface ContractStats {
  avgExecutionTime: number;
  minExecutionTime: number;
  maxExecutionTime: number;
  avgGasUsed: string;
  successRate: number;
  totalCalls: number;
}