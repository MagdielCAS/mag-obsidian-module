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
