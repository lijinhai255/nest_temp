import StartupFrom from "@/components/StartupFrom";

const createPage = async () => {
  return (
    <>
      <section className="pink_container !min-h-[230px]">
        <h1 className="heading"> Submint Your Startup Pitch </h1>
      </section>
      <StartupFrom />
    </>
  );
};
export default createPage;
