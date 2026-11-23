import { cx } from './styles';

/** 1px neutral rule from the v3 Divider frames (`#FFFFFF0F`, US-0141). */
export function GritDivider({ className }: { className?: string }) {
  return <div className={cx('h-px w-full bg-white/[0.06]', className)} role="separator" />;
}
