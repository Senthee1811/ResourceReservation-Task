"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  createResourceAction,
  updateResourceAction,
  type ResourceFormState,
} from "@/app/actions/resource-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import type { Resource } from "@/lib/db/schema";

interface ResourceFormProps {
  resource?: Resource;
  existingTypes?: string[];
}

export function ResourceForm({ resource, existingTypes = [] }: ResourceFormProps) {
  const isEditing = Boolean(resource);

  const action = isEditing && resource
    ? updateResourceAction.bind(null, resource.id)
    : createResourceAction;

  const [state, formAction, isPending] = useActionState<ResourceFormState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state?.error && (
        <Alert variant="error" title="Submission Error">
          {state.error}
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input
            label="Resource Name"
            name="name"
            required
            defaultValue={resource?.name || ""}
            placeholder="e.g. Executive Boardroom, Chemistry Lab 3, Van #4"
            error={state?.fieldErrors?.name}
            helperText="Must be unique across the organization"
          />
        </div>

        <div>
          <Input
            label="Type / Category"
            name="type"
            required
            defaultValue={resource?.type || (existingTypes[0] || "Room")}
            placeholder="e.g. Room, Lab, Vehicle, Equipment"
            list="type-options"
            error={state?.fieldErrors?.type}
            helperText="Grouping category for filters"
          />
          <datalist id="type-options">
            {existingTypes.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>

        <div>
          <Input
            label="Capacity"
            name="capacity"
            type="number"
            min="1"
            max="10000"
            required
            defaultValue={resource?.capacity ?? 1}
            error={state?.fieldErrors?.capacity}
            helperText="Number of persons or units supported"
          />
        </div>

        <div className="sm:col-span-2">
          <Input
            label="Location"
            name="location"
            defaultValue={resource?.location || ""}
            placeholder="e.g. Building B - 2nd Floor, Parking Lot A"
            error={state?.fieldErrors?.location}
            helperText="Physical campus location or parking slot"
          />
        </div>

        <div className="sm:col-span-2">
          <Textarea
            label="Description & Equipment Notes"
            name="description"
            rows={3}
            defaultValue={resource?.description || ""}
            placeholder="e.g. Projector, 12 seats, whiteboard, HDMI switcher"
            error={state?.fieldErrors?.description}
            helperText="Details visible to users when booking"
          />
        </div>

        <div className="sm:col-span-2">
          <div className="relative flex items-start">
            <div className="flex h-6 items-center">
              <input
                id="isActive"
                name="isActive"
                type="checkbox"
                defaultChecked={resource ? resource.isActive : true}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div className="ml-3 text-sm leading-6">
              <label htmlFor="isActive" className="font-medium text-slate-900 dark:text-slate-100">
                Active for Reservations
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                When unchecked, members cannot see or make new reservations for this resource.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-6 dark:border-slate-800">
        <Link href="/admin/resources">
          <Button variant="outline" type="button">
            Cancel
          </Button>
        </Link>
        <Button variant="primary" type="submit" isLoading={isPending}>
          {isEditing ? "Save Changes" : "Create Resource"}
        </Button>
      </div>
    </form>
  );
}
