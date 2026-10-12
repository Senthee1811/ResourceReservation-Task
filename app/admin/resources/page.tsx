import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listResources } from "@/lib/resource-service";
import { toggleResourceStatusAction } from "@/app/actions/resource-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";

export const instant = false;

interface AdminResourcesPageProps {
  searchParams: Promise<{
    warning?: string;
  }>;
}

export default async function AdminResourcesPage({
  searchParams,
}: AdminResourcesPageProps) {
  await requireAdmin();
  const { warning } = await searchParams;

  const allResources = await listResources();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {warning && (
        <Alert variant="warning" title="Notice on Resource Deactivation" className="mb-6">
          {warning}
        </Alert>
      )}

      <PageHeader
        title="Resource Management"
        description="Configure organization resources, edit capacities and locations, and control reservation availability."
        action={
          <Link href="/admin/resources/new">
            <Button variant="primary">
              <svg
                className="mr-1.5 -ml-0.5 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Resource
            </Button>
          </Link>
        }
      />

      {allResources.length === 0 ? (
        <EmptyState
          title="No resources in system"
          description="Get started by adding your organization's first room, vehicle, lab, or equipment."
          action={
            <Link href="/admin/resources/new">
              <Button variant="primary">Add Resource</Button>
            </Link>
          }
        />
      ) : (
        <Card className="overflow-hidden p-0 border-slate-200 shadow-2xs dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                <tr>
                  <th scope="col" className="px-6 py-3.5">
                    Resource Name
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Category
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Capacity
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Location
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {allResources.map((resource) => (
                  <tr
                    key={resource.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                      <div>{resource.name}</div>
                      {resource.description && (
                        <div className="text-xs font-normal text-slate-500 line-clamp-1 max-w-xs">
                          {resource.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="neutral">{resource.type}</Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {resource.capacity}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {resource.location || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={resource.isActive ? "success" : "danger"}>
                        {resource.isActive ? "Active" : "Deactivated"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/resources/${resource.id}`}>
                          <Button variant="ghost" size="sm">
                            Calendar
                          </Button>
                        </Link>

                        <Link href={`/admin/resources/${resource.id}/edit`}>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </Link>

                        <form action={toggleResourceStatusAction} className="inline">
                          <input type="hidden" name="resourceId" value={resource.id} />
                          <Button
                            type="submit"
                            variant={resource.isActive ? "ghost" : "secondary"}
                            size="sm"
                            className={resource.isActive ? "text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30" : ""}
                          >
                            {resource.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
