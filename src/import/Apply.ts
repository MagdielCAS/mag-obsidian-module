import { FileChange } from './Importer';
// @ts-ignore
import { marked } from 'marked';
import { convertLinks } from '../export/markdown';

// marked configuration to match showdown/Foundry expectations roughly
marked.setOptions({
  gfm: true,
  breaks: true,
});

export async function applyChanges(changes: FileChange[]) {
    for (const change of changes) {
        let contentToSave = change.incomingMarkdown;

        // Remove Frontmatter from content
        const fmMatch = contentToSave.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
        if (fmMatch) {
            contentToSave = fmMatch[1].trim();
        }

        // Handle WikiLinks -> Foundry UUID conversion (reverse of export)
        // Since UUIDs might be hard to map back strictly if the user created links in Obsidian,
        // we might leave them as text or attempt a reverse lookup.
        // For now, we'll keep it simple and just let Foundry's text editor handle raw text.
        // A full reverse-UUID linker is complex, but we can do a basic replacement if we wanted.

        let finalHtml = contentToSave;
        if (change.isHtmlOrigin) {
            finalHtml = await marked.parse(contentToSave);
        }

        if (change.status === 'modified' && change.documentId) {
            // Update Existing Document
            await updateExistingDocument(change, finalHtml, contentToSave);
        } else if (change.status === 'new') {
            // Create New Document
            await createNewDocument(change, contentToSave);
        }
    }
}

async function updateExistingDocument(change: FileChange, finalHtml: string, rawMarkdown: string) {
    if (change.type === 'actor') {
        const actor = game.actors?.get(change.documentId!);
        if (actor) {
            // We assume the user edited the biography. Attributes edit is out of scope for a simple text diff.
            // Parse out the ## Biography section
            const bioMatch = rawMarkdown.match(/## Biography\n\n([\s\S]*)$/);
            let bioContent = bioMatch ? bioMatch[1] : rawMarkdown;
            const bioHtml = await marked.parse(bioContent);

            await (actor as any).update({
                'system.details.biography.value': bioHtml
            });
        }
    } else if (change.type === 'journal-page') {
        let targetPage: any = null;
        if (game.journal) {
            for (const journal of game.journal.contents) {
                targetPage = journal.pages?.get(change.documentId!);
                if (targetPage) break;
            }
        }

        if (targetPage && targetPage.type === 'text') {
            const format = change.isHtmlOrigin ? 1 : 2; // 1 = HTML, 2 = Markdown
            await targetPage.update({
                'text.content': change.isHtmlOrigin ? finalHtml : rawMarkdown,
                'text.format': format
            });
        }
    }
}

async function createNewDocument(change: FileChange, rawMarkdown: string) {
    // Determine folder structure from path
    // Path looks like "Folder1/Folder2/Filename.md"
    const pathParts = change.path.split('/');
    pathParts.pop(); // Remove filename

    let parentFolderId: string | null = null;
    let currentFolders = game.folders?.contents || [];

    for (const folderName of pathParts) {
        let folder = currentFolders.find(f => f.name === folderName && f.type === 'JournalEntry' && f.folder?.id === parentFolderId);
        if (!folder) {
            folder = await Folder.create({
                name: folderName,
                type: 'JournalEntry',
                folder: parentFolderId
            }) as any;
        }
        if (folder) {
            parentFolderId = folder.id;
            // Foundry's API doesn't instantly update game.folders.contents in the same tick sometimes,
            // but we can just use the returned folder.
        }
    }

    // Default to JournalEntry for new files
    // If it's a completely new file, it goes into a Journal.

    // Check if a JournalEntry with the filename exists in this folder
    const entryName = change.title || change.filename.replace('.md', '');
    let journalEntry = game.journal?.contents.find(j => j.name === entryName && j.folder?.id === parentFolderId);

    if (!journalEntry) {
        journalEntry = await JournalEntry.create({
            name: entryName,
            folder: parentFolderId
        }) as any;
    }

    if (journalEntry) {
        // Create the page as Markdown
        await JournalEntryPage.create({
            name: entryName,
            type: 'text',
            text: {
                content: rawMarkdown,
                format: 2 as any // Markdown
            }
        }, { parent: journalEntry });
    }
}
