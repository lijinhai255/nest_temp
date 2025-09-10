"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserProfileEditProps } from "@/types";
import { updateAuthor, createAuthor } from "@/lib/db/author";

// 定义表单数据类型
type FormData = {
  name: string;
  username: string;
  email: string;
  image: string | null;
  bio: string;
};

// 定义 Supabase 错误类型
interface SupabaseError extends Error {
  code?: string;
  details?: string;
  hint?: string;
}

export function UserProfileEdit({
  initialData,
  onSuccess,
  walletAddress,
}: UserProfileEditProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: initialData.name || "",
    username: initialData.username || "",
    email: initialData.email || "",
    image: initialData.image || null,
    bio: initialData.bio || "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // 阻止表单默认提交行为

    if (!walletAddress) {
      toast({
        title: "错误",
        description: "未找到钱包地址，无法更新个人资料",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      // 根据钱包地址 walletAddress 更新数据
      const { data, error } = await updateAuthor(walletAddress, formData);

      if (error) {
        // 将 error 转换为 SupabaseError 类型
        const supabaseError = error as SupabaseError;

        // 检查错误是否是因为用户不存在
        if (
          supabaseError.message?.includes(
            "Cannot coerce the result to a single JSON object"
          )
        ) {
          // 如果用户不存在，则创建新用户
          // 创建一个新的对象，将 null 值转换为 undefined
          const authorData = {
            walletAddress,
            name: formData.name,
            username: formData.username,
            email: formData.email,
            bio: formData.bio,
            // 如果 image 是 null，则设置为 undefined
            image: formData.image === null ? undefined : formData.image,
          };

          const { data: newData, error: createError } = await createAuthor(
            authorData
          );

          if (createError) {
            toast({
              title: "创建失败",
              description: createError.message || "创建用户失败，请稍后重试",
              variant: "destructive",
            });
            return;
          }

          toast({
            title: "创建成功",
            description: "您的个人资料已成功创建",
            variant: "default",
          });
        } else {
          // 其他错误
          toast({
            title: "更新失败",
            description: error.message || "个人资料更新失败，请稍后重试",
            variant: "destructive",
          });
          return;
        }
      } else {
        toast({
          title: "更新成功",
          description: "您的个人资料已成功更新",
          variant: "default",
        });
      }

      // 如果提供了成功回调函数，则调用它
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("更新个人资料时出错:", err);
      toast({
        title: "更新失败",
        description: "发生未知错误，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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

      {/* 隐藏的钱包地址字段 */}
      <input type="hidden" name="walletAddress" value={walletAddress} />

      <Button
        type="submit"
        disabled={isLoading}
        className="bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-md shadow-100 hover:shadow-200 transition-all"
      >
        {isLoading ? "更新中..." : "保存更改"}
      </Button>
    </form>
  );
}