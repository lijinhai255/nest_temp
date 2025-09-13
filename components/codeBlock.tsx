import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

function CodeBlock({ code, language }: { code: string; language: string }) {
  return (
    <SyntaxHighlighter
      language={language}
      style={vscDarkPlus}
      showLineNumbers
      wrapLines
    >
      {code}
    </SyntaxHighlighter>
  );
}

export default CodeBlock;
