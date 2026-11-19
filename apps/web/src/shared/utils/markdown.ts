/**
 * Zero-dependency, XSS-safe Markdown renderer tailored for warm editorial typography.
 * Escapes all raw HTML first before applying Markdown formatting rules.
 */

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('/')
  ) {
    return escapeHtml(trimmed);
  }
  return null;
}

function renderInline(escapedLine: string): string {
  let out = escapedLine;
  // Inline code
  out = out.replace(
    /`([^`]+)`/g,
    '<code class="px-1.5 py-0.5 rounded bg-[#EFECE4] text-[#C25438] font-mono text-[0.88em]">$1</code>'
  );
  // Links [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) => {
    const safe = sanitizeUrl(url);
    if (!safe) return text;
    return `<a href="${safe}" target="_blank" rel="noopener noreferrer" class="text-[#C25438] underline decoration-[#C25438]/40 underline-offset-4 hover:decoration-[#C25438]">${text}</a>`;
  });
  // Bold **text**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-[#1D1C1A]">$1</strong>');
  // Italic *text*
  out = out.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
  // Strikethrough ~~text~~
  out = out.replace(/~~([^~]+)~~/g, '<del class="line-through text-[#9E9B93]">$1</del>');
  return out;
}

export function renderMarkdown(markdown: string): string {
  if (!markdown) return '';

  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let inList: 'ul' | 'ol' | null = null;

  const closeList = () => {
    if (inList) {
      html.push(inList === 'ul' ? '</ul>' : '</ol>');
      inList = null;
    }
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (trimmed.startsWith('```')) {
      closeList();
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBuffer = [];
      } else {
        inCodeBlock = false;
        html.push(
          `<pre class="my-4 overflow-x-auto rounded-xl border border-[#E5E1D8] bg-[#EFECE4]/70 p-4 font-mono text-xs leading-relaxed text-[#1D1C1A]"><code>${escapeHtml(
            codeBuffer.join('\n')
          )}</code></pre>`
        );
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    if (!trimmed) {
      closeList();
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      closeList();
      html.push('<hr class="my-6 border-[#E5E1D8]" />');
      continue;
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      const content = renderInline(escapeHtml(headingMatch[2]));
      const cls =
        level === 1
          ? 'font-serif text-2xl font-medium text-[#1D1C1A] mt-6 mb-3'
          : level === 2
          ? 'font-serif text-xl font-medium text-[#1D1C1A] mt-5 mb-2.5'
          : 'font-serif text-base font-semibold text-[#1D1C1A] mt-4 mb-2';
      html.push(`<h${level} class="${cls}">${content}</h${level}>`);
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      closeList();
      const quoteText = renderInline(escapeHtml(trimmed.replace(/^>\s?/, '')));
      html.push(
        `<blockquote class="my-4 border-l-2 border-[#C25438] pl-4 font-serif italic text-[#5C5951]">${quoteText}</blockquote>`
      );
      continue;
    }

    // Unordered list
    const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (ulMatch) {
      if (inList !== 'ul') {
        closeList();
        inList = 'ul';
        html.push('<ul class="my-3 list-disc pl-5 space-y-1.5 text-[#1D1C1A]">');
      }
      html.push(`<li class="leading-relaxed">${renderInline(escapeHtml(ulMatch[1]))}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (inList !== 'ol') {
        closeList();
        inList = 'ol';
        html.push('<ol class="my-3 list-decimal pl-5 space-y-1.5 text-[#1D1C1A]">');
      }
      html.push(`<li class="leading-relaxed">${renderInline(escapeHtml(olMatch[1]))}</li>`);
      continue;
    }

    closeList();
    html.push(`<p class="my-3 leading-relaxed text-[#1D1C1A]">${renderInline(escapeHtml(rawLine))}</p>`);
  }

  closeList();
  if (inCodeBlock) {
    html.push(
      `<pre class="my-4 overflow-x-auto rounded-xl border border-[#E5E1D8] bg-[#EFECE4]/70 p-4 font-mono text-xs leading-relaxed text-[#1D1C1A]"><code>${escapeHtml(
        codeBuffer.join('\n')
      )}</code></pre>`
    );
  }

  return html.join('\n');
}
