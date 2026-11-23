import type { AppServices } from './bootstrap.js';

export interface OgMetadata {
  title: string;
  description: string;
  type: 'website' | 'article';
  url: string;
  image: string | null;
  twitterCard: 'summary' | 'summary_large_image';
}

const DEFAULT_OG_TITLE = 'Personal Archive · 个人数字档案馆';
const DEFAULT_OG_DESCRIPTION = 'Personal Life Stream & Multi-Modal Digital Archive';

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function toAbsoluteUrl(origin: string, candidate?: string | null): string | null {
  if (!candidate) return null;
  const trimmed = candidate.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${origin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

/**
 * Resolves public-only Open Graph and Twitter Card metadata for the requested path.
 * Never exposes private, unlisted, draft, archived, or deleted content.
 */
export async function resolveOgMetadata(
  requestUrl: URL,
  services: AppServices
): Promise<OgMetadata> {
  const canonicalUrl = `${requestUrl.origin}${requestUrl.pathname}`;
  const defaults: OgMetadata = {
    title: DEFAULT_OG_TITLE,
    description: DEFAULT_OG_DESCRIPTION,
    type: 'website',
    url: canonicalUrl,
    image: null,
    twitterCard: 'summary',
  };

  const entryMatch = requestUrl.pathname.match(/^\/entries\/([^/]+)\/?$/);
  if (entryMatch && entryMatch[1]) {
    const idOrSlug = decodeURIComponent(entryMatch[1]);
    const entry = await services.entry.getPublicEntryForOg(idOrSlug);
    if (!entry) {
      return defaults;
    }

    const image = toAbsoluteUrl(requestUrl.origin, entry.coverThumbUrl ?? entry.coverUrl);
    return {
      title: `${entry.title} · Personal Archive`,
      description: entry.summary || DEFAULT_OG_DESCRIPTION,
      type: 'article',
      url: canonicalUrl,
      image,
      twitterCard: image ? 'summary_large_image' : 'summary',
    };
  }

  const collectionMatch = requestUrl.pathname.match(/^\/media\/collections\/([^/]+)\/?$/);
  if (collectionMatch && collectionMatch[1]) {
    const slug = decodeURIComponent(collectionMatch[1]);
    const collection = await services.collection.getPublicCollectionForOg(slug);
    if (!collection) {
      return defaults;
    }

    const image = toAbsoluteUrl(requestUrl.origin, collection.coverUrl);
    return {
      title: `${collection.title} · 影像长廊 · Personal Archive`,
      description: collection.description || '影像旅行合集 · Personal Archive',
      type: 'website',
      url: canonicalUrl,
      image,
      twitterCard: image ? 'summary_large_image' : 'summary',
    };
  }

  return defaults;
}

function buildOgMetaHtml(meta: OgMetadata): string {
  const tags = [
    `<meta property="og:site_name" content="Personal Archive" />`,
    `<meta property="og:type" content="${escapeHtmlAttr(meta.type)}" />`,
    `<meta property="og:title" content="${escapeHtmlAttr(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtmlAttr(meta.description)}" />`,
    `<meta property="og:url" content="${escapeHtmlAttr(meta.url)}" />`,
    `<meta name="twitter:card" content="${escapeHtmlAttr(meta.twitterCard)}" />`,
    `<meta name="twitter:title" content="${escapeHtmlAttr(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtmlAttr(meta.description)}" />`,
  ];

  if (meta.image) {
    tags.push(`<meta property="og:image" content="${escapeHtmlAttr(meta.image)}" />`);
    tags.push(`<meta name="twitter:image" content="${escapeHtmlAttr(meta.image)}" />`);
  }

  return `\n    ${tags.join('\n    ')}\n`;
}

/**
 * Transforms an HTML response using Cloudflare Workers native HTMLRewriter
 * (with a lightweight fallback when running outside workerd, e.g. Node Vitest).
 */
export async function rewriteHtmlWithOgMeta(
  response: Response,
  meta: OgMetadata
): Promise<Response> {
  const metaHtml = buildOgMetaHtml(meta);

  if (typeof HTMLRewriter !== 'undefined') {
    return new HTMLRewriter()
      .on('meta[property^="og:"], meta[name^="twitter:"]', {
        element(el) {
          el.remove();
        },
      })
      .on('title', {
        element(el) {
          el.setInnerContent(meta.title);
        },
      })
      .on('head', {
        element(el) {
          el.append(metaHtml, { html: true });
        },
      })
      .transform(response);
  }

  const html = await response.text();
  const stripped = html
    .replace(/<meta\b[^>]*\b(?:property=["']og:[^"']*["']|name=["']twitter:[^"']*["'])[^>]*\/?>/gi, '')
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlText(meta.title)}</title>`);

  const updated = stripped.includes('</head>')
    ? stripped.replace('</head>', `${metaHtml}</head>`)
    : `${metaHtml}${stripped}`;

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(updated, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
