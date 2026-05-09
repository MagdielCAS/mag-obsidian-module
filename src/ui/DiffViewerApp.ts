import { FileChange } from '../import/Importer';
import * as Diff from 'diff';

export class DiffViewerApp extends Application {
    changes: FileChange[];
    currentIndex: number = -1;

    constructor(changes: FileChange[]) {
        super();
        this.changes = changes;
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: 'mag-obsidian-diff-viewer',
            classes: ['mag-obsidian-app'],
            title: "Review Changes",
            template: 'modules/mag-obsidian-module/templates/diff-viewer.hbs',
            width: 900,
            height: 600,
            resizable: true,
        });
    }

    getData() {
        return {
            changes: this.changes
        };
    }

    activateListeners(html: JQuery) {
        super.activateListeners(html);

        const fileItems = html.find('.file-item');
        const titleEl = html.find('#current-file-name');
        const originalEl = html.find('#original-content');
        const incomingEl = html.find('#incoming-content');
        const btnCancel = html.find('#btn-cancel');
        const btnApply = html.find('#btn-apply');

        // Select first item by default if exists
        if (this.changes.length > 0) {
            this.selectFile(0, html);
        }

        fileItems.on('click', (e) => {
            const index = parseInt($(e.currentTarget).data('index'));
            this.selectFile(index, html);
        });

        // Save edits back to the model as user types
        incomingEl.on('input', (e) => {
            if (this.currentIndex >= 0 && this.currentIndex < this.changes.length) {
                this.changes[this.currentIndex].incomingMarkdown = (e.currentTarget as HTMLTextAreaElement).value;
            }
        });

        btnCancel.on('click', (e) => {
            e.preventDefault();
            this.close();
        });

        btnApply.on('click', async (e) => {
            e.preventDefault();
            btnApply.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-2"></i> Applying...');

            try {
                // Call application logic (implemented in next step)
                if ((this.options as any).onApply) {
                    await (this.options as any).onApply(this.changes);
                }
                ui.notifications?.info("Changes applied successfully!");
                this.close();
            } catch (err) {
                console.error("Mag Obsidian Sync | Apply Error:", err);
                ui.notifications?.error("Failed to apply changes.");
                btnApply.prop('disabled', false).html('<i class="fas fa-check mr-2"></i> Apply Changes');
            }
        });
    }

    selectFile(index: number, html: JQuery) {
        // Save current text area if needed (already handled by input event, but good practice)

        this.currentIndex = index;
        const change = this.changes[index];

        // Update UI selection
        html.find('.file-item').removeClass('bg-blue-100 dark:bg-blue-900 border-l-4 border-blue-500');
        html.find(`.file-item[data-index="${index}"]`).addClass('bg-blue-100 dark:bg-blue-900 border-l-4 border-blue-500');

        html.find('#current-file-name').text(change.path);

        const originalText = change.originalMarkdown || '';
        const incomingText = change.incomingMarkdown || '';

        // Generate Diff Highlights for the original view
        // We highlight deletions in red on the original side
        if (change.status === 'new') {
            html.find('#original-content').html('<div class="text-center text-gray-500 italic mt-10">New File (No previous content)</div>');
        } else {
            const diff = Diff.diffLines(originalText, incomingText);
            let originalHtml = '';

            diff.forEach((part) => {
                const colorClass = part.removed ? 'bg-red-200 dark:bg-red-900/50 text-red-900 dark:text-red-100 line-through' : '';
                // We only show what was removed or unchanged on the left side
                if (!part.added) {
                     const safeText = part.value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                     originalHtml += `<span class="${colorClass}">${safeText}</span>`;
                }
            });
            html.find('#original-content').html(originalHtml);
        }

        // Set incoming text to editable textarea
        html.find('#incoming-content').val(incomingText);
    }
}
