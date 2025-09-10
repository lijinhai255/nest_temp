"use client";

import { useAccount } from "wagmi";
import { UserProfileEdit } from "@/components/UserProfileEdit";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthorByWalletAddress } from "@/lib/db/author";
import { WalletConnect } from "@/components/WalletConnect";
import useSWR from "swr";
import { useCallback } from "react";
// import TransactionHistory from "@/components/TransactionHistory";

// 创建fetcher函数，处理数据获取和错误处理
const fetchAuthor = async ([_, address]: [string, string]) => {
  if (!address) return null;

  try {
    const response = await getAuthorByWalletAddress(address);

    // 如果有错误，检查是否是"找不到用户"的错误
    if (response.error) {
      // PGRST116 错误表示没有找到记录，这不是真正的错误，只是用户不存在
      if (response.error.code === "PGRST116") {
        console.log("用户不存在，返回空数据");
        return null; // 返回null表示用户不存在，但不是错误
      }

      // 其他错误，抛出以便SWR处理
      console.error("获取用户信息出错:", response.error);
      throw response.error;
    }

    return response.data;
  } catch (err) {
    console.error("获取用户数据出错:", err);
    throw err; // 重新抛出错误，让SWR处理
  }
};

export default function ProfilePage() {
  const { address, isConnecting } = useAccount();

  // 使用SWR获取用户数据
  const {
    data: userData,
    isLoading,
    error,
    mutate,
  } = useSWR(
    // 只有当address存在时才执行请求
    address ? ["author", address] : null,
    // 使用我们改进的fetcher函数
    fetchAuthor,
    {
      revalidateOnFocus: false, // 页面获得焦点时不重新验证
      dedupingInterval: 10000, // 10秒内相同的请求只执行一次
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // 最多重试3次
        if (retryCount >= 3) return;

        // 如果是PGRST116错误（用户不存在），不需要重试
        if (error.code === "PGRST116") return;

        // 5秒后重试
        setTimeout(() => revalidate({ retryCount }), 5000);
      },
    }
  );

  // 刷新用户数据的回调函数
  const refreshUserData = useCallback(() => {
    mutate();
  }, [mutate]);

  // 处理加载状态
  if (isConnecting || isLoading) {
    return (
      <section className="section_container">
        <h1 className="text-30-bold mb-8">个人资料</h1>
        <div className="space-y-6">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      </section>
    );
  }

  // 处理未连接钱包的情况
  if (!address) {
    return (
      <section className="section_container">
        <h1 className="text-30-bold mb-8">个人资料</h1>
        <div className="bg-white shadow-100 border border-black/10 p-8 rounded-lg text-center">
          <p className="mb-6 text-20-medium text-black-300">
            请连接并认证您的钱包以查看个人资料
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <WalletConnect />
          </div>
        </div>
      </section>
    );
  }

  // 处理错误情况，但不包括"用户不存在"的情况
  if (error && error.code !== "PGRST116") {
    return (
      <section className="section_container">
        <h1 className="text-30-bold mb-8">个人资料</h1>
        <div className="bg-white shadow-100 border border-black/10 p-8 rounded-lg text-center">
          <p className="mb-6 text-20-medium text-black-300">
            获取用户数据时出错，请稍后再试
          </p>
          <button
            onClick={() => mutate()}
            className="px-6 py-2.5 bg-primary text-white rounded-md shadow-100 hover:bg-primary/90 transition-colors"
          >
            重试
          </button>
        </div>
      </section>
    );
  }

  // 如果用户不存在，或者用户数据为空，显示创建资料的提示
  const isNewUser = !userData;

  return (
    <section className="section_container">
      <h1 className="text-30-bold mb-8">个人资料</h1>

      {isNewUser ? (
        <div className="bg-white shadow-100 border border-black/10 p-8 rounded-lg text-center">
          <p className="mb-6 text-20-medium text-black-300">
            您尚未创建个人资料，请完善您的信息
          </p>
          <div className="max-w-2xl mx-auto">
            <UserProfileEdit
              initialData={{}}
              onSuccess={refreshUserData}
              walletAddress={address}
              isNewUser={true}
            />
          </div>
        </div>
      ) : (
        <Tabs defaultValue="info" className="w-full max-w-4xl mx-auto">
          <TabsList className="mb-8 bg-white-100 p-1 rounded-lg border border-black/10 shadow-100 flex justify-center">
            <TabsTrigger
              value="info"
              className="px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-100 rounded-md transition-all"
            >
              个人信息
            </TabsTrigger>
            <TabsTrigger
              value="transactions"
              className="px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-100 rounded-md transition-all"
            >
              交易记录
            </TabsTrigger>
            <TabsTrigger
              value="edit"
              className="px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-100 rounded-md transition-all"
            >
              编辑资料
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-8">
            <div className="bg-white shadow-100 border border-black/10 p-8 rounded-lg">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                {userData?.image ? (
                  <Image
                    src={userData.image}
                    alt={userData.name || "用户头像"}
                    className="w-24 h-24 rounded-full object-cover border-2 border-primary shadow-100"
                    width={96}
                    height={96}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center text-2xl font-bold text-primary border-2 border-primary shadow-100">
                    {(userData?.name || "用户")[0]?.toUpperCase() || "?"}
                  </div>
                )}

                <div className="text-center sm:text-left">
                  <h2 className="text-26-semibold">
                    {userData?.name || "未命名用户"}
                  </h2>
                  <p className="text-16-medium !text-black-300">
                    @{userData?.username || "用户"}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow-100 border border-black/10 p-6 rounded-lg">
              <h3 className="text-20-medium mb-3 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2 text-primary"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
                钱包地址
              </h3>
              <p className="font-mono text-sm break-all bg-white-100 p-3 rounded-md border border-black/5">
                {address}
              </p>
            </div>

            {userData?.bio && (
              <div className="bg-white shadow-100 border border-black/10 p-6 rounded-lg">
                <h3 className="text-20-medium mb-3 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2 text-primary"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  个人简介
                </h3>
                <p className="text-16-medium !text-black-300 leading-relaxed">
                  {userData.bio}
                </p>
              </div>
            )}

            {userData?.email && (
              <div className="bg-white shadow-100 border border-black/10 p-6 rounded-lg">
                <h3 className="text-20-medium mb-3 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2 text-primary"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  电子邮箱
                </h3>
                <p className="text-16-medium !text-black-300">
                  {userData.email}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="transactions">
            {/* <TransactionHistory /> */}
          </TabsContent>

          <TabsContent value="edit">
            <div className="bg-white shadow-100 border border-black/10 p-8 rounded-lg">
              {address && (
                <UserProfileEdit
                  initialData={userData || {}}
                  onSuccess={refreshUserData}
                  walletAddress={address}
                  isNewUser={false}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </section>
  );
}