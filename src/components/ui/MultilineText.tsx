type MultilineTextTag = 'p' | 'span' | 'div'

interface MultilineTextProps {
  children: string | null | undefined
  as?: MultilineTextTag
  className?: string
  maxLength?: number
}

export function MultilineText({ children, as = 'p', className, maxLength }: MultilineTextProps) {
  if (!children) return null

  const text = maxLength && children.length > maxLength ? `${children.slice(0, maxLength)}…` : children
  const Tag = as

  return <Tag className={className ? `whitespace-pre-wrap ${className}` : 'whitespace-pre-wrap'}>{text}</Tag>
}
