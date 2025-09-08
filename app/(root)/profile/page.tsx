"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
// import { UserProfileEdit } from "@/components/UserProfileEdit";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthorByWalletAddress } from "@/lib/db/author";
import { Author } from "@/types";
import { WalletConnect } from "@/components/WalletConnect";
// import TransactionHistory from "@/components/TransactionHistory";

export default function ProfilePage() {
  const { address, isConnecting } = useAccount();
  const [userData, setUserData] = useState<Author>();
  const [isLoading, setIsLoading] = useState(true);

  // 使用useCallback定义fetchUserData，这样它可以在组件中的其他地方使用
  const fetchUserData = useCallback(async () => {
    if (!address) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await getAuthorByWalletAddress(address);
      console.log(data);
      console.log("获取用户信息", data, error);

      if (data) {
        setUserData(data);
      }
    } catch (err) {
      console.error("获取用户数据出错:", err);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // 当地址变化时获取用户数据
  useEffect(() => {
    setIsLoading(true);
    fetchUserData();
  }, [fetchUserData]);

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

  return (
    <section className="section_container">
      <h1 className="text-30-bold mb-8">个人资料</h1>

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
              <p className="text-16-medium !text-black-300">{userData.email}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="transactions">
          {/* <TransactionHistory /> */}
        </TabsContent>

        <TabsContent value="edit">
          <div className="bg-white shadow-100 border border-black/10 p-8 rounded-lg">
            {/* <UserProfileEdit
              initialData={userData || {}}
              onSuccess={fetchUserData}
              walletAddress={address}
            /> */}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
