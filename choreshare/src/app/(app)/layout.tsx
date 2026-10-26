import { getFamilyContext } from "@/lib/family";
import { FamilyProvider } from "@/components/family-provider";
import { AppHeader, BottomNav } from "@/components/app-nav";
import { MilestoneWatcher } from "@/components/milestone-watcher";
import { NotificationsProvider } from "@/components/notifications-provider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getFamilyContext();
  return (
    <FamilyProvider value={ctx}>
      <NotificationsProvider>
        <AppHeader />
        <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">{children}</div>
        <BottomNav />
        <MilestoneWatcher />
      </NotificationsProvider>
    </FamilyProvider>
  );
}
