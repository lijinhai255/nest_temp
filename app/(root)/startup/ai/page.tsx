"use client";

import { useState, useEffect, useRef } from "react";
import {
  Send,
  Mic,
  Image,
  Code,
  MoreHorizontal,
  Clock,
  Settings,
} from "lucide-react";
import MarkdownIt from "markdown-it";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const AI = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const md = useRef(new MarkdownIt({ breaks: true, linkify: true }));

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const callAPI = async (userMessage: string) => {
    setIsLoading(true);

    // 添加一个空的助手消息，用于流式填充
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const response = await fetch(
        "https://open.bigmodel.cn/api/paas/v4/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization:
              "Bearer ab4d52aa24ff4057a6eb973cdafb15b9.2CQST2tj963VrEw5",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "glm-4.5-flash",
            stream: true,
            thinking: {
              type: "enabled",
            },
            do_sample: true,
            temperature: 0.6,
            top_p: 0.95,
            response_format: {
              type: "text",
            },
            messages: [
              ...messages.map((msg) => ({
                role: msg.role,
                content: msg.content,
              })),
              { role: "user", content: userMessage },
            ],
            tools: [],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("无法获取响应流");
      }

      let accumulatedContent = "";
      let receivedFirstContent = false;
      let noContentCounter = 0;
      const MAX_NO_CONTENT_COUNT = 10; // 最大允许连续没有内容的消息数

      // 处理流式响应
      const processStream = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // 将二进制数据转换为文本
          const chunk = new TextDecoder().decode(value);

          // 处理SSE格式的数据
          const lines = chunk.split("\n").filter((line) => line.trim() !== "");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const jsonStr = line.substring(6);

              // 跳过[DONE]消息
              if (jsonStr.trim() === "[DONE]") continue;

              try {
                const data = JSON.parse(jsonStr);

                let contentToAdd = "";

                // 检查各种可能的内容位置
                if (data.choices && data.choices.length > 0) {
                  const choice = data.choices[0];

                  // 检查delta.content (OpenAI流式格式)
                  if (choice.delta?.content) {
                    contentToAdd = choice.delta.content;
                  }
                  // 检查message.content (非流式格式)
                  else if (choice.message?.content) {
                    contentToAdd = choice.message.content;
                  }
                  // 检查text (某些API的格式)
                  else if (choice.text) {
                    contentToAdd = choice.text;
                  }
                  // 检查content (直接内容)
                  else if (choice.content) {
                    contentToAdd = choice.content;
                  }
                  // 直接检查delta对象
                  else if (choice.delta && typeof choice.delta === "object") {
                    // 如果delta是一个对象但没有content，可能是初始消息
                    if (
                      Object.keys(choice.delta).length === 0 ||
                      choice.delta.role
                    ) {
                      // 这是一个初始消息，不包含内容
                      continue;
                    }
                  }
                }

                // 如果在choices中没找到内容，检查顶级字段
                if (!contentToAdd) {
                  if (data.content) {
                    contentToAdd = data.content;
                  } else if (data.thinking && data.thinking.content) {
                    // 智谱AI可能在thinking字段中返回内容
                    contentToAdd = data.thinking.content;
                  } else if (data.response) {
                    // 某些API可能在response字段中返回内容
                    contentToAdd = data.response;
                  }
                }

                // 如果有任何内容要添加
                if (contentToAdd) {
                  receivedFirstContent = true;
                  noContentCounter = 0; // 重置计数器
                  accumulatedContent += contentToAdd;

                  // 更新最后一条消息的内容
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].content =
                      accumulatedContent;
                    return newMessages;
                  });
                } else {
                  noContentCounter++;

                  // 如果连续多次没有内容，并且我们还没有收到任何内容，可能需要尝试一些备用方案
                  if (
                    !receivedFirstContent &&
                    noContentCounter >= MAX_NO_CONTENT_COUNT
                  ) {
                    // 尝试直接使用原始JSON作为内容（用于调试）
                    const rawData = JSON.stringify(data, null, 2);

                    // 更新最后一条消息的内容，显示我们收到了数据但无法解析
                    setMessages((prev) => {
                      const newMessages = [...prev];
                      newMessages[newMessages.length - 1].content =
                        "正在处理回复，请稍候...";
                      return newMessages;
                    });

                    // 重置计数器，避免重复显示此消息
                    noContentCounter = 0;
                  }
                }
              } catch (e) {
                console.error("解析JSON失败:", e, "原始数据:", jsonStr);
              }
            }
          }
        }

        // 如果处理完所有数据后仍然没有内容，显示一个友好的消息
        if (!receivedFirstContent) {
          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].content =
              "我已经收到您的问题，正在思考中...";
            return newMessages;
          });

          // 尝试进行非流式请求作为备用方案
          try {
            const fallbackResponse = await fetch(
              "https://open.bigmodel.cn/api/paas/v4/chat/completions",
              {
                method: "POST",
                headers: {
                  Authorization:
                    "Bearer ab4d52aa24ff4057a6eb973cdafb15b9.2CQST2tj963VrEw5",
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "glm-4.5-flash",
                  stream: false, // 非流式请求
                  messages: [
                    ...messages.map((msg) => ({
                      role: msg.role,
                      content: msg.content,
                    })),
                    { role: "user", content: userMessage },
                  ],
                }),
              }
            );

            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              if (
                fallbackData.choices &&
                fallbackData.choices[0]?.message?.content
              ) {
                const content = fallbackData.choices[0].message.content;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1].content = content;
                  return newMessages;
                });
              }
            }
          } catch (fallbackError) {
            console.error("备用请求失败:", fallbackError);
          }
        }
      };

      await processStream();
    } catch (error) {
      console.error("API调用出错:", error);
      // 如果出错，更新最后一条消息
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].content =
          "抱歉，发生了错误，请稍后再试。";
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      const userMessage = input.trim();
      setInput("");

      // 添加用户消息到对话
      setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

      // 调用API
      await callAPI(userMessage);
    }
  };

  const handleExampleClick = async (question: string) => {
    if (!isLoading) {
      setInput("");

      // 添加用户消息到对话
      setMessages((prev) => [...prev, { role: "user", content: question }]);

      // 调用API
      await callAPI(question);
    }
  };

  // 将 Markdown 转换为 HTML
  const renderMarkdown = (content: string) => {
    if (!content) return "";
    return md.current.render(content);
  };

  const exampleQuestions = [
    "养成好习惯的3个关键步骤是什么？",
    "拖延症背后的原因是什么？如何彻底解决？",
    "新手如何在家开始科学健身？有实用计划吗？",
    "零基础投资新手如何迈出安全的第一步？",
  ];

  // 添加一个示例问题，专门用于测试 Markdown 渲染
  const reactFlowExample = "请详细解释 React 的渲染流程";

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* 顶部标题区域 */}
      <div className="flex flex-col items-center justify-center py-8 border-b">
        <h1 className="text-2xl font-medium text-gray-800">AI 助手</h1>
        <p className="text-center text-gray-600 max-w-2xl mt-4 px-4">
          一个智能助手，可以回答问题、提供信息和帮助完成各种任务。支持 Markdown
          格式。
        </p>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 overflow-auto px-4 py-6 space-y-6">
        {messages.length === 0 ? (
          <>
            <div className="text-center text-gray-500 my-8">试一试</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto">
              {exampleQuestions.map((question, index) => (
                <button
                  key={index}
                  className="text-left p-4 border rounded-xl hover:bg-gray-50 transition-colors"
                  onClick={() => handleExampleClick(question)}
                  disabled={isLoading}
                >
                  {question}
                </button>
              ))}
              <button
                className="text-left p-4 border rounded-xl hover:bg-gray-50 transition-colors col-span-1 md:col-span-2 bg-gray-50"
                onClick={() => handleExampleClick(reactFlowExample)}
                disabled={isLoading}
              >
                {reactFlowExample} (Markdown 测试)
              </button>
            </div>
          </>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-4 ${
                    message.role === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {message.role === "user" ? (
                    message.content
                  ) : message.content ? (
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(message.content),
                      }}
                    />
                  ) : (
                    isLoading &&
                    index === messages.length - 1 && (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.4s" }}
                        ></div>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 底部输入区域 */}
      <div className="border-t p-4">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="flex items-center border rounded-full flex-1 px-4 py-2 bg-white">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="问我任何问题..."
                className="flex-1 outline-none text-gray-800"
                disabled={isLoading}
              />
              <div className="flex items-center gap-2 text-gray-400">
                <button
                  type="button"
                  className="p-1 hover:text-gray-600"
                  disabled={isLoading}
                >
                  <Mic size={18} />
                </button>
                <button
                  type="button"
                  className="p-1 hover:text-gray-600"
                  disabled={isLoading}
                >
                  <Image size={18} />
                </button>
                <button
                  type="button"
                  className="p-1 hover:text-gray-600"
                  disabled={isLoading}
                >
                  <Code size={18} />
                </button>
              </div>
            </div>
            <button
              type="submit"
              className={`p-3 rounded-full ${
                isLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600"
              } text-white transition-colors`}
              disabled={isLoading}
            >
              <Send size={18} />
            </button>
          </form>
          <div className="flex justify-between items-center mt-3 px-2 text-xs text-gray-500">
            <div className="flex items-center">
              <button className="ml-1">
                <MoreHorizontal size={14} />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-1">
                <Clock size={14} />
              </button>
              <button className="flex items-center gap-1">
                <Settings size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AI;
