cat > src/env.d.ts << 'ENV'
declare module '*.css';
ENV

cat > src/module.json << 'MOD'
{
  "id": "mag-obsidian-module",
  "title": "Mag's Obsidian Exporter",
  "description": "Export Foundry VTT worlds to Obsidian Vaults.",
  "version": "1.0.0",
  "manifestPlusVersion": "1.2.0",
  "compatibility": {
    "minimum": "11",
    "verified": "12"
  },
  "authors": [
    {
      "name": "MagdielCAS"
    }
  ],
  "esmodules": [
    "mag-obsidian-module.js"
  ],
  "styles": [
    "style.css"
  ],
  "url": "https://github.com/MagdielCAS/mag-obsidian-module",
  "manifest": "https://github.com/MagdielCAS/mag-obsidian-module/releases/latest/download/module.json",
  "download": "https://github.com/MagdielCAS/mag-obsidian-module/releases/latest/download/mag-obsidian-module.zip"
}
MOD

cat > src/styles/tailwind.css << 'CSS'
@tailwind base;
@tailwind components;
@tailwind utilities;
.mag-obsidian-app {}
CSS

cat > src/templates/exporter.hbs << 'HBS'
<div class="p-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 flex flex-col h-full">
  <h2 class="text-2xl font-bold mb-4">Export to Obsidian Vault</h2>
  <div class="mb-4">
    <label class="flex items-center space-x-2 cursor-pointer">
      <input type="checkbox" id="export-whole-world" class="form-checkbox h-5 w-5 text-blue-600 rounded" checked>
      <span class="text-lg">Export Entire World</span>
    </label>
  </div>
  <div id="selection-tree-container" class="hidden flex-1 overflow-y-auto border border-gray-300 dark:border-gray-700 p-2 rounded mb-4">
    <p class="text-sm mb-2 text-gray-600 dark:text-gray-400">Select the documents or folders you want to export:</p>
    <div id="selection-tree"></div>
  </div>
  <div class="mt-auto pt-4 border-t border-gray-300 dark:border-gray-700 flex justify-end">
    <button id="btn-export" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center">
      <i class="fas fa-file-export mr-2"></i> Export Now
    </button>
  </div>
</div>
HBS

cat > src/export/markdown.ts << 'MDT'
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
MDT

cat > src/export/assets.ts << 'AST'
import JSZip from 'jszip';

export async function fetchAsset(url: string): Promise<Blob | null> {
    try {
        const response = await fetch(url);
        if (response.ok) {
            return await response.blob();
        }
    } catch (e) {
        console.error(`Failed to fetch asset from ${url}`, e);
    }
    return null;
}

export async function processImagesInMarkdown(
    markdown: string,
    zipRoot: JSZip,
    basePath: string
): Promise<string> {
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let matches = [...markdown.matchAll(imgRegex)];
    let result = markdown;
    const assetsFolderMap = `${basePath}/Assets`;
    const zipAssetsFolder = zipRoot.folder(assetsFolderMap);

    for (const match of matches) {
        const fullMatch = match[0];
        const url = match[2];

        if (url && !url.startsWith('http') && !url.startsWith('data:')) {
            const fileName = url.split('/').pop() || 'image.png';
            const blob = await fetchAsset(url);

            if (blob && zipAssetsFolder) {
                zipAssetsFolder.file(fileName, blob);
                result = result.replace(fullMatch, `![[${fileName}]]`);
            }
        }
    }
    return result;
}

export async function exportActorImage(
    imgUrl: string | undefined,
    zipRoot: JSZip,
    basePath: string,
    actorName: string
): Promise<string | null> {
    if (!imgUrl || imgUrl === 'icons/svg/mystery-man.svg' || imgUrl.startsWith('http') || imgUrl.startsWith('data:')) return null;

    const assetsFolderMap = `${basePath}/Assets`;
    const zipAssetsFolder = zipRoot.folder(assetsFolderMap);

    const ext = imgUrl.split('.').pop() || 'png';
    const fileName = `${actorName.replace(/[<>:"/\\|?*]+/g, '_')}_token.${ext}`;

    const blob = await fetchAsset(imgUrl);
    if (blob && zipAssetsFolder) {
        zipAssetsFolder.file(fileName, blob);
        return `Assets/${fileName}`;
    }
    return null;
}
AST

cat > src/export/Exporter.ts << 'EXP'
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
EXP

cat > src/export/index.ts << 'IND'
export * from './Exporter';
export * from './markdown';
export * from './assets';
IND

cat > src/ui/ExporterApp.ts << 'UIA'
import { VaultExporter } from '../export/Exporter';

export class ExporterApp extends Application {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: 'mag-obsidian-exporter',
            classes: ['mag-obsidian-app'],
            title: "Mag's Obsidian Exporter",
            template: 'modules/mag-obsidian-module/templates/exporter.hbs',
            width: 600,
            height: 500,
            resizable: true,
        });
    }

    activateListeners(html: JQuery) {
        super.activateListeners(html);
        const wholeWorldCheckbox = html.find('#export-whole-world');
        const treeContainer = html.find('#selection-tree-container');
        const btnExport = html.find('#btn-export');

        wholeWorldCheckbox.on('change', (e) => {
            if ((e.currentTarget as HTMLInputElement).checked) {
                treeContainer.addClass('hidden');
            } else {
                treeContainer.removeClass('hidden');
                this.renderTree(html.find('#selection-tree'));
            }
        });

        btnExport.on('click', async (e) => {
            e.preventDefault();
            btnExport.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-2"></i> Exporting...');

            try {
                ui.notifications?.info("Vault export started. This may take a while...");
                const exporter = new VaultExporter();
                const zip = await exporter.exportWorld();

                ui.notifications?.info("Generating zip file...");
                const zipBlob = await zip.generateAsync({ type: 'blob' });

                const url = URL.createObjectURL(zipBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${game.world?.id || 'foundry_vault'}_export.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                ui.notifications?.info("Export completed successfully!");
            } catch (error) {
                console.error("Mag Obsidian Exporter | Error:", error);
                ui.notifications?.error("Export failed! Check console for details.");
            } finally {
                btnExport.prop('disabled', false).html('<i class="fas fa-file-export mr-2"></i> Export Now');
            }
        });
    }

    async renderTree(container: JQuery) {
        container.html('<p class="italic text-gray-500">Tree view feature is planned for a future update. For now, entire world will be exported.</p>');
    }
}
UIA

cat > src/main.ts << 'MTS'
import './styles/tailwind.css';
import { ExporterApp } from './ui/ExporterApp';

Hooks.once('init', () => {
    console.log('Mag Obsidian Exporter | Initializing module');
});

Hooks.on('renderSettings', (app: any, html: any) => {
    const btnHtml = `
        <button id="mag-obsidian-export-btn" class="mt-2" data-action="mag-obsidian-export">
            <i class="fas fa-book"></i> Export to Obsidian
        </button>
    `;
    const settingsDiv = html.find('#settings-documentation');
    if (settingsDiv.length) {
        settingsDiv.append(btnHtml);
    } else {
        html.find('#settings-game').append(btnHtml); // Fallback
    }

    html.find('#mag-obsidian-export-btn').on('click', (e: Event) => {
        e.preventDefault();
        new ExporterApp().render(true);
    });
});
MTS
