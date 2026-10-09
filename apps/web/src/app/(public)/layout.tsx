import { CenteredPage } from '@/components/common/centered-page';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CenteredPage>{children}</CenteredPage>;
}
