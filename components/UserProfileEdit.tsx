"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserProfileEditProps } from "@/types";
import { updateAuthor, createAuthor } from "@/lib/db/author";
import useSWRMutation from "swr/mutation";
import { useCallback } from "react";

// 扩展UserProfileEditProps类型，添加isNewUser属性
interface ExtendedUserProfileProps extends UserProfileEditProps {
  isNewUser?: boolean;
}

// 定义表单数据类型
type FormData = {
  name: string;
  username: string;
  email: string;
  image: string | null;
  bio: string;
};

// 定义API错误类型
interface ApiError {
  message?: string;
  code?: string;
}

// 定义用于更新作者的参数类型
type UpdateAuthorArgs = {
  walletAddress: string;
  authorData: {
    walletAddress: string;
    name: string;
    username: string;
    email?: string;
    bio?: string;
    image?: string;
  };
};

// 使用SWR Mutation的更新函数
async function updateAuthorFetcher(
  key: string,
  { arg }: { arg: UpdateAuthorArgs }
) {
  const { walletAddress, authorData } = arg;
  const result = await updateAuthor(walletAddress, authorData);

  if (result.error) {
    // 创建一个Error对象并添加code属性
    const error = new Error(result.error.message || "更新失败");
    (error as unknown as ApiError).code = result.error.code;
    throw error;
  }

  return result.data;
}

// 使用SWR Mutation的创建函数
async function createAuthorFetcher(
  key: string,
  { arg }: { arg: UpdateAuthorArgs["authorData"] }
) {
  const result = await createAuthor(arg);

  if (result.error) {
    // 创建一个Error对象并添加code属性
    const error = new Error(result.error.message || "创建失败");
    (error as unknown as ApiError).code = result.error.code;
    throw error;
  }

  return result.data;
}

export function UserProfileEdit({
  initialData,
  onSuccess,
  walletAddress,
  isNewUser = false, // 添加isNewUser属性，默认为false
}: ExtendedUserProfileProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: initialData?.name || "",
    username: initialData?.username || "",
    email: initialData?.email || "",
    image: initialData?.image || null,
    bio: initialData?.bio || "",
  });

  // 使用SWR Mutation来处理更新操作
  const { trigger: triggerUpdate, isMutating: isUpdating } = useSWRMutation(
    "updateAuthor",
    updateAuthorFetcher
  );

  // 使用SWR Mutation来处理创建操作
  const { trigger: triggerCreate, isMutating: isCreating } = useSWRMutation(
    "createAuthor",
    createAuthorFetcher
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!walletAddress) {
        toast({
          title: "错误",
          description: "未找到钱包地址，无法更新个人资料",
          variant: "destructive",
        });
        return;
      }

      setIsSubmitting(true);

      // 准备要发送的数据
      const authorData = {
        walletAddress,
        name: formData.name,
        username: formData.username,
        email: formData.email,
        bio: formData.bio,
        image:
          !formData.image || formData.image === "" ? undefined : formData.image,
      };

      console.log("提交的用户数据:", authorData);

      let isSuccess = false;
      let operationIsCreate = isNewUser; // 根据isNewUser决定初始操作类型

      try {
        // 如果是新用户，直接尝试创建
        if (isNewUser) {
          console.log("新用户，尝试创建...");
          await triggerCreate(authorData);
          isSuccess = true;
        } else {
          // 如果是现有用户，先尝试更新
          console.log("尝试更新用户...");
          try {
            await triggerUpdate({ walletAddress, authorData });
            isSuccess = true;
          } catch (error) {
            const apiError = error as unknown as ApiError;

            // 如果是因为用户不存在导致的更新失败，尝试创建用户
            if (apiError.code === "PGRST116") {
              console.log("用户不存在，尝试创建...");

              await triggerCreate(authorData);
              isSuccess = true;
              operationIsCreate = true;
            } else {
              // 其他更新错误，尝试创建用户
              console.log("更新失败，尝试创建...");

              await triggerCreate(authorData);
              isSuccess = true;
              operationIsCreate = true;
            }
          }
        }
      } catch (error) {
        console.error("操作失败:", error);
        const err = error as Error;

        toast({
          title: operationIsCreate ? "创建失败" : "更新失败",
          description: err.message || "操作失败，请稍后重试",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }

      // 处理成功情况
      if (isSuccess) {
        toast({
          title: operationIsCreate ? "创建成功" : "更新成功",
          description: operationIsCreate
            ? "您的个人资料已成功创建"
            : "您的个人资料已成功更新",
          variant: "default",
        });

        if (onSuccess) onSuccess();
      }
    },
    [
      formData,
      walletAddress,
      toast,
      onSuccess,
      triggerUpdate,
      triggerCreate,
      isNewUser,
    ]
  );

  // 计算加载状态
  const isLoading = isSubmitting || isUpdating || isCreating;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          名称
        </label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="您的名称"
          disabled={isLoading}
          required={isNewUser} // 如果是新用户，名称是必填的
        />
      </div>

      <div>
        <label htmlFor="username" className="block text-sm font-medium mb-1">
          用户名
        </label>
        <Input
          id="username"
          name="username"
          value={formData.username}
          onChange={handleChange}
          placeholder="用户名"
          disabled={isLoading}
          required={isNewUser} // 如果是新用户，用户名是必填的
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          邮箱
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="您的邮箱"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="image" className="block text-sm font-medium mb-1">
          头像URL
        </label>
        <Input
          id="image"
          name="image"
          value={formData.image || ""}
          onChange={handleChange}
          placeholder="头像图片URL"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium mb-1">
          个人简介
        </label>
        <Textarea
          id="bio"
          name="bio"
          value={formData.bio}
          onChange={handleChange}
          placeholder="关于您自己的简短介绍"
          rows={3}
          disabled={isLoading}
        />
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-md shadow-100 hover:shadow-200 transition-all w-full"
      >
        {isLoading ? "处理中..." : isNewUser ? "创建资料" : "保存资料"}
      </Button>
    </form>
  );
}