// Renders the link-preview card for every page to static/og/*.png.
// Run it again (`pnpm run share-cards`) when a page, the cited
// section in src/lib/data/show.json or the look of the site changes.
import { Resvg } from '@resvg/resvg-js';
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import chunks from '../src/lib/data/chunks.json' with { type: 'json' };
import show from '../src/lib/data/show.json' with { type: 'json' };
import { site } from '../src/lib/site.ts';

const OUTPUT_DIR = new URL('../static/og/', import.meta.url);
const { width: WIDTH, height: HEIGHT } = site.share_card;

// The hero band and its editor, as in src/routes/layout.css and
// src/lib/sections/hero.svelte
const BAND = '#2e1065';
const BAND_TOP = '#4c1d95';
const WHITE = '#ffffff';
const MUTED = '#c9bce6';
const STROKE = '#c4b5fd';
const EDITOR = {
	body: '#1c0a3d',
	bar: '#150730',
	line: '#2d1b4d',
	border: '#3f2d60',
	text: '#ede9fe',
	gutter: '#7d6ea8',
	crumbs: '#a99bcf',
	marker: '#a78bfa',
	code: '#fde68a',
	link: '#93c5fd',
	cited: '#3a2463',
	status: '#6d28d9',
	tag_text: '#2e1065',
};

/**
 * Unpacks a WOFF file to the TrueType inside it. resvg only reads
 * TrueType and OpenType, and fontsource ships neither. WOFF is the
 * same tables, each zlib compressed, behind a different header.
 */
function woff_to_ttf(woff: Buffer) {
	const table_count = woff.readUInt16BE(12);
	const tables = Array.from({ length: table_count }, (_, index) => {
		const entry = 44 + index * 20;
		const offset = woff.readUInt32BE(entry + 4);
		const compressed_length = woff.readUInt32BE(entry + 8);
		const length = woff.readUInt32BE(entry + 12);
		const data = woff.subarray(offset, offset + compressed_length);
		return {
			tag: woff.subarray(entry, entry + 4),
			checksum: woff.readUInt32BE(entry + 16),
			length,
			data: compressed_length < length ? inflateSync(data) : data,
		};
	});

	const entry_selector = Math.floor(Math.log2(table_count));
	const search_range = 2 ** entry_selector * 16;
	const header = Buffer.alloc(12 + table_count * 16);
	woff.copy(header, 0, 4, 8); // the font's flavour
	header.writeUInt16BE(table_count, 4);
	header.writeUInt16BE(search_range, 6);
	header.writeUInt16BE(entry_selector, 8);
	header.writeUInt16BE(table_count * 16 - search_range, 10);

	const bodies: Buffer[] = [];
	let offset = header.length;
	tables.forEach((table, index) => {
		const record = 12 + index * 16;
		table.tag.copy(header, record);
		header.writeUInt32BE(table.checksum, record + 4);
		header.writeUInt32BE(offset, record + 8);
		header.writeUInt32BE(table.length, record + 12);
		// Tables start on four byte boundaries
		const padded = Buffer.alloc(Math.ceil(table.length / 4) * 4);
		table.data.copy(padded);
		bodies.push(padded);
		offset += padded.length;
	});

	return Buffer.concat([header, ...bodies]);
}

// The site's own fonts, so cards render the same on any machine.
// resvg doesn't apply variable font axes, so these are the static
// cuts of the families the site loads as variable fonts. They have
// no wide cut, so the headline is narrower than on the site
const require = createRequire(import.meta.url);
// resvg's native build loads fonts from disk, not from memory
const font_dir = mkdtempSync(join(tmpdir(), 'share-card-fonts-'));
const FONT_FILES = [
	'mona-sans/files/mona-sans-latin-400-normal.woff',
	'mona-sans/files/mona-sans-latin-600-normal.woff',
	'mona-sans/files/mona-sans-latin-800-normal.woff',
	'martian-mono/files/martian-mono-latin-400-normal.woff',
	'martian-mono/files/martian-mono-latin-700-normal.woff',
].map((file, index) => {
	const path = join(font_dir, `${index}.ttf`);
	writeFileSync(
		path,
		woff_to_ttf(readFileSync(require.resolve(`@fontsource/${file}`))),
	);
	return path;
});
const SANS = 'Mona Sans';
// The names the heavier static cuts give themselves
const SANS_SEMIBOLD = 'Mona Sans SemiBold';
const SANS_EXTRABOLD = 'Mona Sans ExtraBold';
const MONO = 'Martian Mono';

const escape = (text: string) =>
	text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');

/** Greedy wrap. SVG has no text layout, so lines are split by length */
function wrap(text: string, max_chars: number) {
	const lines: string[] = [];
	for (const word of text.split(' ')) {
		const line = lines.at(-1);
		if (line !== undefined && `${line} ${word}`.length <= max_chars) {
			lines[lines.length - 1] = `${line} ${word}`;
		} else {
			lines.push(word);
		}
	}
	return lines;
}

/** The wiki0 mark: a slashed zero on a rounded square */
function mark(x: number, y: number, size: number) {
	const scale = size / 32;
	return `<g transform="translate(${x} ${y}) scale(${scale})">
    <rect width="32" height="32" rx="7" fill="${WHITE}"/>
    <ellipse cx="16" cy="16" rx="7" ry="9.5" fill="none" stroke="#6d28d9" stroke-width="3"/>
    <path d="M11.5 22.5 20.5 9.5" stroke="#6d28d9" stroke-width="3" stroke-linecap="round"/>
  </g>`;
}

/**
 * One line of the cited Markdown as coloured tspans: heading markers,
 * inline code and links, as the hero's highlighter colours them
 */
function markdown_line(text: string) {
	const heading = /^(#+ )(.*)$/u.exec(text);
	if (heading) {
		return `<tspan fill="${EDITOR.marker}">${escape(heading[1]!)}</tspan><tspan fill="${WHITE}" font-weight="700">${escape(heading[2]!)}</tspan>`;
	}
	return text
		.split(/(`[^`]*`?|\[[^\]]*\]\([^)]*\)?)/u)
		.filter(Boolean)
		.map((part) => {
			if (part.startsWith('`')) {
				return `<tspan fill="${EDITOR.code}">${escape(part)}</tspan>`;
			}
			if (part.startsWith('[')) {
				return `<tspan fill="${EDITOR.link}">${escape(part)}</tspan>`;
			}
			return escape(part);
		})
		.join('');
}

// The editor from the hero, showing the section wiki0 cited
const ED = { x: 652, y: 96, width: 492, height: 438 };
const CODE_SIZE = 14;
const LINE_HEIGHT = 25;
const GUTTER = 56;

function editor() {
	const [path, range] = show.citation.split(':') as [string, string];
	const file = path.split('/').at(-1)!;
	const folders = path.split('/').slice(0, -1);
	const first = show.start_line;
	// The indexed chunk's count, as the hero's status bar shows
	const tokens =
		chunks
			.flatMap((document) => document.chunks)
			.find((chunk) => chunk.citation === show.citation)?.tokens ??
		show.tokens;

	// Wrap each source line under its own text, as the site does. A
	// line too long for the editor wraps at spaces
	const max_chars = 37;
	const rows = show.markdown.split('\n').flatMap((line, index) =>
		wrap(line, max_chars).map((part, wrapped) => ({
			number: wrapped === 0 ? String(first + index) : '',
			text: part,
		})),
	);

	const titlebar_height = 40;
	const crumbs_height = 30;
	const status_height = 30;
	const code_top = ED.y + titlebar_height + crumbs_height;
	const code_bottom = ED.y + ED.height - status_height;
	const cited_top = code_top + 12;
	const cited_height = rows.length * LINE_HEIGHT + 6;

	const lines = rows
		.map(({ number, text }, index) => {
			const y = cited_top + 20 + index * LINE_HEIGHT;
			return `<text x="${ED.x + GUTTER - 14}" y="${y}" text-anchor="end" fill="#e9d5ff">${number}</text><text x="${ED.x + GUTTER}" y="${y}" fill="${EDITOR.text}" xml:space="preserve">${markdown_line(text)}</text>`;
		})
		.join('');

	const crumbs = [...folders, file]
		.map((part, index, parts) =>
			index === parts.length - 1
				? `<tspan fill="${EDITOR.text}">${escape(part)}</tspan>`
				: `${escape(part)}  ›  `,
		)
		.join('');

	return `
  <rect x="${ED.x}" y="${ED.y + 30}" width="${ED.width}" height="${ED.height}" rx="16" fill="#0a021e" opacity="0.55" filter="url(#shadow)"/>
  <clipPath id="editor"><rect x="${ED.x}" y="${ED.y}" width="${ED.width}" height="${ED.height}" rx="14"/></clipPath>
  <g clip-path="url(#editor)">
    <rect x="${ED.x}" y="${ED.y}" width="${ED.width}" height="${ED.height}" fill="${EDITOR.body}"/>
    <rect x="${ED.x}" y="${ED.y}" width="${ED.width}" height="${titlebar_height}" fill="${EDITOR.bar}"/>
    ${[0, 1, 2].map((dot) => `<circle cx="${ED.x + 20 + dot * 17}" cy="${ED.y + titlebar_height / 2}" r="5" fill="#46336a"/>`).join('')}
    <rect x="${ED.x + 76}" y="${ED.y}" width="${ED.width - 76}" height="${titlebar_height}" fill="${EDITOR.body}"/>
    <rect x="${ED.x + 76}" y="${ED.y}" width="${ED.width - 76}" height="2" fill="${STROKE}"/>
    <text x="${ED.x + 94}" y="${ED.y + 26}" font-family="${MONO}" font-size="13" fill="${EDITOR.text}">${escape(file)}</text>
    <rect x="${ED.x}" y="${ED.y + titlebar_height + crumbs_height - 1}" width="${ED.width}" height="1" fill="${EDITOR.line}"/>
    <text x="${ED.x + 18}" y="${ED.y + titlebar_height + 20}" font-family="${SANS}" font-size="13" fill="${EDITOR.crumbs}" xml:space="preserve">${crumbs}</text>

    <rect x="${ED.x}" y="${cited_top}" width="${ED.width}" height="${cited_height}" fill="${EDITOR.cited}"/>
    <rect x="${ED.x}" y="${cited_top}" width="4" height="${cited_height}" fill="${STROKE}"/>
    <g font-family="${MONO}" font-size="${CODE_SIZE}">${lines}</g>
    <rect x="${ED.x + ED.width - 128}" y="${cited_top + 7}" width="114" height="24" rx="12" fill="${STROKE}"/>
    <text x="${ED.x + ED.width - 71}" y="${cited_top + 24}" text-anchor="middle" font-family="${MONO}" font-size="12" font-weight="700" fill="${EDITOR.tag_text}">cited :${escape(range)}</text>

    <rect x="${ED.x}" y="${code_bottom}" width="${ED.width}" height="${status_height}" fill="${EDITOR.status}"/>
    <text x="${ED.x + 18}" y="${code_bottom + 20}" font-family="${SANS}" font-size="13" fill="#f5f3ff" xml:space="preserve">Markdown     Lines ${escape(range)} cited     ${tokens} tokens</text>
  </g>
  <rect x="${ED.x + 0.5}" y="${ED.y + 0.5}" width="${ED.width - 1}" height="${ED.height - 1}" rx="14" fill="none" stroke="${EDITOR.border}"/>`;
}

interface Card {
	file: string;
	title: string[];
	/** The line of the title that gets the hand-drawn stroke */
	marked: number;
}

const LEFT = 72;
const DOMAIN = new URL(site.url).host;

function render(card: Card) {
	const title_size = 84;
	const line_gap = title_size * 1.0;
	// The title alone, level with the middle of the editor
	const title_top =
		315 -
		((card.title.length - 1) * line_gap) / 2 +
		title_size * 0.36;
	// The stroke under the marked line, roughly its width
	const marked_y = title_top + card.marked * line_gap + 22;
	const marked_width =
		card.title[card.marked]!.length * title_size * 0.48;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="band" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${BAND_TOP}"/><stop offset="1" stop-color="${BAND}"/></linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%"><feGaussianBlur stdDeviation="22"/></filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#band)"/>

  ${mark(LEFT, 56, 40)}
  <text x="${LEFT + 54}" y="85" font-family="${SANS_SEMIBOLD}" font-size="30" fill="${WHITE}">${site.name}</text>

  <path d="M${LEFT + 2} ${marked_y} c ${marked_width * 0.17} -12, ${marked_width * 0.32} 6, ${marked_width * 0.5} -4 s ${marked_width * 0.34} -10, ${marked_width * 0.5} 2" fill="none" stroke="${STROKE}" stroke-width="7" stroke-linecap="round"/>
  <g font-family="${SANS_EXTRABOLD}" font-size="${title_size}" fill="${WHITE}" letter-spacing="-3">
    ${card.title
			.map(
				(line, index) =>
					`<text x="${LEFT - 4}" y="${title_top + index * line_gap}">${escape(line)}</text>`,
			)
			.join('')}
  </g>
  <text x="${LEFT}" y="${HEIGHT - 52}" font-family="${MONO}" font-size="20" fill="${MUTED}">${DOMAIN}</text>
${editor()}
</svg>`;
}

const cards: Card[] = [
	{
		file: 'home',
		title: ['Docs search', 'for your', 'coding agent.'],
		marked: 2,
	},
];

mkdirSync(OUTPUT_DIR, { recursive: true });

for (const card of cards) {
	const png = new Resvg(render(card), {
		fitTo: { mode: 'original' },
		font: { fontFiles: FONT_FILES, loadSystemFonts: false },
	})
		.render()
		.asPng();

	writeFileSync(new URL(`${card.file}.png`, OUTPUT_DIR), png);
}

rmSync(font_dir, { recursive: true });

console.log(`Generated ${cards.length} share cards in static/og`);
