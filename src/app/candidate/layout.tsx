import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/session";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireUser("candidate");
  return (
    <>
      <AppHeader home="/candidate" />
      <div className="flex flex-1 flex-col">{children}</div>
    </>
  );
}
