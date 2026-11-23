import type { ReactNode } from 'react';
import { cx } from './styles';

type GritPageContainerProps = {
  children: ReactNode;
  className?: string;
};

/** Page body wrapper from the v3 "Content" frame: padding 12/32/32/32, 20px gap, 1440 max (US-0141). */
export function GritPageContainer({ children, className }: GritPageContainerProps) {
  return (
    <div className={cx('mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 pb-8 pt-3 sm:px-6 lg:px-8', className)}>
      {children}
    </div>
  );
}
