import { requireAdmin } from "@/lib/auth";
import { listResourceTypes } from "@/lib/resource-service";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ResourceForm } from "../resource-form";

export const instant = false;

export default async function NewResourcePage() {
  await requireAdmin();
  const existingTypes = await listResourceTypes();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Add New Resource"
        description="Register a shared organization room, vehicle, laboratory, or equipment item."
      />

      <Card>
        <ResourceForm existingTypes={existingTypes} />
      </Card>
    </div>
  );
}
