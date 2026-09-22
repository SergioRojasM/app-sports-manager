import type { ReactNode } from 'react';
import { cx } from './styles';

type GritPageContainerProps = {
  children: ReactNode;
  className?: string;
};

/** Page body wrapper from the design's Body frame: 1440 max, 48px side padding, 32px gap (US-0116). */
export function GritPageContainer({ children, className }: GritPageContainerProps) {
  return (
    <div className={cx('mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 pb-12 pt-6 sm:px-6 lg:px-12', className)}>
      {children}
    </div>
  );
}
