import TurndownService from 'turndown';
// @ts-ignore
import { gfm } from 'turndown-plugin-gfm';
import yaml from 'js-yaml';

const turndownService = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*'
});

turndownService.use(gfm);

export function htmlToMarkdown(html: string): string {
    return turndownService.turndown(html);
}

export function createFrontmatter(data: any): string {
    if (!data || Object.keys(data).length === 0) return '';
    try {
        const yamlStr = yaml.dump(data, { skipInvalid: true });
        return `---\n${yamlStr}---\n\n`;
    } catch (e) {
        console.error("Error creating YAML frontmatter", e);
        return '';
    }
}

export async function convertLinks(text: string): Promise<string> {
    const regex = /@UUID\[([^\]]+)\](?:{([^}]+)})?/g;
    let matches = [...text.matchAll(regex)];
    let result = text;
    for (const match of matches) {
        const fullMatch = match[0];
        const uuid = match[1];
        const label = match[2];
        let linkText = label;
        if (!linkText) {
            try {
                // @ts-ignore
                const doc = await fromUuid(uuid);
                if (doc && doc.name) {
                    linkText = doc.name;
                } else {
                    linkText = uuid;
                }
            } catch (e) {
                linkText = uuid;
            }
        }
        result = result.replace(fullMatch, `[[${linkText}]]`);
    }
    return result;
}
