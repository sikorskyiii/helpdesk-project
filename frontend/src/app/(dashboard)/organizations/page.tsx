import type { Metadata } from 'next';
import { OrganizationsList } from '@/components/organizations/OrganizationsList';

export const metadata: Metadata = { title: 'Organizations' };

export default function OrganizationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Organizations</h1>
        <p className="text-muted-foreground">Manage your organizations and team members.</p>
      </div>
      <OrganizationsList />
    </div>
  );
}
