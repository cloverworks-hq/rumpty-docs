import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import type {LoadContext, Plugin} from '@docusaurus/types';
import type {LoadedContent} from '@docusaurus/plugin-content-docs';

type Page = {title: string; description: string; permalink: string; markdown: string};

type LinkContext = {
  permalink: string;
  sourcePath: string;
  routes: Set<string>;
  sources: Map<string, string>;
  siteUrl: string;
};

const SECTION_TITLES: Record<string, string> = {
  'getting-started': 'Getting started',
  api: 'API reference',
  cli: 'CLI',
  mcp: 'MCP',
};

export function markdownPath(permalink: string): string {
  const trimmed = permalink.replace(/\/+$/, '');
  return trimmed === '' ? '/index.md' : `${trimmed}.md`;
}

function attrs(tag: string): Record<string, string | true> {
  const out: Record<string, string | true> = {};
  const re = /([A-Za-z]+)(?:=\{(?:"((?:[^"\\]|\\.)*)"|(\[[^\]]*\]))\}|="([^"]*)")?/g;
  for (const m of tag.matchAll(re)) {
    const [, key, str, arr, plain] = m;
    if (arr !== undefined) {
      try {
        out[key] = (JSON.parse(arr) as unknown[]).map(String).join(', ');
      } catch {
        out[key] = arr;
      }
    } else {
      out[key] = str ?? plain ?? true;
    }
  }
  return out;
}

function convertTag(line: string): string | null {
  const tag = line.trim();
  if (/^<\/(ApiPage|ApiMain|ApiAside|Tabs|ParamChildren|ResponseBlock|TabItem)>$/.test(tag)) return '';
  const open = tag.match(/^<([A-Z][A-Za-z]*)\b([^>]*?)\/?>$/);
  if (!open) return null;
  const [, name, rest] = open;
  const a = attrs(rest);
  switch (name) {
    case 'ApiPage':
    case 'ApiMain':
    case 'ApiAside':
    case 'Tabs':
    case 'ParamChildren':
      return '';
    case 'Endpoint':
      return `\`${a.method} ${a.path}\``;
    case 'ResponseBlock':
      return `**${a.status}**`;
    case 'TabItem':
      return `**${a.label ?? a.value}**`;
    default:
      return null;
  }
}

function paramLine(tag: string, indent: string): string {
  const a = attrs(tag);
  const details = [
    a.type && `\`${a.type}\``,
    a.required === true && 'required',
    a.enumValues && `one of: ${a.enumValues}`,
    a.defaultValue !== undefined && a.defaultValue !== true && `default: \`${a.defaultValue}\``,
    a.constraints && a.constraints !== true && a.constraints,
  ]
    .filter(Boolean)
    .join(', ');
  return `${indent}- **\`${a.name}\`**${details ? ` (${details})` : ''}`;
}

function resolveRoute(target: string, ctx: LinkContext): string | undefined {
  if (/\.mdx?$/.test(target)) {
    const file = target.startsWith('/')
      ? path.posix.join('docs', target)
      : path.posix.join(path.posix.dirname(ctx.sourcePath), target);
    return ctx.sources.get(path.posix.normalize(file));
  }
  const resolved = new URL(target, `https://x${ctx.permalink.replace(/\/+$/, '') || '/'}`).pathname;
  const route = resolved.replace(/\/+$/, '') || '/';
  return ctx.routes.has(route) ? route : undefined;
}

function rewriteLinks(text: string, ctx: LinkContext): string {
  return text.replace(/\]\(([^)\s]+)\)/g, (match, target: string) => {
    if (/^[a-z]+:/i.test(target) || target.startsWith('#')) return match;
    const [pathPart, hash = ''] = target.split('#');
    const route = resolveRoute(pathPart, ctx);
    if (!route) return match;
    return `](${ctx.siteUrl}${markdownPath(route)}${hash ? `#${hash}` : ''})`;
  });
}

const ENTITIES: Record<string, string> = {amp: '&', lt: '<', gt: '>', quot: '"', rarr: '→', nbsp: ' ', middot: '·'};

export function htmlBlockToMarkdown(html: string): string {
  if (/^<p className="eyebrow">[\s\S]*<\/p>$/.test(html.trim())) return '';
  const ordered = /<ol\b/.test(html);
  let n = 0;
  return html
    .replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, (_, href: string, inner: string) => {
      const title = inner.match(/className="card__title">([\s\S]*?)<\/span>/)?.[1];
      const desc = inner.match(/className="card__desc">([\s\S]*?)<\/span>/)?.[1];
      if (title) return `\n- [${title.replace(/\s*→\s*$/, '')}](${href})${desc ? `: ${desc}` : ''}\n`;
      return `[${inner.replace(/<[^>]+>/g, '').trim()}](${href})`;
    })
    .replace(/<span className="tile__label">([\s\S]*?)<\/span>\s*<span className="tile__value">([\s\S]*?)<\/span>/g, '\n- **$1**: $2\n')
    .replace(/<span className="ui">([\s\S]*?)<\/span>/g, ' (`$1`)')
    .replace(/<span className="opt">([\s\S]*?)<\/span>/g, '($1)')
    .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/g, '**$1**: ')
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/g, (_, inner: string) => {
      const text = inner.includes('className="dot"') ? inner.replace(/<\/span>\s*<span\b[^>]*>/g, ' · ') : inner;
      return `\n${ordered ? `${++n}.` : '-'} ${text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/^[ ·]+/, '').trim()}\n`;
    })
    .replace(/<\/span>\s*<span\b[^>]*>/g, ' · ')
    .replace(/<\/?(div|figure|p|ol|ul|li|tr|table|tbody|thead)\b[^>]*>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(\w+);/g, (m, name: string) => ENTITIES[name] ?? m)
    .split('\n')
    .map(l => l.replace(/[ \t]+/g, ' ').replace(/^· /, '').trim())
    .filter(Boolean)
    .join('\n');
}

export function toMarkdown(raw: string, title: string, ctx: LinkContext): string {
  const body = raw.replace(/^---[\s\S]*?\n---\s*\n/, '');
  const out: string[] = [];
  const lines = body.split('\n');
  let inFence = false;
  let inAdmonition = false;
  let openParams = 0;
  const push = (line: string) => {
    const text = openParams && line.trim() ? `${'  '.repeat(openParams)}${line}` : line;
    out.push(inAdmonition && text.trim() ? `> ${text}` : inAdmonition ? '>' : text);
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      push(line);
      continue;
    }
    if (inFence) {
      push(line);
      continue;
    }
    if (/^(import|export)\s/.test(line)) continue;
    let text = line.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
    const param = text.trim().match(/^<Param\b([^>]*?)(\/?)>$/);
    if (param) {
      out.push(paramLine(param[1], '  '.repeat(openParams)));
      if (!param[2]) openParams++;
      continue;
    }
    if (text.trim() === '</Param>') {
      openParams = Math.max(0, openParams - 1);
      continue;
    }
    const converted = convertTag(text);
    if (converted !== null) {
      push(converted);
      continue;
    }
    if (/^\s*<\/?[a-z][a-z0-9]*\b/.test(text)) {
      const block = [text];
      while (i + 1 < lines.length && lines[i + 1].trim() !== '') block.push(lines[++i]);
      for (const l of htmlBlockToMarkdown(block.join('\n')).split('\n')) push(rewriteLinks(l, ctx));
      continue;
    }
    text = text.replace(/<MethodBadge method=\{"([A-Z]+)"\}\s*\/>/g, '`$1`');
    const admonition = text.match(/^:::(note|tip|info|warning|danger|caution)\b(?:\[([^\]]*)\])?\s*(.*)$/);
    if (admonition) {
      const label = admonition[1][0].toUpperCase() + admonition[1].slice(1);
      const title = (admonition[2] ?? admonition[3]).trim();
      out.push(`> **${title && title.toLowerCase() !== label.toLowerCase() ? title : label}:**`);
      inAdmonition = true;
      continue;
    }
    if (/^:::\s*$/.test(text)) {
      inAdmonition = false;
      continue;
    }
    push(rewriteLinks(text, ctx));
  }
  const content = out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const heading = /^#\s/m.test(content) ? '' : `# ${title}\n\n`;
  return `${heading}${content}\n`;
}

function sectionOf(permalink: string): string {
  return permalink.split('/').filter(Boolean)[0] ?? '';
}

function sectionTitle(section: string): string {
  if (SECTION_TITLES[section]) return SECTION_TITLES[section];
  if (!section) return 'Overview';
  return section.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

export default function llms(context: LoadContext): Plugin {
  const siteUrl = context.siteConfig.url.replace(/\/+$/, '');
  let loaded: Page[] = [];
  return {
    name: 'llms',
    async allContentLoaded({allContent}) {
      const content = allContent['docusaurus-plugin-content-docs']?.default as LoadedContent | undefined;
      const docs = (content?.loadedVersions[0]?.docs ?? []).filter(doc => !doc.draft && !doc.unlisted);
      const routeOf = (permalink: string) => permalink.replace(/\/+$/, '') || '/';
      const routes = new Set(docs.map(doc => routeOf(doc.permalink)));
      const sources = new Map(docs.map(doc => [doc.source.replace(/^@site\//, ''), routeOf(doc.permalink)]));
      const pages = await Promise.all(docs.map(async doc => {
        const sourcePath = doc.source.replace(/^@site\//, '');
        const raw = await readFile(path.resolve(context.siteDir, sourcePath), 'utf8');
        const eyebrow = raw.match(/<p className="eyebrow">([\s\S]*?)<\/p>/)?.[1]?.trim();
        return {
          title: doc.title,
          description: eyebrow && doc.description.trim() === eyebrow ? '' : doc.description,
          permalink: doc.permalink,
          markdown: toMarkdown(raw, doc.title, {permalink: doc.permalink, sourcePath, routes, sources, siteUrl}),
        };
      }));
      loaded = pages;
    },
    async postBuild({outDir}) {
      const pages = [...loaded].sort((a, b) => {
        const order = (p: Page) => (sectionOf(p.permalink) === 'getting-started' ? 0 : sectionOf(p.permalink) === 'api' ? 2 : 1);
        return order(a) - order(b) || a.permalink.localeCompare(b.permalink);
      });

      await Promise.all(pages.map(async page => {
        const file = path.join(outDir, markdownPath(page.permalink));
        await mkdir(path.dirname(file), {recursive: true});
        await writeFile(file, page.markdown);
      }));

      const sections = new Map<string, Page[]>();
      for (const page of pages) {
        const key = sectionOf(page.permalink);
        sections.set(key, [...(sections.get(key) ?? []), page]);
      }
      const index = [
        `# ${context.siteConfig.title}`,
        '',
        `> ${context.siteConfig.tagline}. Every page is also available as markdown by adding \`.md\` to its URL. The full guides (without the API reference) are in [llms-full.txt](${siteUrl}/llms-full.txt), and the API is described by [openapi.json](${siteUrl}/openapi.json).`,
        '',
        ...[...sections].flatMap(([section, list]) => [
          `## ${sectionTitle(section)}`,
          '',
          ...list.map(p => `- [${p.title}](${siteUrl}${markdownPath(p.permalink)})${p.description ? `: ${p.description.replace(/\s+/g, ' ')}` : ''}`),
          '',
        ]),
      ].join('\n');
      await writeFile(path.join(outDir, 'llms.txt'), index);

      const full = pages
        .filter(p => sectionOf(p.permalink) !== 'api')
        .map(p => `<!-- ${siteUrl}${p.permalink} -->\n\n${p.markdown}`)
        .join('\n---\n\n');
      await writeFile(path.join(outDir, 'llms-full.txt'), full);
    },
  };
}
