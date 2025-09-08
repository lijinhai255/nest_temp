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

// 删除错误的 FormDataType 定义