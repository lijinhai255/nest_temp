import Link from "next/link";
import Image from "next/image";
import ConnectionButton from "./ConnectionButton";
import { ThemeToggle } from "./ThemeToggle";

export default function Navbar() {
  return (
    <header className="px-5 py-3 shadow-sm font-work-sans text-muted-foreground">
      <nav className="flex justify-between items-center text-primary-text-color">
        <Link href="/">
          <Image
            src="/logo.png"
            alt="Logo"
            width={120}
            height={30}
            priority={true}
            loading="eager"
          />
        </Link>
        <div className="flex items-center gap-5">
          <Link className="hover:text-primary transition-colors" href="/">
            <span>Swap</span>
          </Link>
          <Link className="hover:text-primary transition-colors" href="/pool">
            <span>Pool</span>
          </Link>
          <Link className="hover:text-primary transition-colors" href="/explore">
            <span>Explore</span>
          </Link>
          <ThemeToggle />
          <ConnectionButton />
        </div>
      </nav>
    </header>
  );
}
