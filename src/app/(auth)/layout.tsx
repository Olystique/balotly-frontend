import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-voter flex-1 flex-col gap-8 px-4 py-8">
      <Link href="/" className="font-display text-xl font-semibold tracking-tight">
        Balotly
      </Link>
      {children}
    </main>
  );
}
