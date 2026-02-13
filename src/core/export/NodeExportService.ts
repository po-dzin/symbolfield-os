import type { NodeBase } from '../types';

export type NodeExportFormat = 'markdown' | 'pdf' | 'html' | 'json';

export interface NodeExportFormatOption {
    id: NodeExportFormat;
    label: string;
    extension: string;
}

export interface NodeExportInput {
    format: NodeExportFormat;
    node: NodeBase;
    spaceId?: string | null;
    spaceName?: string | null;
    exportedAt?: number;
}

export const NODE_EXPORT_FORMATS: NodeExportFormatOption[] = [
    { id: 'markdown', label: 'Export Node to Markdown', extension: 'md' },
    { id: 'pdf', label: 'Export Node to PDF', extension: 'pdf' },
    { id: 'html', label: 'Export Node to HTML', extension: 'html' },
    { id: 'json', label: 'Export Node to JSON', extension: 'json' }
];

const safeString = (value: unknown, fallback = ''): string => (
    typeof value === 'string' && value.trim() ? value.trim() : fallback
);

const toFileStem = (value: string): string => (
    value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        || 'node'
);

const escapeHtml = (value: string): string => (
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
);

const nodeLabel = (node: NodeBase): string => safeString(node.data?.label, 'Untitled Node');

export const buildNodeMarkdownDocument = (input: Omit<NodeExportInput, 'format'>): string => {
    const label = nodeLabel(input.node);
    const content = safeString(input.node.data?.content);
    const tags = Array.isArray(input.node.data?.tags) ? input.node.data.tags : [];
    const exportedAt = input.exportedAt ?? Date.now();
    const lines = [
        `# ${label}`,
        '',
        `- Node ID: \`${String(input.node.id)}\``,
        `- Type: ${safeString(input.node.type, 'node')}`,
        `- Position: (${Math.round(input.node.position.x)}, ${Math.round(input.node.position.y)})`,
        `- Space: \`${safeString(input.spaceId, 'unknown')}\``,
        `- Exported: ${new Date(exportedAt).toISOString()}`
    ];
    if (tags.length > 0) {
        lines.push(`- Tags: ${tags.join(', ')}`);
    }
    if (content) {
        lines.push('', '## Content', '', content);
    }
    return `${lines.join('\n')}\n`;
};

export const buildNodeHtmlDocument = (input: Omit<NodeExportInput, 'format'>): string => {
    const label = nodeLabel(input.node);
    const content = safeString(input.node.data?.content);
    const tags = Array.isArray(input.node.data?.tags) ? input.node.data.tags.join(', ') : '';
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(label)} - Node Export</title>
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #07090d; color: #e8edf2; }
    main { max-width: 760px; margin: 0 auto; padding: 24px; }
    code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    pre { background: #0a0f14; border: 1px solid #1f2730; border-radius: 8px; padding: 10px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(label)}</h1>
    <p><strong>Node ID:</strong> <code>${escapeHtml(String(input.node.id))}</code></p>
    <p><strong>Type:</strong> ${escapeHtml(safeString(input.node.type, 'node'))}</p>
    <p><strong>Position:</strong> (${Math.round(input.node.position.x)}, ${Math.round(input.node.position.y)})</p>
    <p><strong>Space:</strong> <code>${escapeHtml(safeString(input.spaceId, 'unknown'))}</code></p>
    ${tags ? `<p><strong>Tags:</strong> ${escapeHtml(tags)}</p>` : ''}
    ${content ? `<h2>Content</h2><pre>${escapeHtml(content)}</pre>` : ''}
  </main>
</body>
</html>`;
};

export const buildNodeJsonPayload = (input: Omit<NodeExportInput, 'format'>): Record<string, unknown> => ({
    schema: 'sf-node-export.v0.5',
    exportedAt: input.exportedAt ?? Date.now(),
    space: {
        id: safeString(input.spaceId, ''),
        name: safeString(input.spaceName, '')
    },
    node: input.node
});

const downloadBlob = (blob: Blob, fileName: string): boolean => {
    if (typeof document === 'undefined' || typeof URL === 'undefined') return false;
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 0);
    return true;
};

const buildPdfBlob = async (markdown: string): Promise<Blob> => {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const width = pdf.internal.pageSize.getWidth();
    const height = pdf.internal.pageSize.getHeight();
    const margin = 36;
    const maxWidth = width - margin * 2;
    const lineHeight = 16;
    const lines = pdf.splitTextToSize(markdown, maxWidth) as string[];
    let y = margin;

    pdf.setFont('courier', 'normal');
    pdf.setFontSize(10);
    lines.forEach((line) => {
        if (y > height - margin) {
            pdf.addPage();
            y = margin;
        }
        pdf.text(line, margin, y);
        y += lineHeight;
    });

    return pdf.output('blob');
};

export const exportNodeToFile = async (input: NodeExportInput): Promise<boolean> => {
    if (typeof document === 'undefined') return false;
    const label = nodeLabel(input.node);
    const base = {
        node: input.node,
        exportedAt: input.exportedAt ?? Date.now(),
        ...(input.spaceId !== undefined ? { spaceId: input.spaceId } : {}),
        ...(input.spaceName !== undefined ? { spaceName: input.spaceName } : {})
    };
    const stem = toFileStem(label);

    if (input.format === 'markdown') {
        return downloadBlob(
            new Blob([buildNodeMarkdownDocument(base)], { type: 'text/markdown;charset=utf-8' }),
            `${stem}.md`
        );
    }

    if (input.format === 'html') {
        return downloadBlob(
            new Blob([buildNodeHtmlDocument(base)], { type: 'text/html;charset=utf-8' }),
            `${stem}.html`
        );
    }

    if (input.format === 'json') {
        return downloadBlob(
            new Blob([JSON.stringify(buildNodeJsonPayload(base), null, 2)], { type: 'application/json;charset=utf-8' }),
            `${stem}.json`
        );
    }

    const pdfBlob = await buildPdfBlob(buildNodeMarkdownDocument(base));
    return downloadBlob(pdfBlob, `${stem}.pdf`);
};
