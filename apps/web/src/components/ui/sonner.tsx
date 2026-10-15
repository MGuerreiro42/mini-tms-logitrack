'use client';

import { OctagonXIcon, TriangleAlertIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const dot = <span className="size-2 rounded-full bg-primary-inverse" />;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      icons={{
        success: dot,
        info: dot,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
      }}
      style={
        {
          '--normal-bg': 'var(--foreground)',
          '--normal-text': 'var(--background)',
          '--normal-border': 'var(--foreground)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
