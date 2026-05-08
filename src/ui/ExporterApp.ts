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
