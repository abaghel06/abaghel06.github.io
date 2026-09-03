import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { load } from 'cheerio';
import { pipeline } from '@xenova/transformers';

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const MODEL_REVISION = '751bff37182d3f1213fa05d7196b954e230abad9';

function cleanText(raw) {
  return raw.replace(/\s+/g, ' ').trim();
}

function extractWorkHtmlChunks(html) {
  const $ = load(html);
  const chunks = [];

  const exp = $('#wipro-experience');
  chunks.push({
    id: 'wipro-experience',
    sourcePage: 'work.html',
    text: cleanText(
      exp.find('.exp-title').text() + '. ' +
      exp.find('.exp-co').text() + '. ' +
      exp.find('.exp-story').map((_, el) => $(el).text()).get().join(' ') + ' ' +
      exp.find('.exp-highlight').text()
    ),
  });

  $('.proj-card').each((_, el) => {
    const card = $(el);
    chunks.push({
      id: card.attr('id'),
      sourcePage: 'work.html',
      text: cleanText(
        card.find('.proj-name').text() + '. ' +
        card.find('.proj-story').map((_, p) => $(p).text()).get().join(' ') + ' ' +
        'Built with: ' + card.find('.chip').map((_, c) => $(c).text()).get().join(', ') + '.'
      ),
    });
  });

  const projectNames = $('.proj-card .proj-name').map((_, el) => $(el).text()).get();
  chunks.push({
    id: 'projects-overview',
    sourcePage: 'work.html',
    text: cleanText('Projects: ' + projectNames.join(', ') + '.'),
  });

  $('.skill-row').each((_, el) => {
    const row = $(el);
    chunks.push({
      id: row.attr('id'),
      sourcePage: 'work.html',
      text: cleanText(`${row.find('.skill-label').text()} skills: ${row.find('.skill-value').text()}.`),
    });
  });

  const certTexts = $('.cert-row').map((_, el) => {
    const row = $(el);
    return `${row.find('.cert-name').text()} (${row.find('.cert-issuer').text()}, ${row.find('.cert-date').text()})`;
  }).get();
  chunks.push({
    id: 'certifications',
    sourcePage: 'work.html',
    text: cleanText('Certifications: ' + certTexts.join('; ') + '.'),
  });

  return chunks;
}

function extractIndexHtmlChunks(html) {
  const $ = load(html);
  const chunks = [];

  chunks.push({
    id: 'about',
    sourcePage: 'index.html',
    text: cleanText('About Amit. ' + $('#about .story-body p').map((_, p) => $(p).text()).get().join(' ')),
  });

  $('.what-card').each((_, el) => {
    const card = $(el);
    chunks.push({
      id: card.attr('id'),
      sourcePage: 'index.html',
      text: cleanText(card.find('.what-title').text() + '. ' + card.find('.what-desc').text()),
    });
  });

  return chunks;
}

async function main() {
  const workHtml = readFileSync('../work.html', 'utf-8');
  const indexHtml = readFileSync('../index.html', 'utf-8');

  const chunks = [
    ...extractWorkHtmlChunks(workHtml),
    ...extractIndexHtmlChunks(indexHtml),
  ];

  const missingId = chunks.find((chunk) => !chunk.id);
  if (missingId) throw new Error(`Chunk missing id: ${JSON.stringify(missingId)}`);

  const extractor = await pipeline('feature-extraction', MODEL_NAME, { revision: MODEL_REVISION });

  const chunksWithVectors = [];
  for (const chunk of chunks) {
    const output = await extractor(chunk.text, { pooling: 'mean', normalize: true });
    chunksWithVectors.push({
      ...chunk,
      sourceAnchor: `${chunk.sourcePage}#${chunk.id}`,
      vector: Array.from(output.data),
    });
  }

  mkdirSync('../kb', { recursive: true });
  writeFileSync('../kb/index.json', JSON.stringify(chunksWithVectors, null, 2));
  console.log(`Wrote ${chunksWithVectors.length} chunks to kb/index.json`);
}

main();
