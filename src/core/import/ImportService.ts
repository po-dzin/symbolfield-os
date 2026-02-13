import { asEdgeId, asNodeId, type Edge, type NodeBase } from '../types';
import type { SpaceData } from '../state/SpaceManager';
import { spaceManager } from '../state/SpaceManager';
import { entitlementsService } from '../access/EntitlementsService';

export type ImportKind = 'markdown' | 'document' | 'pdf' | 'canvas' | 'unsupported';

export interface ImportedDocument {
    id: string;
    name: string;
    sourcePath?: string;
    label: string;
    kind: Exclude<ImportKind, 'unsupported'>;
    content: string;
    size: number;
    tags?: string[];
}

export interface ImportResult {
    spaceId: string;
    importedCount: number;
    ignoredFiles: string[];
    warnings: string[];
}

const IMPORT_GRID_COLUMNS = 3;
const IMPORT_CELL_GAP = 220;
const MAX_LINKS_PER_DOC = 48;
const OBSIDIAN_TAG_REGEX = /(^|\s)#([a-zA-Z0-9/_-]+)/g;

const stripExtension = (name: string): string => name.replace(/\.[^.]+$/, '');

const toTitle = (name: string): string => {
    const normalized = stripExtension(name).replace(/[-_]+/g, ' ').trim();
    if (!normalized) return 'Imported';
    return normalized.replace(/\s+/g, ' ');
};

export const detectImportKind = (fileName: string, mimeType: string): ImportKind => {
    const lowerName = fileName.toLowerCase();
    const lowerMime = mimeType.toLowerCase();

    if (lowerName.endsWith('.canvas')) {
        return 'canvas';
    }
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

const parseFrontmatter = (content: string): {
    body: string;
    title?: string;
    tags: string[];
} => {
    if (!content.startsWith('---\n')) {
        return { body: content, tags: [] };
    }
    const endIndex = content.indexOf('\n---', 4);
    if (endIndex < 0) {
        return { body: content, tags: [] };
    }
    const head = content.slice(4, endIndex);
    const body = content.slice(endIndex + 4).replace(/^\n+/, '');
    let title: string | undefined;
    const tags = new Set<string>();

    head.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const titleMatch = trimmed.match(/^title\s*:\s*(.+)$/i);
        if (titleMatch?.[1]) {
            title = titleMatch[1].trim().replace(/^['"]|['"]$/g, '');
            return;
        }
        const tagsListMatch = trimmed.match(/^tags\s*:\s*\[(.*)\]\s*$/i);
        if (tagsListMatch?.[1]) {
            tagsListMatch[1]
                .split(',')
                .map(part => part.trim().replace(/^['"]|['"]$/g, ''))
                .filter(Boolean)
                .forEach(tag => tags.add(tag.toLowerCase()));
            return;
        }
        const singleTagMatch = trimmed.match(/^tags\s*:\s*(.+)$/i);
        if (singleTagMatch?.[1]) {
            const token = singleTagMatch[1].trim().replace(/^['"]|['"]$/g, '');
            if (token) tags.add(token.toLowerCase());
        }
    });

    return title
        ? { body, title, tags: Array.from(tags) }
        : { body, tags: Array.from(tags) };
};

const extractInlineHashtags = (content: string): string[] => {
    const tags = new Set<string>();
    const source = content.replace(/\[\[[^[\]]+\]\]/g, ' ');
    OBSIDIAN_TAG_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null = OBSIDIAN_TAG_REGEX.exec(source);
    while (match) {
        const tag = (match[2] ?? '').trim().toLowerCase();
        if (tag) tags.add(tag);
        match = OBSIDIAN_TAG_REGEX.exec(source);
    }
    return Array.from(tags);
};

const parseCanvasSummary = (rawContent: string): {
    summary: string;
    tags: string[];
} => {
    try {
        const parsed = JSON.parse(rawContent) as {
            nodes?: Array<{ id?: string; type?: string; text?: string; label?: string }>;
            edges?: Array<{ fromNode?: string; toNode?: string }>;
        };
        const nodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];
        const edges = Array.isArray(parsed.edges) ? parsed.edges : [];
        const bullets = nodes
            .slice(0, 8)
            .map((node, index) => {
                const label = typeof node.text === 'string' && node.text.trim()
                    ? node.text.trim()
                    : typeof node.label === 'string' && node.label.trim()
                        ? node.label.trim()
                        : `Node ${index + 1}`;
                return `- ${label}`;
            });
        const lines = [
            '# Imported Obsidian Canvas',
            '',
            `Nodes: ${nodes.length}`,
            `Links: ${edges.length}`,
            '',
            'Preview:',
            ...bullets
        ];
        return { summary: lines.join('\n'), tags: ['obsidian', 'canvas'] };
    } catch {
        return {
            summary: '# Imported Canvas\n\nUnable to parse canvas JSON. Stored raw content for manual cleanup.',
            tags: ['obsidian', 'canvas']
        };
    }
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
    if (doc.kind === 'canvas') {
        return doc.content;
    }
    if (doc.kind === 'pdf') {
        return [
            '# Imported PDF',
            '',
            `File: ${doc.name}`,
            `Size: ${doc.size} bytes`,
            '',
            'PDF text extraction is not enabled yet. Add snippets manually or re-import as markdown.'
        ].join('\n');
    }
    return [
        '# Imported Document',
        '',
        `File: ${doc.name}`,
        `Size: ${doc.size} bytes`,
        '',
        'DOC/DOCX text extraction is not enabled yet. Export as markdown/text for full import.'
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
        const normalizedTags = Array.from(new Set([
            'import',
            doc.kind,
            'mvp-v0.5',
            ...(Array.isArray(doc.tags) ? doc.tags : [])
        ])).filter(Boolean);

        nodes.push({
            id,
            type: 'node',
            position: { x, y },
            data: {
                label,
                content,
                tags: normalizedTags,
                importKind: doc.kind,
                sourceFileName: doc.name,
                sourcePath: doc.sourcePath
            },
            style: {},
            meta: {
                imported: true
            },
            created_at: now,
            updated_at: now
        });

        nodeIdByLabel.set(label.toLowerCase(), id);

        if (doc.kind === 'markdown' || doc.kind === 'canvas') {
            extractWikiLinks(doc.content).slice(0, MAX_LINKS_PER_DOC).forEach((targetLabel) => {
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
    if (kind === 'markdown' || kind === 'canvas') {
        return file.text();
    }
    return '';
};

export const importFilesToStation = async (files: File[]): Promise<ImportResult> => {
    await entitlementsService.ensureCanImport();
    const warnings: string[] = [];
    const ignoredFiles: string[] = [];
    const importedDocs: ImportedDocument[] = [];

    for (const file of files) {
        const kind = detectImportKind(file.name, file.type);
        if (kind === 'unsupported') {
            ignoredFiles.push(file.name);
            continue;
        }
        const rawContent = await readFileText(file, kind);
        const sourcePath = typeof (file as File & { webkitRelativePath?: string }).webkitRelativePath === 'string'
            ? (file as File & { webkitRelativePath?: string }).webkitRelativePath || undefined
            : undefined;
        const folderTags = (sourcePath ?? '')
            .split('/')
            .slice(0, -1)
            .map(segment => segment.trim().toLowerCase())
            .filter(Boolean)
            .map(segment => `folder:${segment}`);

        let label = toTitle(file.name);
        let content = rawContent;
        const extraTags = new Set<string>(folderTags);

        if (kind === 'markdown') {
            const parsed = parseFrontmatter(rawContent);
            if (parsed.title?.trim()) {
                label = parsed.title.trim();
            }
            content = parsed.body;
            parsed.tags.forEach(tag => extraTags.add(tag));
            extractInlineHashtags(parsed.body).forEach(tag => extraTags.add(tag));
            if (parsed.tags.length > 0 || content.includes('[[')) {
                extraTags.add('obsidian');
            }
        }

        if (kind === 'canvas') {
            const parsed = parseCanvasSummary(rawContent);
            content = parsed.summary;
            parsed.tags.forEach(tag => extraTags.add(tag));
            extraTags.add('obsidian');
            label = toTitle(file.name);
        }

        importedDocs.push({
            id: crypto.randomUUID(),
            name: file.name,
            ...(sourcePath ? { sourcePath } : {}),
            label,
            kind,
            content,
            size: file.size,
            tags: Array.from(extraTags)
        });
    }

    if (!importedDocs.length) {
        warnings.push('No supported files found. Use md/markdown/txt/canvas/doc/docx/pdf.');
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
