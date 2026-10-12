"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { DomainError } from "@/lib/errors";
import {
  createResource,
  deactivateResource,
  updateResource,
  getResource,
} from "@/lib/resource-service";
import { resourceInputSchema } from "@/lib/validators";

export type ResourceFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  warning?: string;
};

export async function createResourceAction(
  _prevState: ResourceFormState,
  formData: FormData,
): Promise<ResourceFormState> {
  const actor = await requireAdmin();

  const raw = {
    name: formData.get("name"),
    type: formData.get("type"),
    capacity: formData.get("capacity"),
    location: formData.get("location"),
    description: formData.get("description"),
    isActive: formData.get("isActive"),
  };

  const parsed = resourceInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0]?.toString();
      if (path && !fieldErrors[path]) {
        fieldErrors[path] = issue.message;
      }
    }
    return { fieldErrors };
  }

  try {
    await createResource(actor, parsed.data);
  } catch (err) {
    if (err instanceof DomainError) {
      if (err.code === "CONFLICT") {
        return { fieldErrors: { name: err.message } };
      }
      return { error: err.message };
    }
    return { error: "An unexpected error occurred while creating resource" };
  }

  revalidatePath("/resources");
  revalidatePath("/admin/resources");
  redirect("/admin/resources");
}

export async function updateResourceAction(
  resourceId: string,
  _prevState: ResourceFormState,
  formData: FormData,
): Promise<ResourceFormState> {
  const actor = await requireAdmin();

  const raw = {
    name: formData.get("name"),
    type: formData.get("type"),
    capacity: formData.get("capacity"),
    location: formData.get("location"),
    description: formData.get("description"),
    isActive: formData.get("isActive"),
  };

  const parsed = resourceInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0]?.toString();
      if (path && !fieldErrors[path]) {
        fieldErrors[path] = issue.message;
      }
    }
    return { fieldErrors };
  }

  try {
    await updateResource(actor, resourceId, parsed.data);
  } catch (err) {
    if (err instanceof DomainError) {
      if (err.code === "CONFLICT") {
        return { fieldErrors: { name: err.message } };
      }
      return { error: err.message };
    }
    return { error: "An unexpected error occurred while updating resource" };
  }

  revalidatePath("/resources");
  revalidatePath(`/resources/${resourceId}`);
  revalidatePath("/admin/resources");
  redirect("/admin/resources");
}

export async function toggleResourceStatusAction(formData: FormData): Promise<void> {
  const actor = await requireAdmin();
  const resourceId = formData.get("resourceId") as string;
  if (!resourceId) return;

  const resource = await getResource(resourceId);

  if (resource.isActive) {
    const { upcomingCount } = await deactivateResource(actor, resourceId);
    revalidatePath("/resources");
    revalidatePath("/admin/resources");
    if (upcomingCount > 0) {
      redirect(
        `/admin/resources?warning=${encodeURIComponent(
          `Resource deactivated. Notice: It currently has ${upcomingCount} upcoming confirmed reservation(s).`,
        )}`,
      );
    }
  } else {
    await updateResource(actor, resourceId, {
      name: resource.name,
      type: resource.type,
      capacity: resource.capacity,
      location: resource.location || "",
      description: resource.description || "",
      isActive: true,
    });
    revalidatePath("/resources");
    revalidatePath("/admin/resources");
  }

  redirect("/admin/resources");
}
