/**
 * Zero-dependency, XSS-safe Markdown renderer tailored for fine-press editorial typography.
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
    '<code class="px-1.5 py-0.5 rounded-[2px] bg-[#EAE4D8]/80 text-[#9A3F2B] font-mono text-[0.86em]">$1</code>'
  );
  // Links [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) => {
    const safe = sanitizeUrl(url);
    if (!safe) return text;
    return `<a href="${safe}" target="_blank" rel="noopener noreferrer" class="text-[#9A3F2B] underline decoration-[#9A3F2B]/35 underline-offset-4 hover:decoration-[#9A3F2B] transition-colors">${text}</a>`;
  });
  // Bold **text**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-medium text-[#161513]">$1</strong>');
  // Italic *text*
  out = out.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
  // Strikethrough ~~text~~
  out = out.replace(/~~([^~]+)~~/g, '<del class="line-through text-[#9B9488]">$1</del>');
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
          `<pre class="my-6 overflow-x-auto rounded-[2px] border border-[#DDD6C9] bg-[#F3EFE7] p-5 font-mono text-xs leading-relaxed text-[#161513]"><code>${escapeHtml(
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
      html.push('<hr class="my-8 border-[#DDD6C9]" />');
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
          ? 'font-serif text-2xl font-normal tracking-[0.02em] text-[#161513] mt-8 mb-4'
          : level === 2
          ? 'font-serif text-xl font-normal tracking-[0.02em] text-[#161513] mt-7 mb-3'
          : 'font-serif text-base font-medium text-[#161513] mt-5 mb-2';
      html.push(`<h${level} class="${cls}">${content}</h${level}>`);
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      closeList();
      const quoteText = renderInline(escapeHtml(trimmed.replace(/^>\s?/, '')));
      html.push(
        `<blockquote class="my-6 border-l border-[#9A3F2B] pl-5 font-serif text-[#57534C] leading-[1.9]">${quoteText}</blockquote>`
      );
      continue;
    }

    // Unordered list
    const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (ulMatch) {
      if (inList !== 'ul') {
        closeList();
        inList = 'ul';
        html.push('<ul class="my-4 list-disc pl-5 space-y-2 text-[#262420]">');
      }
      html.push(`<li class="leading-[1.85]">${renderInline(escapeHtml(ulMatch[1]))}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (inList !== 'ol') {
        closeList();
        inList = 'ol';
        html.push('<ol class="my-4 list-decimal pl-5 space-y-2 text-[#262420]">');
      }
      html.push(`<li class="leading-[1.85]">${renderInline(escapeHtml(olMatch[1]))}</li>`);
      continue;
    }

    closeList();
    html.push(`<p class="my-4 leading-[1.95] text-[#262420] font-serif font-light">${renderInline(escapeHtml(rawLine))}</p>`);
  }

  closeList();
  if (inCodeBlock) {
    html.push(
      `<pre class="my-6 overflow-x-auto rounded-[2px] border border-[#DDD6C9] bg-[#F3EFE7] p-5 font-mono text-xs leading-relaxed text-[#161513]"><code>${escapeHtml(
        codeBuffer.join('\n')
      )}</code></pre>`
    );
  }

  return html.join('\n');
}
