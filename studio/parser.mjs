import fs from 'node:fs';
import path from 'node:path';

// Parse a case-study .astro file into discrete editable blocks (text and image-groups)
export function parseCaseStudy(rawContent) {
  const caseStudyStart = rawContent.indexOf('<div class="case-study">');
  let wrapperStart = '';
  let inner = rawContent;
  let wrapperEnd = '';

  if (caseStudyStart !== -1) {
    const backLinkEnd = rawContent.indexOf('</a>', caseStudyStart);
    const splitPoint = backLinkEnd !== -1 ? backLinkEnd + 4 : caseStudyStart + '<div class="case-study">'.length;
    const caseStudyEnd = rawContent.lastIndexOf('</div>');

    wrapperStart = rawContent.slice(0, splitPoint);
    inner = rawContent.slice(splitPoint, caseStudyEnd !== -1 ? caseStudyEnd : undefined);
    wrapperEnd = caseStudyEnd !== -1 ? rawContent.slice(caseStudyEnd) : '  </div>\n</BaseLayout>';
  } else {
    const fmIndex = rawContent.indexOf('---', 3);
    wrapperStart = fmIndex !== -1 ? rawContent.slice(0, fmIndex + 3) : '';
    inner = fmIndex !== -1 ? rawContent.slice(fmIndex + 3) : rawContent;
    wrapperEnd = '';
  }

  // Regex to match image blocks:
  // 1. Grid: <div class="image-grid-([234])">([\s\S]*?)<\/div>
  // 2. Single image with optional caption: (<img\b(?:(?!<\/div>)[\s\S])*?\/?>)(\s*<p class="image-caption">[\s\S]*?<\/p>)?
  const imgBlockRegex = /(<div class="image-grid-([234])">[\s\S]*?<\/div>)|(<img\b(?:(?!<\/div>)[\s\S])*?\/?>(\s*<p class="image-caption">[\s\S]*?<\/p>)?)/g;

  let match;
  let lastIndex = 0;
  const blocks = [];
  let counter = 1;

  while ((match = imgBlockRegex.exec(inner)) !== null) {
    if (match.index > lastIndex) {
      const text = inner.slice(lastIndex, match.index);
      const h2Split = text.split(/(?=<h2\b)/g);
      h2Split.forEach((part) => {
        if (part.trim()) {
          blocks.push({
            id: `block_text_${counter++}`,
            type: 'text',
            content: part.trim(),
          });
        }
      });
    }

    if (match[1]) {
      // Grid
      const gridCols = parseInt(match[2], 10);
      const innerHtml = match[1];
      const imgMatches = [...innerHtml.matchAll(/<img\b([^>]*)\/?>/g)];
      const images = imgMatches.map((m, idx) => {
        const src = (m[1].match(/src="([^"]*)"/) || [])[1] || '';
        const alt = (m[1].match(/alt="([^"]*)"/) || [])[1] || '';
        const loading = (m[1].match(/loading="([^"]*)"/) || [])[1] || 'lazy';
        return {
          id: `img_${counter}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          src,
          alt,
          loading,
        };
      });

      blocks.push({
        id: `block_img_${counter++}`,
        type: 'image-group',
        layout: `grid-${gridCols}`,
        images,
        caption: '',
      });
    } else if (match[3]) {
      // Single image
      const imgTag = match[3];
      const src = (imgTag.match(/src="([^"]*)"/) || [])[1] || '';
      const alt = (imgTag.match(/alt="([^"]*)"/) || [])[1] || '';
      const cls = (imgTag.match(/class="([^"]*)"/) || [])[1] || 'project-image';
      const loading = (imgTag.match(/loading="([^"]*)"/) || [])[1] || '';
      const captionMatch = imgTag.match(/<p class="image-caption">([\s\S]*?)<\/p>/);
      const caption = captionMatch ? captionMatch[1].trim() : '';

      blocks.push({
        id: `block_img_${counter++}`,
        type: 'image-group',
        layout: 'single',
        images: [
          {
            id: `img_${counter}_0_${Math.random().toString(36).substring(2, 6)}`,
            src,
            alt,
            class: cls,
            loading,
          },
        ],
        caption,
      });
    }

    lastIndex = imgBlockRegex.lastIndex;
  }

  if (lastIndex < inner.length) {
    const text = inner.slice(lastIndex);
    const h2Split = text.split(/(?=<h2\b)/g);
    h2Split.forEach((part) => {
      if (part.trim()) {
        blocks.push({
          id: `block_text_${counter++}`,
          type: 'text',
          content: part.trim(),
        });
      }
    });
  }

  return { wrapperStart, wrapperEnd, blocks };
}

// Serialize blocks back to .astro file
export function serializeCaseStudy(wrapperStart, wrapperEnd, blocks) {
  let out = wrapperStart + '\n\n';

  for (const b of blocks) {
    if (b.type === 'text') {
      out += '    ' + b.content.trim() + '\n\n';
    } else if (b.type === 'image-group') {
      if (b.layout === 'single') {
        const img = (b.images && b.images[0]) || { src: '', alt: '' };
        const loadingAttr = img.loading ? ` loading="${img.loading}"` : '';
        out += `    <img src="${img.src}" alt="${img.alt}" class="project-image"${loadingAttr} />\n`;
        if (b.caption) {
          out += `    <p class="image-caption">${b.caption}</p>\n`;
        }
        out += '\n';
      } else {
        const cols = (b.layout || 'grid-2').replace('grid-', '');
        out += `    <div class="image-grid-${cols}">\n`;
        for (const img of b.images || []) {
          const loadingAttr = img.loading ? ` loading="${img.loading}"` : ' loading="lazy"';
          out += `      <img src="${img.src}" alt="${img.alt}"${loadingAttr} />\n`;
        }
        out += `    </div>\n`;
        if (b.caption) {
          out += `    <p class="image-caption">${b.caption}</p>\n`;
        }
        out += '\n';
      }
    }
  }

  out += '  ' + wrapperEnd.trim() + '\n';
  return out;
}

// Special parser for photography.astro which defines photos array in frontmatter
export function parsePhotography(rawContent) {
  const photoArrayMatch = rawContent.match(/const photos = (\[[\s\S]*?\]);/);
  let photos = [];
  if (photoArrayMatch) {
    try {
      photos = (new Function(`return ${photoArrayMatch[1]}`))();
    } catch (e) {
      console.error('Failed to parse photos array in photography.astro', e);
    }
  }

  return {
    raw: rawContent,
    photos: photos.map((p, idx) => ({
      id: `photo_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      src: p.src,
      alt: p.alt || '',
    })),
  };
}

export function serializePhotography(rawContent, photos) {
  const formattedArray =
    '[\n' +
    photos.map((p) => `  { src: '${p.src}', alt: '${(p.alt || '').replace(/'/g, "\\'")}' },`).join('\n') +
    '\n]';
  return rawContent.replace(/const photos = \[[\s\S]*?\];/, `const photos = ${formattedArray};`);
}
