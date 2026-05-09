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
