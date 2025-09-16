import Link from "next/link";
import Image from "next/image";
import ConnectionButton from "./ConnectionButton";
import { Button } from "./ui/button";

export default function Navbar() {
  return (
    <header className="px-5 py-3  shadow-sm font-work-sans text-muted-foreground">
      <nav className="flex justify-between items-center text-primary-foreground">
        <Link href="/">
          <Image src="/logo.png" alt="Logo" width={120} height={30} />
        </Link>
        <div className="flex items-center gap-5 text-black">
          <Link className="text-primary-foreground" href="/">
            <span>Stake</span>
          </Link>
          <Link className="text-primary-foreground" href="/withdraw">
            <span>Withdraw</span>
          </Link>

          <ConnectionButton />
        </div>
      </nav>
    </header>
  );
}
