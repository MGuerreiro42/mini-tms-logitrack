import { CarrierQueueTable } from '@/features/shipments/components/carrier-queue-table';
import { carrierDefaultView } from '@/lib/carrier-default-view';
import { getServerSession } from '@/lib/server-session';

export default async function CarrierQueuePage() {
  const session = await getServerSession();
  // Decided on the server, so a manager never paints Mine before Unclaimed (po-carrier Q2).
  return <CarrierQueueTable defaultView={carrierDefaultView(session?.role)} />;
}
