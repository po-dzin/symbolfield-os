import React from 'react';
import { MarkdownTransformer } from '@blocksuite/blocks';
import { createEmptyDoc, PageEditor } from '@blocksuite/presets';
import { effects as installBlockSuiteEffects } from '@blocksuite/presets/effects';
import { Job, type Doc, type DocSnapshot } from '@blocksuite/store';

const SAVE_DEBOUNCE_MS = 300;

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null
);

const isDocSnapshot = (value: unknown): value is DocSnapshot => {
    if (!isRecord(value)) return false;
    if (value.type !== 'page') return false;
    return isRecord(value.meta) && isRecord(value.blocks);
};

const ensurePageEditorRegistered = () => {
    if (typeof window === 'undefined') return;
    if (customElements.get('page-editor')) return;
    installBlockSuiteEffects();
};

const createDocFromInitialData = async (initialSnapshot: unknown, legacyContent?: string): Promise<Doc> => {
    const { doc: baseDoc, init } = createEmptyDoc();

    if (isDocSnapshot(initialSnapshot)) {
        const job = new Job({ collection: baseDoc.collection });
        const restoredDoc = await job.snapshotToDoc(initialSnapshot);
        if (restoredDoc?.root) {
            restoredDoc.load();
            return restoredDoc;
        }
    }

    const legacyMarkdown = typeof legacyContent === 'string' ? legacyContent.trim() : '';
    if (legacyMarkdown) {
        const importedDocId = await MarkdownTransformer.importMarkdownToDoc({
            collection: baseDoc.collection,
            markdown: legacyMarkdown
        });

        if (importedDocId) {
            const importedDoc = baseDoc.collection.getDoc(importedDocId);
            if (importedDoc?.root) {
                importedDoc.load();
                return importedDoc;
            }
        }
    }

    init();
    return baseDoc;
};

type NodeBuilderProps = {
    initialSnapshot: unknown;
    legacyContent?: string;
    onSnapshotChange: (snapshot: DocSnapshot) => void;
};

export const NodeBuilder: React.FC<NodeBuilderProps> = ({ initialSnapshot, legacyContent, onSnapshotChange }) => {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const onSnapshotChangeRef = React.useRef(onSnapshotChange);
    const initialSnapshotRef = React.useRef(initialSnapshot);
    const legacyContentRef = React.useRef(legacyContent);

    React.useEffect(() => {
        onSnapshotChangeRef.current = onSnapshotChange;
    }, [onSnapshotChange]);

    React.useEffect(() => {
        ensurePageEditorRegistered();

        const container = containerRef.current;
        if (!container) return;

        let disposed = false;
        let blockUpdatedSubscription: { dispose: () => void } | null = null;
        let saveTimer: number | null = null;
        let currentDoc: Doc | null = null;
        let currentJob: Job | null = null;

        const clearSaveTimer = () => {
            if (saveTimer !== null) {
                window.clearTimeout(saveTimer);
                saveTimer = null;
            }
        };

        const emitSnapshot = () => {
            if (!currentDoc || !currentJob) return;
            const snapshot = currentJob.docToSnapshot(currentDoc);
            if (!snapshot) return;
            onSnapshotChangeRef.current(snapshot);
        };

        const scheduleSnapshotEmit = () => {
            clearSaveTimer();
            saveTimer = window.setTimeout(() => {
                emitSnapshot();
            }, SAVE_DEBOUNCE_MS);
        };

        void (async () => {
            const doc = await createDocFromInitialData(initialSnapshotRef.current, legacyContentRef.current);
            if (disposed) return;

            const editor = new PageEditor();
            editor.doc = doc;
            editor.hasViewport = true;
            editor.style.display = 'block';
            editor.style.height = '100%';
            editor.style.width = '100%';

            currentDoc = doc;
            currentJob = new Job({ collection: doc.collection });

            container.replaceChildren(editor);
            blockUpdatedSubscription = doc.slots.blockUpdated.on(() => {
                scheduleSnapshotEmit();
            });

            // Persist migrated legacy content immediately as snapshot format.
            scheduleSnapshotEmit();
        })();

        return () => {
            disposed = true;
            clearSaveTimer();
            blockUpdatedSubscription?.dispose();
            container.replaceChildren();
            currentDoc = null;
            currentJob = null;
        };
    }, []); // Mount once per node (parent passes key by node id)

    return (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-2">
            <div ref={containerRef} className="h-[65vh] overflow-hidden rounded-xl" />
        </div>
    );
};
