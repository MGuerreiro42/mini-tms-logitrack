'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { publicTrackingPath } from '../lib/public-tracking-path';

export function PublicTrackingForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const trimmed = code.trim();

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (trimmed) router.push(publicTrackingPath(trimmed));
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="trackingCode">Tracking code</Label>
        <Input
          id="trackingCode"
          placeholder="TMS-XXXXXXXXXXXX"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={!trimmed}>
        Track shipment
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Public tracking doesn't show the full address, notes, or who is
        involved.
      </p>
    </form>
  );
}
