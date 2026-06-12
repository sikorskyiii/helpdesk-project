'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMyOrganizations, useCreateOrganization } from '@/hooks/useOrganizations';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatDate } from '@/lib/utils';

const createSchema = z.object({
  name: z.string().min(2),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, hyphens'),
  description: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;

export function OrganizationsList() {
  const { data: orgs, isLoading } = useMyOrganizations();
  const createOrg = useCreateOrganization();
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateForm>({ resolver: zodResolver(createSchema) });

  const onSubmit = (data: CreateForm) => {
    createOrg.mutate(data, {
      onSuccess: () => {
        reset();
        setShowForm(false);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {showForm ? 'Cancel' : '+ New Organization'}
        </button>
      </div>

      {showForm && (
        <div className="border rounded-xl p-6 bg-card">
          <h3 className="font-semibold mb-4">Create Organization</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Name</label>
                <input
                  {...register('name')}
                  placeholder="Acme Corp"
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium">Slug</label>
                <input
                  {...register('slug')}
                  placeholder="acme-corp"
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors.slug && <p className="text-destructive text-xs mt-1">{errors.slug.message}</p>}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                {...register('description')}
                rows={2}
                placeholder="Optional description"
                className="w-full mt-1 px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createOrg.isPending}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {createOrg.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {!orgs?.length ? (
        <div className="text-center py-16 text-muted-foreground border rounded-xl">
          <p className="text-lg">No organizations yet</p>
          <p className="text-sm mt-1">Create your first organization to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orgs.map((org: any) => (
            <Link key={org.id} href={`/organizations/${org.id}`}>
              <div className="border rounded-xl p-5 bg-card hover:border-primary transition-colors cursor-pointer group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      org.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {org.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <h3 className="font-semibold group-hover:text-primary transition-colors">{org.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">/{org.slug}</p>
                {org.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{org.description}</p>
                )}
                <div className="flex gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
                  <span>{org._count?.members ?? 0} members</span>
                  <span>{org._count?.tickets ?? 0} tickets</span>
                  {org.myRole && (
                    <span className="ml-auto text-primary font-medium">
                      {org.myRole.name.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
