import ConnectionButton from "@/components/ConnectionButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import CodeBlock from "@/components/codeBlock";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <header className="flex flex-col items-center justify-center text-center mb-16 pt-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Wallet SDK <ThemeToggle />
          </h1>
        </header>

        <section className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-10">标准组件展示</h2>

          <div className="grid gap-8 md:grid-cols-3">
            {/* 默认样式 */}
            <Card className="p-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">默认样式</CardTitle>
              </CardHeader>
              <CardContent className="py-6">
                <ConnectionButton showBalance={true} />
              </CardContent>
              <CodeBlock
                language="javascript"
                code={`
  <ConnectionButton showBalance={true} />
              `}
              />
            </Card>

            {/* 大尺寸完整版 */}
            <Card className="p-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">大尺寸完整版</CardTitle>
              </CardHeader>
              <CardContent className="py-6">
                <ConnectionButton size="lg" showBalance={true} />
              </CardContent>
              <CodeBlock
                language="javascript"
                code={`
 <ConnectionButton size="lg" showBalance={true} />
              `}
              />
            </Card>

            {/* 紧凑模式 */}
            <Card className="p-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">紧凑模式</CardTitle>
              </CardHeader>
              <CardContent className="py-6">
                <ConnectionButton size="sm" showBalance={true} />
              </CardContent>
              <CodeBlock
                language="javascript"
                code={`
 <ConnectionButton size="sm" showBalance={true} />
              `}
              />
            </Card>
            <Card className="p-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">icon</CardTitle>
              </CardHeader>
              <CardContent className="py-6">
                <ConnectionButton size="icon" />
              </CardContent>
              <CodeBlock
                language="javascript"
                code={`
  <ConnectionButton  size="icon" />
              `}
              />
            </Card>
            <Card className="p-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">默认样式不展示余额</CardTitle>
              </CardHeader>
              <CardContent className="py-6">
                <ConnectionButton />
              </CardContent>
              <CodeBlock
                language="javascript"
                code={`
  <ConnectionButton/>
              `}
              />
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
