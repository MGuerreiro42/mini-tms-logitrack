'use client';

import Link from 'next/link';
import { StatTile } from '@/components/common/stat-tile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminDashboard } from '../hooks/use-admin-dashboard';

export function AdminDashboard() {
  const { isLoading, counts } = useAdminDashboard();

  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <StatTile label="Sellers" value={counts.sellersTotal} />
        <StatTile label="Carriers" value={counts.carriersTotal} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sellers pending approval</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-bold tracking-tight">
              {counts.sellersPending}
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/sellers">View queue →</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Carriers pending approval</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-bold tracking-tight">
              {counts.carriersPending}
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/carriers">View queue →</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
