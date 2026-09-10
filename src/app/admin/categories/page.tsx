import { CategoriesManager } from "@/components/admin/categories-manager";

export const dynamic = "force-dynamic";

export default function AdminCategoriesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Categories</h1>
      <p className="text-sm text-muted-foreground">
        Create, rename, describe, reorder, disable or delete categories. Deleting only works when a
        category has no listings — otherwise disable it.
      </p>
      <CategoriesManager />
    </div>
  );
}
