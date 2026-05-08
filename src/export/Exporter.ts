import { createFrontmatter, htmlToMarkdown, convertLinks } from './markdown';
import { processImagesInMarkdown, exportActorImage, fetchAsset } from './assets';
import JSZip from 'jszip';

export class VaultExporter {
    private zip: JSZip;

    constructor() {
        this.zip = new JSZip();
    }

    async exportWorld() {
        const rootFolder = this.zip.folder('FoundryVault');
        if (!rootFolder) throw new Error("Failed to create zip folder");

        await this.exportFolders(rootFolder);
        await this.exportActors(rootFolder);
        await this.exportJournals(rootFolder);

        return this.zip;
    }

    private getFolderPath(folder: Folder | null): string {
        if (!folder) return '';
        const parents = [];
        let current: Folder | null = folder;
        while (current) {
            parents.unshift(this.sanitizeFilename(current.name));
            current = current.folder || null;
        }
        return parents.join('/');
    }

    private sanitizeFilename(name: string): string {
        return name.replace(/[<>:"/\\|?*]+/g, '_').trim();
    }

    private async exportFolders(zipRoot: JSZip) {
        const folders = game.folders?.contents || [];
        for (const folder of folders) {
            const path = this.getFolderPath(folder);
            zipRoot.folder(path);
        }
    }

    private async exportActors(zipRoot: JSZip) {
        const actors = game.actors?.contents || [];
        for (const actor of actors) {
            const path = this.getFolderPath(actor.folder || null);
            const dir = path ? zipRoot.folder(path) : zipRoot;
            if (!dir) continue;

            let imgPath = null;
            if (actor.img) {
                imgPath = await exportActorImage(actor.img, zipRoot, path, actor.name);
            }

            const frontmatter = createFrontmatter({
                type: 'actor',
                id: actor.id,
                system: actor.system,
                image: imgPath ? `[[${imgPath.split('/').pop()}]]` : undefined
            });

            let content = frontmatter;
            content += `# ${actor.name}\n\n`;

            if (imgPath) {
                content += `![[${imgPath.split('/').pop()}]]\n\n`;
            }

            if (actor.system && (actor.system as any).attributes) {
                 const attrs = (actor.system as any).attributes;
                 content += `## Attributes\n`;
                 for (const [key, val] of Object.entries(attrs)) {
                     content += `- **${key}**: ${JSON.stringify(val)}\n`;
                 }
                 content += '\n';
            }

            const desc = (actor.system as any)?.details?.biography?.value || '';
            if (desc) {
                let md = htmlToMarkdown(desc);
                md = await convertLinks(md);
                md = await processImagesInMarkdown(md, zipRoot, path);
                content += `## Biography\n\n${md}\n`;
            }

            const fileName = `${this.sanitizeFilename(actor.name)}.md`;
            dir.file(fileName, content);
        }
    }

    private async exportJournals(zipRoot: JSZip) {
        const journals = game.journal?.contents || [];
        for (const journal of journals) {
            const path = this.getFolderPath(journal.folder || null);
            const journalDirName = this.sanitizeFilename(journal.name);
            const fullPath = path ? `${path}/${journalDirName}` : journalDirName;
            const journalDir = zipRoot.folder(fullPath);
            if (!journalDir) continue;

            const pages = journal.pages?.contents || [];
            for (const page of pages) {
                if (page.type === 'text') {
                    const frontmatter = createFrontmatter({
                        type: 'journal-page',
                        id: page.id,
                        title: page.name
                    });

                    let content = frontmatter;
                    content += `# ${page.name}\n\n`;

                    const htmlContent = page.text?.content || '';
                    let md = htmlToMarkdown(htmlContent);
                    md = await convertLinks(md);
                    md = await processImagesInMarkdown(md, zipRoot, fullPath);

                    content += md;

                    const fileName = `${this.sanitizeFilename(page.name)}.md`;
                    journalDir.file(fileName, content);
                } else if (page.type === 'image') {
                    const imgUrl = page.src;
                    if (imgUrl) {
                        const blob = await fetchAsset(imgUrl);
                        if (blob) {
                            const assetsFolderMap = `${fullPath}/Assets`;
                            const zipAssetsFolder = zipRoot.folder(assetsFolderMap);
                            const ext = imgUrl.split('.').pop() || 'png';
                            const fileName = `${this.sanitizeFilename(page.name)}.${ext}`;
                            if (zipAssetsFolder) {
                                zipAssetsFolder.file(fileName, blob);

                                const frontmatter = createFrontmatter({
                                    type: 'journal-page',
                                    id: page.id,
                                    title: page.name
                                });
                                let content = frontmatter;
                                content += `# ${page.name}\n\n![[${fileName}]]`;
                                journalDir.file(`${this.sanitizeFilename(page.name)}.md`, content);
                            }
                        }
                    }
                }
            }
        }
    }
}
