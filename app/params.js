const config = {
    MAX_W: 600, // Max width in px. For p5/canvas rendering only
    MAX_H: 600, // Max height in px. For p5/canvas rendering only
    PIXEL_DENSITY: 2,
    SVG_FORMAT: [297, 420], // SVG full format in mm. Artwork will be placed in the middle (determined by params.format_w and paramts.format_h)
    SVG_ADD_FRAME: true, // Add frame around canvas in SVG?
    SVG_DECIMALS: 2,
    FPS: 25,
    EXPORT_PNG: true,
    EXPORT_JSON: true,
};

const params = {
    seed: [20, 0, undefined, 1],
    format_w: [110, 1], // SVG width in mm
    format_h: [220, 1], // SVG height in mm
    num_nodes: [6, 1, undefined, 1],    
    grid_size: [0, 0, undefined, 5],
    min_dist: [50, 0, undefined, 1],
    border: [60, 0, undefined, 1],
    connect_min: [1, 1, undefined, 1],
    connect_max: [3, 1, undefined, 1],
    connect_step_chance: [0, 0, 100, 1],
    connect_step_min: [1, 1, undefined, 1],
    connect_step_max: [5, 1, undefined, 1],
    
    use_bezier:  ['vertical', ['none', 'horizontal', 'vertical']],
    bezier_control: [75, 0, 100, 1],
    add_bezier_bi: true,
    bezier_bi_point: [40, 0, 100, 1],
    bezier_bi_control: [50, 0, 100, 1],
    
    show_m_and_k: true,
    m_and_k_dist: [45, 0, undefined, 1],
    m_and_k_excl: [60, 0, undefined, 1],
    
    show_svg: false,
    svg_show_hatch: false,
    svg_hatch_spacing: [0.5, 0.1, undefined, 0.1],
    svg_hatch_direction: [90, -180, 180, 1],
    svg_hatch_shorten: [0.7, 0, undefined, 0.05],
    svg_crosshatch: false,
    svg_extra_outline: true,
    
    layout_center: true,
    layout_center_mode: ['bbox', ['bbox', 'avg']],
    
    node_size: [30, 1, undefined, 1],
    stroke_weight: [1, 1, undefined, 0.1],
    
    bg_color: '#efe9ce',
    conn_color: '#000',
    node_color: '#000',
    use_m_and_k_color: false,
    m_and_k_color: '#000',
    
    'SAVE': function() {},
};

export { config, params };
