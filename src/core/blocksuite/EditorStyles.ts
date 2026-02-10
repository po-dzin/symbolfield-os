/**
 * EditorStyles.ts
 * Adapts BlockSuite CSS variables to SymbolField Design Tokens (Foundation v1.0)
 */
export const injectBlockSuiteStyles = () => {
    if (typeof document === 'undefined') return;

    // Check if style tag exists
    const ID = 'sf-blocksuite-styles';
    if (document.getElementById(ID)) return;

    const style = document.createElement('style');
    style.id = ID;
    style.textContent = `
        :root {
            /* Font Family Override */
            --affine-font-family: var(--font-body), sans-serif;
            --affine-font-code: var(--font-code), monospace;

            /* Canvas Background */
            --affine-background-primary-color: transparent;
            --affine-background-secondary-color: var(--sf-layer-base);
            
            /* Text Colors */
            --affine-text-primary-color: var(--sf-color-text-primary);
            --affine-text-secondary-color: var(--sf-color-text-secondary);
            
            /* Accents */
            --affine-brand-color: var(--sf-color-accent-primary);
            
            /* Borders */
            --affine-border-color: var(--sf-color-border-subtle);

            /* Selection */
            --affine-selection-color: color-mix(in srgb, var(--sf-color-accent-primary), transparent 80%);
        }
        
        /* Hide unwanted BlockSuite UI chrome if necessary */
        page-editor {
            --affine-editor-width: 100%;
        }
    `;
    document.head.appendChild(style);
};
