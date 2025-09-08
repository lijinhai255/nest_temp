"use client";

import React, { useState, useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import dynamic from "next/dynamic"; // 导入 dynamic 用于客户端渲染
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { formSchema } from "@/lib/validation";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi"; // 导入 useAccount hook
import { createStartup } from "@/lib/db/startup"; // 导入 createStartup 函数

// 使用 dynamic 导入 MDEditor 组件，禁用 SSR
const MDEditor = dynamic(
  () => import("@uiw/react-md-editor"),
  { ssr: false } // 禁用服务器端渲染
);

// 定义表单状态类型，确保与 useActionState 期望的类型兼容
interface FormState {
  error: string;
  status: "INITIAL" | "SUCCESS" | "ERROR";
  data?: Record<string, string | number | boolean>;
}

const StartupForm = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pitch, setPitch] = useState("");
  const { toast } = useToast();
  const router = useRouter();
  const { address } = useAccount(); // 获取用户的钱包地址

  // 修改函数签名，接收 FormData 作为第二个参数
  const handleFormSubmit = async (
    state: FormState,
    formData: FormData
  ): Promise<FormState> => {
    try {
      // 从传入的 FormData 中获取表单数据
      const formValues = {
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        category: formData.get("category") as string,
        link: formData.get("link") as string,
        pitch, // 使用状态中的 pitch 值
      };

      console.log("formValues", formValues);

      // 验证表单数据
      await formSchema.parseAsync(formValues);

      // 创建当前时间作为 _createdAt 字段的值
      const currentDate = new Date().toISOString();

      // 创建 startupData 对象，使用数据库中存在的字段
      const startupData = {
        title: formValues.title,
        description: formValues.description,
        category: formValues.category,
        image: formValues.link, // 使用 link 表单字段的值作为 image 字段的值
        pitch: formValues.pitch,
        walletAddress: address || "", // 将钱包地址添加到数据中
        views: 0, // 初始化浏览次数为 0
        slug: formValues.title.toLowerCase().replace(/\s+/g, "-"), // 创建一个简单的 slug
        _createdAt: currentDate, // 添加创建时间
      };

      console.log("startupData", startupData);

      // 使用 createStartup 函数创建 startup 记录
      const { data, error } = await createStartup(startupData);

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to create startup",
          variant: "destructive",
        });

        return {
          ...state,
          error: error.message,
          status: "ERROR" as const,
        };
      }

      // 修复：检查 data 是否为数组，并安全地访问第一个元素
      if (data && Array.isArray(data) && data.length > 0) {
        toast({
          title: "Success",
          description: "Your startup pitch has been created successfully",
        });

        // 使用 data[0].id 作为创建的 startup 的 ID
        router.push(`/startup/${data[0].id}`);

        return {
          ...state,
          data: data[0] as Record<string, string | number | boolean>,
          status: "SUCCESS" as const,
        };
      }

      return { ...state, status: "SUCCESS" as const };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErorrs = error.flatten().fieldErrors;

        setErrors(fieldErorrs as unknown as Record<string, string>);

        toast({
          title: "Error",
          description: "Please check your inputs and try again",
          variant: "destructive",
        });

        return {
          ...state,
          error: "Validation failed",
          status: "ERROR" as const,
        };
      }

      console.error("Form submission error:", error);

      toast({
        title: "Error",
        description: "An unexpected error has occurred",
        variant: "destructive",
      });

      return {
        ...state,
        error: "An unexpected error has occurred",
        status: "ERROR" as const,
      };
    }
  };

  const [state, formAction, isPending] = useActionState(handleFormSubmit, {
    error: "",
    status: "INITIAL" as const,
  });

  // 使用 state 变量，这样它就不会被标记为未使用
  React.useEffect(() => {
    // 当表单状态变化时，可以在这里做一些额外的处理
    if (state.status === "ERROR") {
      console.log("Form submission error:", state.error);
    } else if (state.status === "SUCCESS") {
      console.log("Form submitted successfully");
    }
  }, [state]);

  // 添加钱包连接状态提示
  const walletStatusMessage = address ? (
    <p className="text-sm text-green-600 mt-2">
      Wallet connected: {address.substring(0, 6)}...
      {address.substring(address.length - 4)}
    </p>
  ) : (
    <p className="text-sm text-amber-600 mt-2">
      No wallet connected. Connect your wallet to receive MIK tokens.
    </p>
  );

  return (
    <form action={formAction} className="startup-form">
      <div>
        <label htmlFor="title" className="startup-form_label">
          Title
        </label>
        <Input
          id="title"
          name="title"
          className="startup-form_input"
          required
          placeholder="Startup Title"
        />

        {errors.title && <p className="startup-form_error">{errors.title}</p>}
      </div>

      <div>
        <label htmlFor="description" className="startup-form_label">
          Description
        </label>
        <Textarea
          id="description"
          name="description"
          className="startup-form_textarea"
          required
          placeholder="Startup Description"
        />

        {errors.description && (
          <p className="startup-form_error">{errors.description}</p>
        )}
      </div>

      <div>
        <label htmlFor="category" className="startup-form_label">
          Category
        </label>
        <Input
          id="category"
          name="category"
          className="startup-form_input"
          required
          placeholder="Startup Category (Tech, Health, Education...)"
        />

        {errors.category && (
          <p className="startup-form_error">{errors.category}</p>
        )}
      </div>

      <div>
        <label htmlFor="link" className="startup-form_label">
          Image URL
        </label>
        <Input
          id="link"
          name="link"
          className="startup-form_input"
          required
          placeholder="Startup Image URL"
        />

        {errors.link && <p className="startup-form_error">{errors.link}</p>}
      </div>

      <div data-color-mode="light">
        <label htmlFor="pitch" className="startup-form_label">
          Pitch
        </label>

        {/* 添加隐藏的输入字段，用于提交 pitch 值 */}
        <input type="hidden" name="pitch" value={pitch} />

        <MDEditor
          value={pitch}
          onChange={(value) => setPitch(value as string)}
          id="pitch-editor" // 改为不同的 ID，避免与隐藏字段冲突
          preview="edit"
          height={300}
          style={{ borderRadius: 20, overflow: "hidden" }}
          textareaProps={{
            placeholder:
              "Briefly describe your idea and what problem it solves",
          }}
          previewOptions={{
            disallowedElements: ["style"],
          }}
        />

        {errors.pitch && <p className="startup-form_error">{errors.pitch}</p>}
      </div>

      {/* 显示钱包连接状态和表单状态 */}
      <div className="border p-4 rounded-lg bg-gray-50 dark:bg-gray-800 mb-4">
        <h3 className="font-medium mb-2">Wallet Status</h3>
        {walletStatusMessage}

        {/* 显示表单状态 */}
        {state.status !== "INITIAL" && (
          <p
            className={`text-sm mt-2 ${
              state.status === "ERROR" ? "text-red-600" : "text-green-600"
            }`}
          >
            Form status: {state.status}
            {state.error && ` - ${state.error}`}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="startup-form_btn text-white"
        disabled={isPending}
      >
        {isPending ? "Submitting..." : "Submit Your Pitch"}
        <Send className="size-6 ml-2" />
      </Button>
    </form>
  );
};

export default StartupForm;