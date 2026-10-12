import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getResource, listResourceTypes } from "@/lib/resource-service";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ResourceForm } from "../../resource-form";
import { DomainError } from "@/lib/errors";
import type { Resource } from "@/lib/db/schema";

export const instant = false;

interface EditResourcePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditResourcePage({ params }: EditResourcePageProps) {
  await requireAdmin();
  const { id } = await params;

  let resource: Resource;
  let existingTypes: string[] = [];

  try {
    [resource, existingTypes] = await Promise.all([
      getResource(id),
      listResourceTypes(),
    ]);
  } catch (err) {
    if (err instanceof DomainError && err.code === "NOT_FOUND") {
      notFound();
    }
    throw err;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title={`Edit ${resource.name}`}
        description="Update details, capacity, location, and reservation status."
      />

      <Card>
        <ResourceForm resource={resource} existingTypes={existingTypes} />
      </Card>
    </div>
  );
}
