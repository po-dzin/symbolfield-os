import type { SfDocRecord } from './sfContentRemote';

export const buildNodeDocId = (spaceId: string, nodeId: string): string => `node:${spaceId}:${nodeId}`;

export const buildNodeDocRecord = (params: {
    spaceId: string;
    nodeId: string;
    title: string;
    snapshotJson: unknown;
    schemaVersion?: number;
    updatedAt?: number;
}): SfDocRecord => ({
    docId: buildNodeDocId(params.spaceId, params.nodeId),
    spaceId: params.spaceId,
    nodeId: params.nodeId,
    title: params.title,
    snapshotJson: params.snapshotJson,
    schemaVersion: params.schemaVersion ?? 1,
    updatedAt: params.updatedAt ?? Date.now()
});

export const pickNodeDocRecord = (
    records: SfDocRecord[],
    spaceId: string,
    nodeId: string
): SfDocRecord | null => {
    const filtered = records.filter(record => record.spaceId === spaceId && record.nodeId === nodeId);
    if (!filtered.length) return null;
    return filtered.sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
};
