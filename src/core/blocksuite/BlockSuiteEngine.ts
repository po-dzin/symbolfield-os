import { type Doc, type DocSnapshot, Job } from '@blocksuite/store';
import { createEmptyDoc, PageEditor } from '@blocksuite/presets';
import { effects as installBlockSuiteEffects } from '@blocksuite/presets/effects';
import { MarkdownTransformer } from '@blocksuite/blocks';

// Ensure custom elements are registered only once
let effectsInstalled = false;
const installEffects = () => {
    if (effectsInstalled || typeof window === 'undefined') return;
    if (customElements.get('page-editor')) {
        effectsInstalled = true;
        return;
    }
    installBlockSuiteEffects();
    effectsInstalled = true;
};

export interface BlockSuiteEngineOptions {
    container: HTMLElement;
    initialSnapshot?: unknown;
    legacyContent?: string | undefined;
    onSnapshotChange?: ((snapshot: DocSnapshot) => void) | undefined;
    onActivity?: (() => void) | undefined; // For "Live" updates
    onHistoryStateChange?: ((state: { canUndo: boolean; canRedo: boolean }) => void) | undefined;
}

export class BlockSuiteEngine {
    private doc: Doc;
    private job: Job;
    private editor: PageEditor | null = null;
    private container: HTMLElement;
    private disposeSubscription: (() => void) | null = null;
    private onSnapshotChange: ((snapshot: DocSnapshot) => void) | undefined;
    private onActivity: (() => void) | undefined;
    private onHistoryStateChange: ((state: { canUndo: boolean; canRedo: boolean }) => void) | undefined;
    private saveTimer: number | null = null;
    private readonly SAVE_DEBOUNCE_MS = 1500; // Increased debounce for stability

    constructor(options: BlockSuiteEngineOptions) {
        installEffects();
        this.container = options.container;
        this.onSnapshotChange = options.onSnapshotChange;
        this.onActivity = options.onActivity;
        this.onHistoryStateChange = options.onHistoryStateChange;

        // Synchronous init for immediate feedback, then async upgrade
        const { doc } = createEmptyDoc();
        this.doc = doc;
        this.job = new Job({ collection: doc.collection });

        this.mount(); // Mount empty doc immediately

        // Async hydrate
        this.hydrate(options.initialSnapshot, options.legacyContent);
        this.subscribe();
    }

    private async hydrate(snapshot: unknown, legacyContent?: string) {
        if (this.isValidSnapshot(snapshot)) {
            try {
                const restoredDoc = await this.job.snapshotToDoc(snapshot);
                if (restoredDoc?.root) {
                    // Update editor reference
                    this.doc = restoredDoc;
                    this.job = new Job({ collection: restoredDoc.collection });
                    if (this.editor) {
                        this.editor.doc = this.doc;
                    }
                    // Re-subscribe to new doc
                    this.disposeSubscription?.();
                    this.subscribe();
                    return;
                }
            } catch (e) {
                console.warn('Failed to restore snapshot, falling back to empty/legacy', e);
            }
        }

        // If no valid snapshot or restore failed, try legacy
        await this.importLegacyContent(legacyContent);
    }

    private isValidSnapshot(value: unknown): value is DocSnapshot {
        const candidate = value as { type?: unknown } | null;
        return (
            typeof value === 'object' &&
            value !== null &&
            candidate?.type === 'page'
        );
    }

    private async importLegacyContent(content?: string) {
        if (!content) return;
        // Check if doc is empty before importing
        if (this.doc.root) return;

        await MarkdownTransformer.importMarkdownToDoc({
            collection: this.doc.collection,
            markdown: content
        });
    }

    private mount() {
        this.editor = new PageEditor();
        this.editor.doc = this.doc;
        this.editor.hasViewport = true;

        // Style adaptation
        Object.assign(this.editor.style, {
            display: 'block',
            height: '100%',
            width: '100%',
            background: 'transparent',
            '--affine-font-family': 'var(--font-body)',
            '--affine-font-code': 'var(--font-mono)',
        });

        this.container.replaceChildren(this.editor);
    }

    private subscribe() {
        const sub = this.doc.slots.blockUpdated.on(() => {
            this.scheduleSave();
            this.onActivity?.();
            this.emitHistoryState();
        });

        this.disposeSubscription = () => {
            sub.dispose();
        };

        this.emitHistoryState();
    }

    private scheduleSave() {
        if (this.saveTimer) {
            window.clearTimeout(this.saveTimer);
        }
        this.saveTimer = window.setTimeout(() => {
            if (this.onSnapshotChange) {
                const snapshot = this.job.docToSnapshot(this.doc);
                if (snapshot) this.onSnapshotChange(snapshot);
            }
        }, this.SAVE_DEBOUNCE_MS);
    }

    public dispose() {
        if (this.saveTimer) window.clearTimeout(this.saveTimer);
        this.disposeSubscription?.();
        this.container.replaceChildren();
        this.editor = null;
    }

    public focus() {
        this.editor?.focus();
    }

    public getHistoryState(): { canUndo: boolean; canRedo: boolean } {
        return {
            canUndo: this.doc.canUndo,
            canRedo: this.doc.canRedo
        };
    }

    public undo() {
        this.doc.undo();
        this.emitHistoryState();
    }

    public redo() {
        this.doc.redo();
        this.emitHistoryState();
    }

    public async appendMarkdown(markdown: string) {
        const content = markdown.trim();
        if (!content) return;
        const rootId = this.doc.root?.id;
        if (!rootId) return;
        await MarkdownTransformer.importMarkdownToBlock({
            doc: this.doc,
            markdown: `${content}\n`,
            blockId: rootId
        });
        this.emitHistoryState();
    }

    public async insertTemplate(template: 'heading' | 'task' | 'code') {
        if (template === 'heading') {
            await this.appendMarkdown('## Section');
            return;
        }
        if (template === 'task') {
            await this.appendMarkdown('- [ ] New task');
            return;
        }
        await this.appendMarkdown('```ts\n\n```');
    }

    private emitHistoryState() {
        this.onHistoryStateChange?.({
            canUndo: this.doc.canUndo,
            canRedo: this.doc.canRedo
        });
    }
}
