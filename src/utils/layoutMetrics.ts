// Shared layout metrics for the field (world units, before zoom).
export const GRID_METRICS = {
    // Cell is the base step between dots.
    cell: 24,
    dotRadius: 1
};

export const NODE_SIZES = {
    // Nodes scale in whole cells: base=2, cluster=3, root=4.
    base: GRID_METRICS.cell * 2,
    cluster: GRID_METRICS.cell * 2.5,
    root: GRID_METRICS.cell * 3
};
