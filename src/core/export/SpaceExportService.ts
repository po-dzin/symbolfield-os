import type { SpaceData } from '../state/SpaceManager';

export type SpaceExportFormat = 'markdown' | 'pdf' | 'png' | 'html' | 'snapshot';
export type SpaceClusterExportFormat = 'pdf' | 'png' | 'html' | 'snapshot';

export interface SpaceExportInput {
    format: SpaceExportFormat;
    spaceId: string;
    spaceName: string;
    description?: string;
    data: SpaceData;
    exportedAt?: number;
}

export interface SpaceExportFormatOption {
    id: SpaceExportFormat;
    label: string;
    extension: string;
}

export const SPACE_EXPORT_FORMATS: SpaceExportFormatOption[] = [
    { id: 'markdown', label: 'Export to Markdown', extension: 'md' },
    { id: 'pdf', label: 'Save as PDF', extension: 'pdf' },
    { id: 'png', label: 'Export to PNG', extension: 'png' },
    { id: 'html', label: 'Export to HTML', extension: 'html' },
    { id: 'snapshot', label: 'Export to Snapshot', extension: 'json' }
];

export const SPACE_CLUSTER_EXPORT_FORMATS: Array<SpaceExportFormatOption & { id: SpaceClusterExportFormat }> = SPACE_EXPORT_FORMATS.filter(
    (option): option is SpaceExportFormatOption & { id: SpaceClusterExportFormat } => option.id !== 'markdown'
);

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
        || 'space'
);

const getNodeLabel = (node: SpaceData['nodes'][number], index: number): string => (
    safeString(node.data?.label, `Node ${index + 1}`)
);

const escapeHtml = (value: string): string => (
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
);

const buildNodeLookup = (data: SpaceData): Map<string, string> => {
    const map = new Map<string, string>();
    data.nodes.forEach((node, index) => {
        map.set(String(node.id), getNodeLabel(node, index));
    });
    return map;
};

export const buildSpaceMarkdownDocument = (input: Omit<SpaceExportInput, 'format'>): string => {
    const exportedAt = input.exportedAt ?? Date.now();
    const nodes = [...(input.data.nodes ?? [])];
    const edges = [...(input.data.edges ?? [])];
    const nodeLookup = buildNodeLookup(input.data);
    const lines: string[] = [
        `# ${input.spaceName}`,
        '',
        `- Space ID: \`${input.spaceId}\``,
        `- Exported: ${new Date(exportedAt).toISOString()}`,
        `- Nodes: ${nodes.length}`,
        `- Links: ${edges.length}`
    ];
    if (safeString(input.description)) {
        lines.push('', input.description ?? '');
    }
    lines.push('', '## Nodes', '');

    if (nodes.length === 0) {
        lines.push('_No nodes in this space._');
    } else {
        nodes.forEach((node, index) => {
            const label = getNodeLabel(node, index);
            const content = safeString(node.data?.content);
            const tags = Array.isArray(node.data?.tags) ? node.data.tags : [];
            lines.push(`### ${label}`);
            lines.push(`- ID: \`${String(node.id)}\``);
            lines.push(`- Position: (${Math.round(node.position.x)}, ${Math.round(node.position.y)})`);
            if (tags.length > 0) {
                lines.push(`- Tags: ${tags.join(', ')}`);
            }
            if (content) {
                lines.push('', content);
            }
            lines.push('');
        });
    }

    lines.push('## Links', '');
    if (edges.length === 0) {
        lines.push('_No links in this space._');
    } else {
        edges.forEach((edge) => {
            const source = nodeLookup.get(String(edge.source)) ?? String(edge.source);
            const target = nodeLookup.get(String(edge.target)) ?? String(edge.target);
            lines.push(`- ${source} -> ${target}`);
        });
    }
    lines.push('');
    return lines.join('\n');
};

export const buildSpaceHtmlDocument = (input: Omit<SpaceExportInput, 'format'>): string => {
    const exportedAt = input.exportedAt ?? Date.now();
    const nodeLookup = buildNodeLookup(input.data);
    const nodesHtml = (input.data.nodes ?? []).map((node, index) => {
        const label = escapeHtml(getNodeLabel(node, index));
        const content = escapeHtml(safeString(node.data?.content));
        const tags = Array.isArray(node.data?.tags) ? node.data.tags.map(tag => escapeHtml(String(tag))).join(', ') : '';
        return `
            <article class="node">
              <h3>${label}</h3>
              <p><strong>ID:</strong> <code>${escapeHtml(String(node.id))}</code></p>
              <p><strong>Position:</strong> (${Math.round(node.position.x)}, ${Math.round(node.position.y)})</p>
              ${tags ? `<p><strong>Tags:</strong> ${tags}</p>` : ''}
              ${content ? `<pre>${content}</pre>` : ''}
            </article>
        `;
    }).join('\n');
    const edgesHtml = (input.data.edges ?? []).map((edge) => {
        const source = escapeHtml(nodeLookup.get(String(edge.source)) ?? String(edge.source));
        const target = escapeHtml(nodeLookup.get(String(edge.target)) ?? String(edge.target));
        return `<li>${source} -> ${target}</li>`;
    }).join('\n');

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.spaceName)} - Export</title>
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #07090d; color: #e8edf2; }
    main { max-width: 980px; margin: 0 auto; padding: 24px; }
    h1, h2, h3 { font-weight: 600; margin: 0 0 12px; }
    .meta { color: #9aa7b3; margin-bottom: 18px; }
    .node { border: 1px solid #1f2730; border-radius: 12px; padding: 14px; margin-bottom: 12px; background: #0e141b; }
    code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    pre { background: #0a0f14; border: 1px solid #1f2730; border-radius: 8px; padding: 10px; white-space: pre-wrap; }
    ul { margin: 0; padding-left: 20px; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(input.spaceName)}</h1>
    <p class="meta">
      Space ID: <code>${escapeHtml(input.spaceId)}</code><br />
      Exported: ${new Date(exportedAt).toISOString()}<br />
      Nodes: ${(input.data.nodes ?? []).length} · Links: ${(input.data.edges ?? []).length}
    </p>
    ${safeString(input.description) ? `<p>${escapeHtml(input.description ?? '')}</p>` : ''}
    <h2>Nodes</h2>
    ${(input.data.nodes ?? []).length > 0 ? nodesHtml : '<p>No nodes in this space.</p>'}
    <h2>Links</h2>
    ${(input.data.edges ?? []).length > 0 ? `<ul>${edgesHtml}</ul>` : '<p>No links in this space.</p>'}
  </main>
</body>
</html>`;
};

export const buildSpaceSnapshotPayload = (input: Omit<SpaceExportInput, 'format'>): Record<string, unknown> => ({
    schema: 'sf-space-snapshot.v0.5',
    exportedAt: input.exportedAt ?? Date.now(),
    space: {
        id: input.spaceId,
        name: input.spaceName,
        description: safeString(input.description)
    },
    data: {
        spaceId: input.spaceId,
        nodes: input.data.nodes ?? [],
        edges: input.data.edges ?? [],
        version: input.data.version ?? 1
    }
});

const toBlobFromCanvas = (canvas: HTMLCanvasElement): Promise<Blob | null> => (
    new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png', 1);
    })
);

const buildGraphCanvas = (data: SpaceData): HTMLCanvasElement | null => {
    if (typeof document === 'undefined') return null;
    const nodes = data.nodes ?? [];
    const edges = data.edges ?? [];
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 900;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#07090d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (nodes.length === 0) {
        ctx.fillStyle = '#c8d3df';
        ctx.font = '28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Empty space snapshot', canvas.width / 2, canvas.height / 2);
        return canvas;
    }

    const bounds = nodes.reduce(
        (acc, node) => ({
            minX: Math.min(acc.minX, node.position.x),
            maxX: Math.max(acc.maxX, node.position.x),
            minY: Math.min(acc.minY, node.position.y),
            maxY: Math.max(acc.maxY, node.position.y)
        }),
        {
            minX: Number.POSITIVE_INFINITY,
            maxX: Number.NEGATIVE_INFINITY,
            minY: Number.POSITIVE_INFINITY,
            maxY: Number.NEGATIVE_INFINITY
        }
    );

    const padding = 100;
    const width = Math.max(1, bounds.maxX - bounds.minX);
    const height = Math.max(1, bounds.maxY - bounds.minY);
    const scale = Math.min(
        (canvas.width - padding * 2) / width,
        (canvas.height - padding * 2) / height
    );
    const point = (x: number, y: number) => ({
        x: (x - bounds.minX) * scale + padding,
        y: (y - bounds.minY) * scale + padding
    });
    const nodeMap = new Map(nodes.map((node, index) => [String(node.id), { node, index }]));

    ctx.strokeStyle = '#324252';
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1.5;
    edges.forEach((edge) => {
        const source = nodeMap.get(String(edge.source))?.node;
        const target = nodeMap.get(String(edge.target))?.node;
        if (!source || !target) return;
        const p1 = point(source.position.x, source.position.y);
        const p2 = point(target.position.x, target.position.y);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    });

    ctx.globalAlpha = 1;
    nodes.forEach((node, index) => {
        const p = point(node.position.x, node.position.y);
        const isCore = node.type === 'core';
        ctx.beginPath();
        ctx.arc(p.x, p.y, isCore ? 12 : 8, 0, Math.PI * 2);
        ctx.fillStyle = isCore ? '#7dd4ff' : '#e6eef8';
        ctx.fill();
        ctx.strokeStyle = '#223243';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        const label = getNodeLabel(node, index);
        ctx.fillStyle = '#9fb0c1';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, p.x, p.y + 22);
    });

    return canvas;
};

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

export const exportSpaceToFile = async (input: SpaceExportInput): Promise<boolean> => {
    if (typeof document === 'undefined') return false;
    const base = {
        spaceId: input.spaceId,
        spaceName: input.spaceName,
        data: input.data,
        exportedAt: input.exportedAt ?? Date.now(),
        ...(input.description !== undefined ? { description: input.description } : {})
    };
    const stem = toFileStem(input.spaceName);

    if (input.format === 'markdown') {
        return downloadBlob(
            new Blob([buildSpaceMarkdownDocument(base)], { type: 'text/markdown;charset=utf-8' }),
            `${stem}.md`
        );
    }

    if (input.format === 'html') {
        return downloadBlob(
            new Blob([buildSpaceHtmlDocument(base)], { type: 'text/html;charset=utf-8' }),
            `${stem}.html`
        );
    }

    if (input.format === 'snapshot') {
        return downloadBlob(
            new Blob([JSON.stringify(buildSpaceSnapshotPayload(base), null, 2)], { type: 'application/json;charset=utf-8' }),
            `${stem}.snapshot.json`
        );
    }

    if (input.format === 'png') {
        const canvas = buildGraphCanvas(input.data);
        if (!canvas) return false;
        const pngBlob = await toBlobFromCanvas(canvas);
        if (!pngBlob) return false;
        return downloadBlob(pngBlob, `${stem}.png`);
    }

    const markdown = buildSpaceMarkdownDocument(base);
    const pdfBlob = await buildPdfBlob(markdown);
    return downloadBlob(pdfBlob, `${stem}.pdf`);
};
