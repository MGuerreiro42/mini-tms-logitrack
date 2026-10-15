import Link from 'next/link';
import { NoticePage } from '@/components/common/notice-page';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/routes';

export default function NotFound() {
  return (
    <NoticePage
      code="404"
      title="Page not found"
      description="This address doesn't match any page. It may have been moved, or the link has a typo."
      actions={
        <Button asChild>
          <Link href={ROUTES.home}>Go home</Link>
        </Button>
      }
    />
  );
}
