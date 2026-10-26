import { getFamilyContext } from "@/lib/family";
import { FamilyProvider } from "@/components/family-provider";
import { AppHeader, BottomNav } from "@/components/app-nav";
import { MilestoneWatcher } from "@/components/milestone-watcher";
import { RecurringSync } from "@/components/recurring-sync";
import { NotificationsProvider } from "@/components/notifications-provider";
import { I18nProvider } from "@/components/i18n-provider";
import { getRequestLocale } from "@/lib/i18n/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getFamilyContext();
  // the profile's language wins over cookie / browser language
  const locale = ctx.me.locale ?? (await getRequestLocale());
  return (
    <I18nProvider locale={locale} userId={ctx.me.id}>
      <FamilyProvider value={ctx}>
        <NotificationsProvider>
          <AppHeader />
          <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">{children}</div>
          <BottomNav />
          <MilestoneWatcher />
          <RecurringSync />
        </NotificationsProvider>
      </FamilyProvider>
    </I18nProvider>
  );
}
