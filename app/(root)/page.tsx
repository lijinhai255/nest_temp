import { getStartups } from "@/lib/db/startup";
import { getAuthors } from "@/lib/db/author";
import StartupCard from "@/components/StartupCard";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  const query = (await searchParams).query;
  const { data: posts } = await getStartups();
  const { data: users } = await getAuthors();

  // map posts 根据 walletAddress 找出 user 然后给作品加上作者的信息
  const postsWithAuthors = posts?.map((post) => {
    const author = users?.find(
      (user) => user.walletAddress === post.walletAddress
    );
    return {
      ...post,
      author,
    };
  });

  // 如果有查询参数，根据查询过滤结果
  const filteredPosts = query
    ? postsWithAuthors?.filter(
        (post) =>
          post.title?.toLowerCase().includes(query.toLowerCase()) ||
          post.description?.toLowerCase().includes(query.toLowerCase())
      )
    : postsWithAuthors;

  console.log("posts with authors", postsWithAuthors);

  return (
    <>
      <section className="pink_container">
        <h1 className="heading">
          Pitch Your Startup, <br /> Connect with Entrepreneurs{" "}
        </h1>
        <p className="sub-heading !max-w-3xl">
          Submit Ideas, Vote on Pitches, and Get Noticed in Virtual Competitions
        </p>
        {/* <SearchForm query={query} /> */}
      </section>
      <section className="section_container">
        <p className="text-30-semibold">
          {query ? `Search results for "${query}"` : "All Startups"}
        </p>
        <ul className="mt-7 card_grid">
          {filteredPosts?.length > 0 ? (
            filteredPosts.map((post) => (
              <StartupCard key={post.id} post={post} />
            ))
          ) : (
            <p className="no-results">No posts found</p>
          )}
        </ul>
      </section>
    </>
  );
}