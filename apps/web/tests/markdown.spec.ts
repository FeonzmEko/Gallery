import { describe, it, expect } from 'vitest';
import { renderMarkdown, escapeHtml } from '../src/shared/utils/markdown';

describe('Markdown Renderer & XSS Guard (@archive/web)', () => {
  it('escapes raw HTML tags to prevent XSS injection', () => {
    const dirty = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
    const escaped = escapeHtml(dirty);
    expect(escaped).not.toContain('<script>');
    expect(escaped).toContain('&lt;script&gt;');

    const rendered = renderMarkdown(`# Title\n\n${dirty}`);
    expect(rendered).not.toContain('<script>');
    expect(rendered).not.toContain('<img ');
  });

  it('renders headings, bold, inline code, blockquotes, lists, and safe links', () => {
    const md = [
      '# 标题一',
      '',
      '这是一段包含 **加粗** 与 `code()` 的文字，以及 [安全链接](https://example.com) 和 [危险链接](javascript:alert(1))。',
      '',
      '> 引用一句名言',
      '',
      '- 第一项',
      '- 第二项',
    ].join('\n');

    const html = renderMarkdown(md);
    expect(html).toContain('<h1');
    expect(html).toContain('<strong');
    expect(html).toContain('<code');
    expect(html).toContain('href="https://example.com"');
    expect(html).not.toContain('javascript:alert(1)');
    expect(html).toContain('<blockquote');
    expect(html).toContain('<ul');
    expect(html).toContain('<li');
  });
});
