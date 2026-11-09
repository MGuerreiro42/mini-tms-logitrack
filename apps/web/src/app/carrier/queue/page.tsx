import { CarrierQueueTable } from '@/features/shipments/components/carrier-queue-table';
import { getServerSession } from '@/lib/server-session';

export default async function CarrierQueuePage() {
  const session = await getServerSession();
  // Decided on the server, so a manager never paints Mine before Unclaimed (po-carrier Q2).
  const defaultView =
    session?.role === 'CARRIER_MANAGER' ? 'unclaimed' : 'mine';
  return <CarrierQueueTable defaultView={defaultView} />;
}
