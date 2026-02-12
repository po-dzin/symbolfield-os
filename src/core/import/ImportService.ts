import { asEdgeId, asNodeId, type Edge, type NodeBase } from '../types';
import type { SpaceData } from '../state/SpaceManager';
import { spaceManager } from '../state/SpaceManager';

export type ImportKind = 'markdown' | 'document' | 'pdf' | 'unsupported';

export interface ImportedDocument {
    id: string;
    name: string;
    label: string;
    kind: Exclude<ImportKind, 'unsupported'>;
    content: string;
    size: number;
}

export interface ImportResult {
    spaceId: string;
    importedCount: number;
    ignoredFiles: string[];
    warnings: string[];
}

const IMPORT_GRID_COLUMNS = 3;
const IMPORT_CELL_GAP = 220;

const stripExtension = (name: string): string => name.replace(/\.[^.]+$/, '');

const toTitle = (name: string): string => {
    const normalized = stripExtension(name).replace(/[-_]+/g, ' ').trim();
    if (!normalized) return 'Imported';
    return normalized.replace(/\s+/g, ' ');
};

export const detectImportKind = (fileName: string, mimeType: string): ImportKind => {
    const lowerName = fileName.toLowerCase();
    const lowerMime = mimeType.toLowerCase();

    if (lowerName.endsWith('.md') || lowerName.endsWith('.markdown') || lowerName.endsWith('.txt')) {
        return 'markdown';
    }
    if (lowerName.endsWith('.pdf') || lowerMime === 'application/pdf') {
        return 'pdf';
    }
    if (lowerName.endsWith('.doc') || lowerName.endsWith('.docx') || lowerMime.includes('wordprocessingml') || lowerMime.includes('msword')) {
        return 'document';
    }
    return 'unsupported';
};

export const extractWikiLinks = (content: string): string[] => {
    const links: string[] = [];
    const regex = /\[\[([^[\]]+)\]\]/g;
    let match: RegExpExecArray | null = regex.exec(content);
    while (match) {
        const target = match[1]?.trim();
        if (target) links.push(target.toLowerCase());
        match = regex.exec(content);
    }
    return links;
};

const buildDocumentNodeContent = (doc: ImportedDocument): string => {
    if (doc.kind === 'markdown') {
        return doc.content;
    }
    if (doc.kind === 'pdf') {
        return [
            '# Imported PDF',
            '',
            `File: ${doc.name}`,
            `Size: ${doc.size} bytes`,
            '',
            'Text extraction for PDF will be extended in the next iteration.'
        ].join('\n');
    }
    return [
        '# Imported Document',
        '',
        `File: ${doc.name}`,
        `Size: ${doc.size} bytes`,
        '',
        'DOC/DOCX parsing will be extended in the next iteration.'
    ].join('\n');
};

export const buildImportedSpaceData = (docs: ImportedDocument[]): SpaceData => {
    const now = Date.now();
    const nodes: NodeBase[] = [];
    const nodeIdByLabel = new Map<string, string>();
    const pendingLinks: Array<{ sourceId: string; targetLabel: string }> = [];

    docs.forEach((doc, index) => {
        const id = asNodeId(`import-${crypto.randomUUID()}`);
        const col = index % IMPORT_GRID_COLUMNS;
        const row = Math.floor(index / IMPORT_GRID_COLUMNS);
        const x = (col - 1) * IMPORT_CELL_GAP;
        const y = row * IMPORT_CELL_GAP - 120;
        const label = doc.label;
        const content = buildDocumentNodeContent(doc);

        nodes.push({
            id,
            type: 'node',
            position: { x, y },
            data: {
                label,
                content,
                tags: ['import', doc.kind, 'mvp-v0.5'],
                importKind: doc.kind,
                sourceFileName: doc.name
            },
            style: {},
            meta: {
                imported: true
            },
            created_at: now,
            updated_at: now
        });

        nodeIdByLabel.set(label.toLowerCase(), id);

        if (doc.kind === 'markdown') {
            extractWikiLinks(doc.content).forEach((targetLabel) => {
                pendingLinks.push({ sourceId: id, targetLabel });
            });
        }
    });

    const edges: Edge[] = [];
    pendingLinks.forEach((link) => {
        const targetId = nodeIdByLabel.get(link.targetLabel);
        if (!targetId || targetId === link.sourceId) return;
        const duplicate = edges.some(edge => (
            (edge.source === link.sourceId && edge.target === targetId)
            || (edge.source === targetId && edge.target === link.sourceId)
        ));
        if (duplicate) return;
        edges.push({
            id: asEdgeId(`import-edge-${crypto.randomUUID()}`),
            source: asNodeId(link.sourceId),
            target: asNodeId(targetId),
            type: 'default'
        });
    });

    return {
        nodes,
        edges,
        version: 1
    };
};

const readFileText = async (file: File, kind: ImportKind): Promise<string> => {
    if (kind === 'markdown') {
        return file.text();
    }
    return '';
};

export const importFilesToStation = async (files: File[]): Promise<ImportResult> => {
    const warnings: string[] = [];
    const ignoredFiles: string[] = [];
    const importedDocs: ImportedDocument[] = [];

    for (const file of files) {
        const kind = detectImportKind(file.name, file.type);
        if (kind === 'unsupported') {
            ignoredFiles.push(file.name);
            continue;
        }
        const content = await readFileText(file, kind);
        importedDocs.push({
            id: crypto.randomUUID(),
            name: file.name,
            label: toTitle(file.name),
            kind,
            content,
            size: file.size
        });
    }

    if (!importedDocs.length) {
        warnings.push('No supported files found. Use md/markdown/txt/doc/docx/pdf.');
        const id = spaceManager.createSpace('Imported Space');
        return {
            spaceId: id,
            importedCount: 0,
            ignoredFiles,
            warnings
        };
    }

    const firstName = importedDocs[0]?.label ?? 'Imported';
    const snapshot = buildImportedSpaceData(importedDocs);
    const spaceId = spaceManager.forkSpace(snapshot, `Import ${firstName}`);

    if (ignoredFiles.length > 0) {
        warnings.push(`Ignored unsupported files: ${ignoredFiles.join(', ')}`);
    }

    return {
        spaceId,
        importedCount: importedDocs.length,
        ignoredFiles,
        warnings
    };
};
