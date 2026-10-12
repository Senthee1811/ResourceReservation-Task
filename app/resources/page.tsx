import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listResources, listResourceTypes } from "@/lib/resource-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";

export const instant = false;

interface ResourcesPageProps {
  searchParams: Promise<{
    search?: string;
    type?: string;
    error?: string;
  }>;
}

export default async function ResourcesPage({ searchParams }: ResourcesPageProps) {
  await requireUser();
  const { search, type, error } = await searchParams;

  const [resourcesList, types] = await Promise.all([
    listResources({
      onlyActive: true,
      search: search || undefined,
      type: type || undefined,
    }),
    listResourceTypes(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {error === "forbidden" && (
        <Alert
          variant="error"
          title="Access Restricted"
          className="mb-6"
        >
          You do not have administrative permissions to access that page.
        </Alert>
      )}

      <PageHeader
        title="Available Resources"
        description="Browse shared organizational rooms, labs, equipment, and vehicles to book available time slots."
      />

      {/* Filter and Search Bar */}
      <div className="mb-8 rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <form method="GET" className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              type="text"
              name="search"
              defaultValue={search || ""}
              placeholder="Search by resource name..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="w-full sm:w-48">
            <select
              name="type"
              defaultValue={type || "ALL"}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="ALL">All Types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button type="submit" variant="primary">
              Filter
            </Button>
            {(search || (type && type !== "ALL")) && (
              <Link href="/resources">
                <Button variant="outline" type="button">
                  Clear
                </Button>
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Resource Cards Grid */}
      {resourcesList.length === 0 ? (
        <EmptyState
          title="No resources found"
          description={
            search || type
              ? "No available resources matched your current filter criteria. Try adjusting your search term."
              : "There are currently no active resources available for booking."
          }
          action={
            (search || type) && (
              <Link href="/resources">
                <Button variant="outline">Reset Filters</Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {resourcesList.map((resource) => (
            <Card
              key={resource.id}
              className="flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div>
                <CardHeader className="mb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg font-bold">
                      {resource.name}
                    </CardTitle>
                    <Badge variant="info">{resource.type}</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-1">
                  <div className="flex flex-wrap gap-y-2 gap-x-4 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <svg
                        className="h-4 w-4 text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.75"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                        />
                      </svg>
                      <span>Capacity: {resource.capacity}</span>
                    </div>

                    {resource.location && (
                      <div className="flex items-center gap-1.5">
                        <svg
                          className="h-4 w-4 text-slate-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.75"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                          />
                        </svg>
                        <span>{resource.location}</span>
                      </div>
                    )}
                  </div>

                  {resource.description && (
                    <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                      {resource.description}
                    </p>
                  )}
                </CardContent>
              </div>

              <CardFooter className="mt-4 pt-3">
                <Link href={`/resources/${resource.id}`} className="w-full">
                  <Button variant="primary" className="w-full">
                    View availability & book
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
