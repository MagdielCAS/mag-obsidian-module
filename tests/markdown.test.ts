import { describe, it, expect, vi } from 'vitest';
import { htmlToMarkdown, createFrontmatter, convertLinks } from '../src/export/markdown';

describe('markdown utility functions', () => {
    describe('htmlToMarkdown', () => {
        it('should correctly convert heading to atx style', () => {
            const html = '<h1>Heading 1</h1>';
            const md = htmlToMarkdown(html);
            expect(md).toBe('# Heading 1');
        });

        it('should correctly convert bold and em tags', () => {
            const html = '<b>Bold text</b> and <em>Emphasized</em>';
            const md = htmlToMarkdown(html);
            expect(md).toBe('**Bold text** and *Emphasized*');
        });

        it('should correctly convert list items', () => {
            const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
            const md = htmlToMarkdown(html);
            // Turndown puts extra spaces by default for list alignment sometimes
            expect(md).toContain('-   Item 1');
            expect(md).toContain('-   Item 2');
        });
    });

    describe('createFrontmatter', () => {
        it('should return empty string if data is empty', () => {
            expect(createFrontmatter({})).toBe('');
            expect(createFrontmatter(null)).toBe('');
        });

        it('should generate valid yaml frontmatter block', () => {
            const data = { type: 'actor', name: 'Goblin' };
            const fm = createFrontmatter(data);
            expect(fm).toContain('---');
            expect(fm).toContain('type: actor');
            expect(fm).toContain('name: Goblin');
        });
    });

    describe('convertLinks', () => {
        it('should convert foundry links with label', async () => {
            const text = 'Here is a @UUID[JournalEntry.123]{My Journal} link.';
            const result = await convertLinks(text);
            expect(result).toBe('Here is a [[My Journal]] link.');
        });

        it('should convert foundry links without label and fallback to UUID when missing fromUuid', async () => {
            const text = 'Link without label @UUID[JournalEntry.123] in text.';
            const result = await convertLinks(text);
            expect(result).toBe('Link without label [[JournalEntry.123]] in text.');
        });

        it('should resolve name using fromUuid if available', async () => {
            // @ts-ignore
            global.fromUuid = vi.fn().mockResolvedValue({ name: 'Resolved Name' });

            const text = 'Check out @UUID[Actor.456] right here.';
            const result = await convertLinks(text);
            expect(result).toBe('Check out [[Resolved Name]] right here.');

            // @ts-ignore
            delete global.fromUuid;
        });
    });
});
