'use client';

import ReactMarkdown from 'react-markdown';

type PublicTrainingDetalleDescripcionProps = {
  descripcionLarga: string | null;
};

/**
 * Long-form description, matching design node `Z08z5i` (US-0109).
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
      <h2 className="font-landing-display text-[22px] font-bold text-landing-text">Descripción</h2>
      <div
        className="flex flex-col gap-3 font-landing-body text-sm font-medium text-landing-text-secondary
          [&_a]:text-landing-primary [&_a]:underline
          [&_h1]:font-landing-display [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-landing-text
          [&_h2]:font-landing-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-landing-text
          [&_h3]:font-landing-display [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-landing-text
          [&_strong]:font-bold [&_strong]:text-landing-text
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5
          [&_blockquote]:border-l-2 [&_blockquote]:border-landing-primary/40 [&_blockquote]:pl-3
          [&_code]:rounded [&_code]:bg-landing-surface-card [&_code]:px-1 [&_code]:py-0.5"
      >
        <ReactMarkdown>{descripcionLarga}</ReactMarkdown>
      </div>
    </section>
  );
}
