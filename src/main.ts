import './styles/tailwind.css';
import { ExporterApp } from './ui/ExporterApp';

Hooks.once('init', () => {
    console.log('Mag Obsidian Exporter | Initializing module');
});

let exporterInstance: ExporterApp | null = null;

Hooks.on('renderJournalDirectory', (app: any, htmlOrElement: any) => {
    // Accommodate Foundry V14 App V2 HTML structure (HTMLElement instead of JQuery)
    const html = htmlOrElement instanceof HTMLElement ? htmlOrElement : htmlOrElement[0];

    // Prevent duplicate injection on re-renders
    if (html.querySelector('#mag-obsidian-export-btn')) return;

    // Find the directory footer
    let footer = html.querySelector('.directory-footer');
    if (!footer) {
        footer = document.createElement('footer');
        footer.className = 'directory-footer action-buttons flexrow';
        html.appendChild(footer);
    }

    // Create the export button container
    const btnContainer = document.createElement('div');
    btnContainer.className = 'header-actions action-buttons flexrow';

    const btnHtml = `
        <button id="mag-obsidian-export-btn" type="button" class="mt-2 w-full" data-action="mag-obsidian-export">
            <i class="fas fa-book"></i> Sync with Obsidian
        </button>
    `;

    btnContainer.innerHTML = btnHtml;

    const exportBtn = btnContainer.firstElementChild;
    if (exportBtn) {
        exportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (exporterInstance && exporterInstance.rendered) {
                // Application V1 fallback/method call (using bringToTop to be safe, sometimes it exists in older/newer APIs differently)
                if (typeof (exporterInstance as any).bringToTop === 'function') {
                    (exporterInstance as any).bringToTop();
                }
                return;
            }
            exporterInstance = new ExporterApp();
            exporterInstance.render(true);
        });
        footer.appendChild(btnContainer);
    }
});
