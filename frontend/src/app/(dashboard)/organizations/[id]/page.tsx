import type { Metadata } from 'next';
import { OrganizationDetail } from '@/components/organizations/OrganizationDetail';

export const metadata: Metadata = { title: 'Organization Details' };

export default function OrganizationDetailPage({ params }: { params: { id: string } }) {
  return <OrganizationDetail orgId={params.id} />;
}
