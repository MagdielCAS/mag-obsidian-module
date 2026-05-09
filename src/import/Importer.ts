import JSZip from 'jszip';
import yaml from 'js-yaml';
import { htmlToMarkdown } from '../export/markdown';

export interface FileChange {
    filename: string;
    path: string;
    type: 'actor' | 'journal-page' | 'unknown';
    status: 'new' | 'modified';
    originalMarkdown?: string;
    incomingMarkdown: string;
    documentId?: string;
    system?: any;
    title?: string; // name of the document based on filename or frontmatter
    isHtmlOrigin: boolean;
}

export class VaultImporter {
    async parseZip(file: File): Promise<FileChange[]> {
        const changes: FileChange[] = [];
        const zip = new JSZip();

        try {
            const contents = await zip.loadAsync(file);

            for (const [path, zipEntry] of Object.entries(contents.files)) {
                if (zipEntry.dir) continue;
                if (!path.endsWith('.md')) continue; // Skip assets for now

                const markdownContent = await zipEntry.async('string');
                const parsed = this.parseFrontmatter(markdownContent);

                const filename = path.split('/').pop() || path;
                const change: FileChange = {
                    filename,
                    path,
                    type: parsed.data?.type || 'unknown',
                    status: 'new', // Default to new
                    incomingMarkdown: markdownContent,
                    documentId: parsed.data?.id,
                    system: parsed.data?.system,
                    title: parsed.data?.title || filename.replace('.md', ''),
                    isHtmlOrigin: true // Will determine later based on Foundry doc
                };

                if (change.documentId) {
                    const foundryDoc = this.getFoundryDocument(change.type, change.documentId);
                    if (foundryDoc) {
                        const { originalMarkdown, isHtml } = await this.getOriginalMarkdown(foundryDoc, change.type);
                        change.isHtmlOrigin = isHtml;
                        change.originalMarkdown = originalMarkdown;

                        // Check if content has actually changed
                        if (originalMarkdown !== markdownContent) {
                            change.status = 'modified';
                            changes.push(change);
                        }
                    } else {
                        // ID present but doc not found in Foundry - treat as new or error?
                        // For now, treat as new.
                        change.status = 'new';
                        changes.push(change);
                    }
                } else {
                    // No ID, it's a completely new file created in Obsidian
                    change.status = 'new';
                    changes.push(change);
                }
            }

        } catch (error) {
            console.error("Error parsing zip file:", error);
            throw new Error("Failed to parse zip file.");
        }

        return changes;
    }

    private parseFrontmatter(markdown: string): { data: any, content: string } {
        const match = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        if (match) {
            try {
                const data = yaml.load(match[1]);
                return { data, content: match[2] };
            } catch (e) {
                console.warn("Failed to parse frontmatter", e);
            }
        }
        return { data: {}, content: markdown };
    }

    private getFoundryDocument(type: string, id: string): any {
        if (type === 'actor') {
            return game.actors?.get(id);
        } else if (type === 'journal-page') {
            // Need to search all journals for the page
            if (game.journal) {
                 for (const journal of game.journal.contents) {
                     const page = journal.pages?.get(id);
                     if (page) return page;
                 }
            }
        }
        return null;
    }

    private async getOriginalMarkdown(doc: any, type: string): Promise<{originalMarkdown: string, isHtml: boolean}> {
        // Reconstruct how we exported it so we have a valid baseline for comparison
        let content = '';
        let isHtml = true;

        if (type === 'actor') {
            const frontmatter = this.createMockFrontmatter({
                type: 'actor',
                id: doc.id,
                system: doc.system,
                // We're ignoring the image diff for simplicity of text diff
            });
            content += frontmatter;
            content += `# ${doc.name}\n\n`;

            if (doc.system && (doc.system as any).attributes) {
                 const attrs = (doc.system as any).attributes;
                 content += `## Attributes\n`;
                 for (const [key, val] of Object.entries(attrs)) {
                     content += `- **${key}**: ${JSON.stringify(val)}\n`;
                 }
                 content += '\n';
            }

            const desc = (doc.system as any)?.details?.biography?.value || '';
            if (desc) {
                let md = htmlToMarkdown(desc);
                content += `## Biography\n\n${md}\n`;
            }
        } else if (type === 'journal-page') {
            const frontmatter = this.createMockFrontmatter({
                type: 'journal-page',
                id: doc.id,
                title: doc.name
            });
            content += frontmatter;
            content += `# ${doc.name}\n\n`;

            if (doc.type === 'text') {
                const textObj = doc.text;
                isHtml = textObj.format === 1; // 1 usually means HTML in Foundry
                const rawContent = textObj.content || '';

                if (isHtml) {
                    let md = htmlToMarkdown(rawContent);
                    content += md;
                } else {
                    content += rawContent; // It's already markdown
                }
            }
        }

        return { originalMarkdown: content, isHtml };
    }

    private createMockFrontmatter(data: any): string {
        try {
            const yamlStr = yaml.dump(data, { skipInvalid: true });
            return `---\n${yamlStr}---\n\n`;
        } catch (e) {
            return '';
        }
    }
}
