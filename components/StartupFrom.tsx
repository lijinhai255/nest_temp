"use client";

import React, { useState, useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import MDEditor from "@uiw/react-md-editor";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { formSchema } from "@/lib/validation";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi"; // 导入 useAccount hook
import { createStartup } from "@/lib/db/startup"; // 导入 createStartup 函数

const StartupForm = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pitch, setPitch] = useState("");
  const { toast } = useToast();
  const router = useRouter();
  const { address } = useAccount(); // 获取用户的钱包地址

  const handleFormSubmit = async (prevState: any, formData: FormData) => {
    try {
      const formValues = {
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        category: formData.get("category") as string,
        link: formData.get("link") as string,
        pitch,
      };

      await formSchema.parseAsync(formValues);

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
        _createdAt: new Date().toISOString(),
      };

      // 使用 createStartup 函数创建 startup 记录
      const { data, error } = await createStartup(startupData);

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to create startup",
          variant: "destructive",
        });

        return { ...prevState, error: error.message, status: "ERROR" };
      }

      if (data && data[0]) {
        toast({
          title: "Success",
          description: "Your startup pitch has been created successfully",
        });

        // 使用 data[0].id 作为创建的 startup 的 ID
        router.push(`/startup/${data[0].id}`);

        return { ...prevState, data: data[0], status: "SUCCESS" };
      }

      return { ...prevState, status: "SUCCESS" };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErorrs = error.flatten().fieldErrors;

        setErrors(fieldErorrs as unknown as Record<string, string>);

        toast({
          title: "Error",
          description: "Please check your inputs and try again",
          variant: "destructive",
        });

        return { ...prevState, error: "Validation failed", status: "ERROR" };
      }

      toast({
        title: "Error",
        description: "An unexpected error has occurred",
        variant: "destructive",
      });

      return {
        ...prevState,
        error: "An unexpected error has occurred",
        status: "ERROR",
      };
    }
  };

  const [state, formAction, isPending] = useActionState(handleFormSubmit, {
    error: "",
    status: "INITIAL",
  });

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

        <MDEditor
          value={pitch}
          onChange={(value) => setPitch(value as string)}
          id="pitch"
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

      {/* 显示钱包连接状态 */}
      <div className="border p-4 rounded-lg bg-gray-50 dark:bg-gray-800 mb-4">
        <h3 className="font-medium mb-2">Wallet Status</h3>
        {walletStatusMessage}
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
