import { z } from "zod";

// 常见图片扩展名列表
const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];

export const formSchema = z.object({
  title: z.string().min(3).max(100),
  category: z.string().min(3).max(20),
  link: z
    .string()
    .url()
    .refine((url) => {
      try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname.toLowerCase();
        // 检查 URL 是否以常见图片扩展名结尾
        return imageExtensions.some(ext => pathname.endsWith(ext));
      } catch {
        return false;
      }
    }, { message: "URL must point to an image file (jpg, png, etc.)" }),
  pitch: z.string().min(10),
});