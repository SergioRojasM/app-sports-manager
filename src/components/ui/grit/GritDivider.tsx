import { cx } from './styles';

/** 1px glass-border rule from the design's Divider frame (US-0116). */
export function GritDivider({ className }: { className?: string }) {
  return <div className={cx('h-px w-full bg-grit-glass-border', className)} role="separator" />;
}
