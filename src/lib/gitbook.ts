import path from 'path';
import { Marked } from 'marked';

export interface SidebarItem {
  title: string;
  slug?: string;
  children?: SidebarItem[];
}

export interface PageContent {
  title: string;
  html: string;
  rawMarkdown: string;
}

// Vite's import.meta.glob to load raw markdown contents at build time
const rawFiles = import.meta.glob('/src/data/gitbook/**/*.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

/**
 * Resolves a relative path from currentDir.
 * E.g. resolveRelativePath('conocimientos', '../referencia/glosario.md') => 'referencia/glosario.md'
 */
function resolveRelativePath(currentDir: string, relativePath: string): string {
  const parts = currentDir.split('/').filter(Boolean);
  const relParts = relativePath.split('/');
  for (const part of relParts) {
    if (part === '.' || part === '') {
      continue;
    } else if (part === '..') {
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return parts.join('/');
}

/**
 * Normalizes and rewrites links and images.
 */
function renderMarkdown(rawMarkdown: string, fileKey: string, prefix: '/bitacora' | '/dev/bitacora'): string {
  // Get relative path of the current file from src/data/gitbook/
  const relativeFilePath = fileKey.replace(/^\/src\/data\/gitbook\//, '');
  const currentDir = path.dirname(relativeFilePath) === '.' ? '' : path.dirname(relativeFilePath);

  const customMarked = new Marked({
    gfm: true,
    breaks: true,
    renderer: {
      link(token) {
        const { href, title, text } = token;
        
        // Skip external links or anchor links
        if (/^(https?:\/\/|mailto:|#)/i.test(href)) {
          const titleAttr = title ? ` title="${title}"` : '';
          return `<a href="${href}"${titleAttr}>${text}</a>`;
        }

        // Parse hash if any
        const [pathPart, hashPart] = href.split('#');
        const hash = hashPart ? '#' + hashPart : '';

        // Resolve path relative to current file's directory
        const resolvedPath = resolveRelativePath(currentDir, pathPart);

        // Strip .md extension
        let targetSlug = resolvedPath.replace(/\.md$/, '');
        if (targetSlug === 'index' || targetSlug === 'README') {
          targetSlug = '';
        } else if (targetSlug.endsWith('/index')) {
          targetSlug = targetSlug.slice(0, -6);
        } else if (targetSlug.endsWith('/README')) {
          targetSlug = targetSlug.slice(0, -7);
        }

        const finalHref = `${prefix}${targetSlug ? '/' + targetSlug : ''}${hash}`;
        const titleAttr = title ? ` title="${title}"` : '';
        return `<a href="${finalHref}"${titleAttr}>${text}</a>`;
      },

      image(token) {
        const { href, title, text } = token;

        // Skip external images
        if (/^(https?:\/\/)/i.test(href)) {
          const titleAttr = title ? ` title="${title}"` : '';
          const altAttr = text ? ` alt="${text}"` : '';
          return `<img src="${href}"${altAttr}${titleAttr} />`;
        }

        // Resolve path relative to current file's directory
        const resolvedPath = resolveRelativePath(currentDir, href);
        const finalSrc = `/gitbook-assets/${resolvedPath}`;

        const titleAttr = title ? ` title="${title}"` : '';
        const altAttr = text ? ` alt="${text}"` : '';
        return `<img src="${finalSrc}"${altAttr}${titleAttr} />`;
      }
    }
  });

  return customMarked.parse(rawMarkdown) as string;
}

/**
 * Helper to match a slug to a specific key in rawFiles.
 */
function findFileKeyForSlug(slug: string): string | null {
  const keys = Object.keys(rawFiles);

  if (slug === '') {
    const rootIndex = keys.find(
      (k) => k === '/src/data/gitbook/index.md' || k === '/src/data/gitbook/README.md'
    );
    return rootIndex || null;
  }

  for (const k of keys) {
    const relativePath = k.replace(/^\/src\/data\/gitbook\//, '');
    if (relativePath === 'SUMMARY.md') continue;

    let pathSlug = relativePath.replace(/\.md$/, '');
    if (pathSlug.endsWith('/index')) {
      pathSlug = pathSlug.slice(0, -6);
    } else if (pathSlug.endsWith('/README')) {
      pathSlug = pathSlug.slice(0, -7);
    }

    if (pathSlug === slug) {
      return k;
    }
  }

  return null;
}

/**
 * Parses GitBook SUMMARY.md file contents and returns a nested sidebar menu
 */
export function parseSummary(summaryRaw: string, prefix: string): SidebarItem[] {
  const lines = summaryRaw.split('\n');
  const root: SidebarItem[] = [];
  const stack: { level: number; item: SidebarItem }[] = [];

  for (const line of lines) {
    const match = line.match(/^(\s*)[\*\-]\s+\[([^\]]+)\]\(([^)]+)\)/);
    if (!match) continue;

    const indent = match[1].length;
    const title = match[2].trim();
    const href = match[3].trim();

    let slug = href.replace(/\.md$/, '');
    if (slug === 'README' || slug === 'index') {
      slug = '';
    } else if (slug.endsWith('/README')) {
      slug = slug.slice(0, -7);
    } else if (slug.endsWith('/index')) {
      slug = slug.slice(0, -6);
    }

    const item: SidebarItem = {
      title,
      slug: prefix + (slug ? '/' + slug : ''),
    };

    while (stack.length > 0 && stack[stack.length - 1].level >= indent) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(item);
    } else {
      const parent = stack[stack.length - 1].item;
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(item);
    }

    stack.push({ level: indent, item });
  }

  return root;
}

/**
 * Generates the sidebar navigation tree dynamically from files when SUMMARY.md is missing.
 */
async function generateDynamicSidebar(prefix: '/bitacora' | '/dev/bitacora'): Promise<SidebarItem[]> {
  interface TempItem {
    relativePath: string;
    parts: string[];
    title: string;
    slug: string;
  }

  const items: TempItem[] = [];

  for (const key of Object.keys(rawFiles)) {
    const relativePath = key.replace(/^\/src\/data\/gitbook\//, '');
    if (relativePath === 'SUMMARY.md') continue;

    const rawMarkdown = await rawFiles[key]();
    let title = '';
    const titleMatch = rawMarkdown.match(/^#\s+(.*)$/m);
    if (titleMatch) {
      title = titleMatch[1].trim();
    } else {
      const basename = path.basename(relativePath, '.md');
      title = basename.charAt(0).toUpperCase() + basename.slice(1).replace(/[-_]/g, ' ');
    }

    let slug = relativePath.replace(/\.md$/, '');
    if (slug === 'index' || slug === 'README') {
      slug = '';
    } else if (slug.endsWith('/index')) {
      slug = slug.slice(0, -6);
    } else if (slug.endsWith('/README')) {
      slug = slug.slice(0, -7);
    }

    items.push({
      relativePath,
      parts: relativePath.split('/'),
      title,
      slug: prefix + (slug ? '/' + slug : ''),
    });
  }

  const menu: SidebarItem[] = [];

  // Find the root item
  const rootItem = items.find((item) => item.slug === prefix);
  if (rootItem) {
    menu.push({
      title: rootItem.title,
      slug: rootItem.slug,
    });
  }

  // Get categories (first part of directory structure)
  const categories = Array.from(
    new Set(
      items
        .filter((item) => item.parts.length > 1)
        .map((item) => item.parts[0])
    )
  );

  categories.sort();

  for (const cat of categories) {
    const catIndex = items.find(
      (item) =>
        item.parts.length === 2 &&
        item.parts[0] === cat &&
        (item.parts[1] === 'index.md' || item.parts[1] === 'README.md')
    );

    const catItem: SidebarItem = {
      title: catIndex ? catIndex.title : cat.charAt(0).toUpperCase() + cat.slice(1).replace(/[-_]/g, ' '),
      slug: catIndex ? catIndex.slug : undefined,
      children: [],
    };

    const catItems = items.filter((item) => item.parts[0] === cat && item !== catIndex);

    // Subcategories (second part of directory structure)
    const subCats = Array.from(
      new Set(
        catItems
          .filter((item) => item.parts.length > 2)
          .map((item) => item.parts[1])
      )
    );

    subCats.sort();

    for (const subCat of subCats) {
      const subCatItem: SidebarItem = {
        title: subCat.charAt(0).toUpperCase() + subCat.slice(1).replace(/[-_]/g, ' '),
        children: [],
      };

      const subCatFiles = catItems.filter((item) => item.parts.length === 3 && item.parts[1] === subCat);
      subCatFiles.sort((a, b) => a.title.localeCompare(b.title));

      for (const file of subCatFiles) {
        subCatItem.children!.push({
          title: file.title,
          slug: file.slug,
        });
      }

      if (subCatItem.children!.length > 0) {
        catItem.children!.push(subCatItem);
      }
    }

    // Direct files under the category
    const directFiles = catItems.filter((item) => item.parts.length === 2);
    directFiles.sort((a, b) => a.title.localeCompare(b.title));
    for (const file of directFiles) {
      catItem.children!.push({
        title: file.title,
        slug: file.slug,
      });
    }

    if (catItem.children!.length > 0 || catItem.slug) {
      menu.push(catItem);
    }
  }

  return menu;
}

/**
 * Fetches and parses the navigation tree.
 */
export async function getSidebarMenu(prefix: '/bitacora' | '/dev/bitacora'): Promise<SidebarItem[]> {
  const summaryKey = '/src/data/gitbook/SUMMARY.md';
  if (rawFiles[summaryKey]) {
    const summaryRaw = await rawFiles[summaryKey]();
    return parseSummary(summaryRaw, prefix);
  }

  return await generateDynamicSidebar(prefix);
}

/**
 * Returns raw markdown content, title, and rendered HTML with mapped links.
 */
export async function getPageContent(
  slugPath: string | undefined,
  prefix: '/bitacora' | '/dev/bitacora'
): Promise<PageContent | null> {
  const slug = slugPath || '';
  const fileKey = findFileKeyForSlug(slug);

  if (!fileKey) {
    return null;
  }

  const rawMarkdown = await rawFiles[fileKey]();

  let title = 'Bitácora';
  const titleMatch = rawMarkdown.match(/^#\s+(.*)$/m);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  const html = renderMarkdown(rawMarkdown, fileKey, prefix);

  return {
    title,
    html,
    rawMarkdown,
  };
}

/**
 * Lists all slugs representing valid pages in src/data/gitbook/
 */
export function getAllSlugs(): string[] {
  const paths = Object.keys(rawFiles);
  const slugs: string[] = [];

  for (const p of paths) {
    const relativePath = p.replace(/^\/src\/data\/gitbook\//, '');
    if (relativePath === 'SUMMARY.md') continue;

    if (relativePath === 'index.md' || relativePath === 'README.md') {
      slugs.push('');
      continue;
    }

    let slug = relativePath.replace(/\.md$/, '');
    if (slug.endsWith('/index')) {
      slug = slug.slice(0, -6);
    } else if (slug.endsWith('/README')) {
      slug = slug.slice(0, -7);
    }

    slugs.push(slug);
  }

  return Array.from(new Set(slugs));
}
