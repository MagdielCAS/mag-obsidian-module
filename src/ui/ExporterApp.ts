import { applyChanges } from '../import/Apply';
import { VaultImporter } from '../import/Importer';
import { DiffViewerApp } from './DiffViewerApp';
import { VaultExporter } from '../export/Exporter';

export class ExporterApp extends Application {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: 'mag-obsidian-exporter',
            classes: ['mag-obsidian-app'],
            title: "Mag's Obsidian Sync",
            template: 'modules/mag-obsidian-module/templates/exporter.hbs',
            width: 600,
            height: 500,
            resizable: true,
        });
    }

    activateListeners(html: JQuery) {


        const fileInput = html.find('#import-zip-file');
        const btnImport = html.find('#btn-import');

        fileInput.on('change', (e) => {
            const files = (e.currentTarget as HTMLInputElement).files;
            if (files && files.length > 0) {
                btnImport.prop('disabled', false);
            } else {
                btnImport.prop('disabled', true);
            }
        });

        btnImport.on('click', async (e) => {
            e.preventDefault();
            const files = (fileInput[0] as HTMLInputElement).files;
            if (!files || files.length === 0) return;

            const file = files[0];
            // TODO: Start import process here
            console.log("Importing file:", file.name);
            ui.notifications?.info("Import process starting...");

            try {
                btnImport.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-2"></i> Analyzing...');
                const importer = new VaultImporter();
                const changes = await importer.parseZip(file);

                if (changes.length === 0) {
                    ui.notifications?.info("No changes found to import.");
                } else {
                    const diffApp = new DiffViewerApp(changes);
                    // Pass the apply handler via options
                    (diffApp.options as any).onApply = async (finalChanges: any[]) => {
                        await applyChanges(finalChanges);
                    };
                    diffApp.render(true);
                }
            } catch (err) {
                console.error("Mag Obsidian Sync | Import Error:", err);
                ui.notifications?.error("Failed to parse zip file.");
            } finally {
                btnImport.prop('disabled', false).html('<i class="fas fa-file-import mr-2"></i> Import / Review Changes');
            }
        });

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
