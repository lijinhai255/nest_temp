import Link from "next/link";
import Image from "next/image";
import ConnectionButton from "./ConnectionButton";

export default function Navbar() {
  return (
    <header className="px-5 py-3  shadow-sm font-work-sans text-muted-foreground">
      <nav className="flex justify-between items-center">
        <Link href="/">
          <Image src="/logo.png" alt="Logo" width={120} height={30} />
        </Link>
        <div className="flex items-center gap-5 text-black">
          <>
            <Link href="/nft" className="text-gray-600">
              <span>nft</span>
            </Link>
            <Link href="/performance" className="text-gray-600">
              <span>performance</span>
            </Link>
            <Link href="/ethers" className="text-gray-600">
              <span>ethers</span>
            </Link>
            <Link href="/wagmi" className="text-gray-600">
              <span>wagmi</span>
            </Link>
            <Link href="/startup/ai" className="text-gray-600">
              <span>AI-helper</span>
            </Link>
            <Link href="/startup/create" className="text-gray-600">
              <span>Create</span>
            </Link>
            <Link href="/profile" className="text-gray-600">
              <span>profile</span>
            </Link>

            <ConnectionButton />
          </>
        </div>
      </nav>
    </header>
  );
}
