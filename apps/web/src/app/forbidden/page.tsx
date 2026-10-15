import type { Metadata } from 'next';
import Link from 'next/link';
import { NoticePage } from '@/components/common/notice-page';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/routes';
import { getServerSession } from '@/lib/server-session';
import {
  FORBIDDEN_AREA_PARAM,
  isSegment,
  ROLE_HOME,
  type Segment,
} from '@/lib/session';
import type { GlobalRole } from '@/types/auth';

export const metadata: Metadata = { title: 'Access denied · Mini TMS' };

const AREA_AUDIENCE: Record<Segment, string> = {
  admin: 'platform admins',
  seller: 'sellers',
  carrier: 'carriers',
};

const ROLE_ACCOUNT: Record<GlobalRole, string> = {
  ADMIN: 'admin',
  SELLER: 'seller',
  CARRIER_MANAGER: 'carrier manager',
  CARRIER_OPERATOR: 'carrier operator',
};

export default async function ForbiddenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, params] = await Promise.all([
    getServerSession(),
    searchParams,
  ]);
  const area = params[FORBIDDEN_AREA_PARAM];

  return (
    <NoticePage
      code="403"
      title={
        typeof area === 'string' && isSegment(area)
          ? `This area is for ${AREA_AUDIENCE[area]}`
          : "You don't have access to this page"
      }
      description={
        session
          ? `You're signed in as ${session.email} (${ROLE_ACCOUNT[session.role]}). Your session is still active.`
          : 'Sign in with an account that can open it.'
      }
      actions={
        <Button asChild>
          {session ? (
            <Link href={ROLE_HOME[session.role]}>Go to your dashboard</Link>
          ) : (
            <Link href={ROUTES.login}>Go to sign in</Link>
          )}
        </Button>
      }
    />
  );
}
