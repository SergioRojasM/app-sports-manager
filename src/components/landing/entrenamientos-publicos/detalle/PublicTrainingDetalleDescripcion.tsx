'use client';

import ReactMarkdown from 'react-markdown';
import { GritSectionHeading } from '@/components/ui';

type PublicTrainingDetalleDescripcionProps = {
  descripcionLarga: string | null;
};

/**
 * Long-form description, matching design node `Z08z5i` (US-0109, restyled in US-0116).
 *
 * Rendered through `react-markdown`, which builds a React element tree rather
 * than injecting HTML — no `dangerouslySetInnerHTML` anywhere in this path. Raw
 * HTML in an admin-authored description (a `<script>` tag, an `<img onerror>`)
 * is therefore emitted as literal text and can never execute. Do not add
 * `rehype-raw` or an HTML-passthrough plugin here without re-reviewing that.
 */
export function PublicTrainingDetalleDescripcion({ descripcionLarga }: PublicTrainingDetalleDescripcionProps) {
  // Hidden entirely when empty — the short `descripcion` is already the hero
  // subtitle, so falling back to it would duplicate that text (US-0109)
  if (!descripcionLarga || descripcionLarga.trim() === '') return null;

  return (
    <section className="flex flex-col gap-3">
      <GritSectionHeading title="Descripción" />
      <div
        className="flex flex-col gap-3 font-grit-body text-sm font-medium text-grit-subtext
          [&_a]:text-grit-cyan [&_a]:underline
          [&_h1]:font-grit-title [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-grit-text
          [&_h2]:font-grit-title [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-grit-text
          [&_h3]:font-grit-title [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-grit-text
          [&_strong]:font-bold [&_strong]:text-grit-text
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5
          [&_blockquote]:border-l-2 [&_blockquote]:border-grit-cyan/40 [&_blockquote]:pl-3
          [&_code]:rounded-grit-xs [&_code]:bg-grit-card [&_code]:px-1 [&_code]:py-0.5"
      >
        <ReactMarkdown>{descripcionLarga}</ReactMarkdown>
      </div>
    </section>
  );
}
