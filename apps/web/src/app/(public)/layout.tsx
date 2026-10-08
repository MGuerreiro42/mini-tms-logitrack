import { CenteredPage } from '@/components/common/message-card';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CenteredPage>{children}</CenteredPage>;
}
