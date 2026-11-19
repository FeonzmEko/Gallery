/**
 * Calculate word count for Markdown text supporting mixed Chinese and English.
 * Strips Markdown syntax (headers, links, code blocks, blockquotes, html)
 * Counts:
 * - Each CJK (Chinese, Japanese, Korean) character as 1 word
 * - Each Latin/alphanumeric word sequence (e.g., "hello", "world_2026", "it's") as 1 word
 */
export function calculateWordCount(markdown: string): number {
  if (!markdown || typeof markdown !== 'string') return 0;

  let text = markdown;

  // 1. Remove fenced code blocks
  text = text.replace(/```[\s\S]*?```/g, ' ');

  // 2. Remove inline code
  text = text.replace(/`[^`]*`/g, ' ');

  // 3. Remove images ![alt](url)
  text = text.replace(/!\[.*?\]\(.*?\)/g, ' ');

  // 4. Transform links [text](url) -> text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 5. Remove HTML tags
  text = text.replace(/<[^>]*>/g, ' ');

  // 6. Remove Markdown headers (#, ##, etc.), blockquote markers (>), horizontal rules (---, ***), list markers (-, *, +, 1.)
  text = text.replace(/^(\s*#{1,6}\s+)/gm, ' ');
  text = text.replace(/^(\s*>\s*)/gm, ' ');
  text = text.replace(/^(\s*[-*+]\s+)/gm, ' ');
  text = text.replace(/^(\s*\d+\.\s+)/gm, ' ');
  text = text.replace(/^(\s*[-*_]{3,}\s*)$/gm, ' ');

  // 7. Remove markdown formatting characters: *, _, ~, =
  text = text.replace(/[*_~=]/g, ' ');

  // 8. Count CJK characters
  const cjkMatches = text.match(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g);
  const cjkCount = cjkMatches ? cjkMatches.length : 0;

  // 9. Replace CJK characters with space and count remaining Latin/alphanumeric words
  const nonCjk = text.replace(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g, ' ');
  const wordMatches = nonCjk.match(/[a-zA-Z0-9]+(?:'[a-zA-Z0-9]+)?/g);
  const latinCount = wordMatches ? wordMatches.length : 0;

  return cjkCount + latinCount;
}
