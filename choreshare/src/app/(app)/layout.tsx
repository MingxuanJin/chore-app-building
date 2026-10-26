import { getFamilyContext } from "@/lib/family";
import { FamilyProvider } from "@/components/family-provider";
import { AppHeader, BottomNav } from "@/components/app-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getFamilyContext();
  return (
    <FamilyProvider value={ctx}>
      <AppHeader />
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">{children}</div>
      <BottomNav />
    </FamilyProvider>
  );
}
