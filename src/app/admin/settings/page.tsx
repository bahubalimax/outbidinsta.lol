import { getSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/settings-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const s = await getSettings(true);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <p className="text-sm text-muted-foreground">
        Business rules. Amounts are entered in whole currency units. Changes take effect immediately.
      </p>
      <SettingsForm initial={s} />
    </div>
  );
}
