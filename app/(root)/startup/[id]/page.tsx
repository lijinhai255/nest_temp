import { formatDate } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import SendMIKTransaction from "@/components/SendMIKTransaction";
import { getStartupById } from "@/lib/db/startup";
import { getAuthors } from "@/lib/db/author";

// 修改：使用 Next.js 15 的 PageProps 类型
interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

// 修改：调整组件定义以匹配 PageProps
const StartupPage = async ({ params }: PageProps) => {
  try {
    // 修改：等待 params Promise 解析
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const { data: post } = await getStartupById(id);

    // 检查 post 是否存在
    if (!post) {
      // 使用 Next.js 15 的方式处理 404
      return (
        <div className="section_container">
          <h1 className="heading">Startup Not Found</h1>
          <p className="sub-heading">
            The startup you&apos;re looking for doesn&apos;t exist or has been
            removed.
          </p>
          <Link href="/startups" className="btn-primary mt-6">
            Browse All Startups
          </Link>
        </div>
      );
    }

    // 获取所有作者，然后根据钱包地址过滤
    const { data: authors } = await getAuthors();

    // 根据 post.walletAddress 找到对应的作者
    let author = null;
    if (post.walletAddress && authors) {
      author = authors.find((a) => a.walletAddress === post.walletAddress);
    }

    // 如果作者不存在，提供默认值
    const safeAuthor = author || {
      name: "Unknown",
      username: "unknown",
      image: "/default-avatar.png", // 确保有一个默认头像路径
      _id: "",
    };

    const parsedContent = post.pitch;
    const authorWalletAddress = post.walletAddress || "";
    console.log("safeAuthor", safeAuthor);
    console.log("post", post);

    return (
      <>
        <section className="pink_container !min-h-[230px]">
          <p className="tag">{formatDate(post?._createdAt || "")}</p>
          <h1 className="heading">{post?.title}</h1>
          <p className="sub-heading !max-w-5xl">{post.description}</p>
        </section>
        <section className="section_container">
          <Image
            width={1110}
            height={583}
            src={post.image || ""}
            alt={post.title || "Startup image"}
            className="w-full h-auto rounded-xl "
          />
          <div className="space-y-5 mt-10 max-w-4xl mx-auto">
            <div className="flex-between gap-5">
              {safeAuthor.id && (
                <Link
                  href={`/user/${safeAuthor.id}`}
                  className="flex gap-2 items-center mb-3"
                >
                  <Image
                    src={safeAuthor.image}
                    alt="avatar"
                    width={64}
                    height={64}
                    className="rounded-full drop-shadow-lg"
                  />

                  <div>
                    <p className="text-20-medium">{safeAuthor.name}</p>
                    <p className="text-16-medium !text-black-300">
                      @{safeAuthor.username}
                    </p>
                  </div>
                </Link>
              )}

              <p className="category-tag">{post.category}</p>
            </div>
            <h3 className="text-30-bold">Pitch Details</h3>
            {parsedContent ? (
              <article
                className="prose max-w-4xl font-work-sans break-all"
                dangerouslySetInnerHTML={{ __html: parsedContent || "" }}
              />
            ) : (
              <p className="no-result">No details provided</p>
            )}
          </div>
          <hr className="divider" />

          {authorWalletAddress && (
            <SendMIKTransaction
              recipientAddress={authorWalletAddress}
              startupName={safeAuthor.username}
            />
          )}
        </section>
      </>
    );
  } catch (error) {
    console.error("Error loading startup page:", error);

    return (
      <div className="section_container">
        <h1 className="heading">Error Loading Startup</h1>
        <p className="sub-heading">
          Unable to load the requested startup information.
        </p>
        <Link href="/startups" className="btn-primary mt-6">
          Browse All Startups
        </Link>
      </div>
    );
  }
};

export default StartupPage;
