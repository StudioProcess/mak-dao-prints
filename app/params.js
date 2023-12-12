const config = {
    FORMAT: 53 / 77, // W by H
    MAX_W: 600,
    MAX_H: 600,
    PIXEL_DENSITY: 2,
    FPS: 30,
    SVG_FORMAT: [297, 420],
    SVG_DPI: 600 / 7, // determines printed size (e.g map a length of 600 to 7in -> 600/7)
    SVG_ADD_FRAME: true,
    SVG_DECIMALS: 3,
};

const params = {
    seed: [10, 0, undefined, 1],
    num_nodes: [6, 1, undefined, 1],
    grid_size: [0, 0, undefined, 5],
    min_dist: [50, 0, undefined, 1],
    border: [60, 0, undefined, 1],
    connect_min: [1, 1, undefined, 1],
    connect_max: [3, 1, undefined, 1],
    connect_step_chance: [0, 0, 100, 1],
    connect_step_min: [1, 1, undefined, 1],
    connect_step_max: [5, 1, undefined, 1],
    
    use_bezier: true,
    bezier_control: [75, 0, 100, 1],
    add_bezier_bi: true,
    bezier_bi_point: [40, 0, 100, 1],
    bezier_bi_control: [50, 0, 100, 1],
    
    show_m_and_k: true,
    m_and_k_dist: [330, 0, undefined, 1],
    m_and_k_excl: [60, 0, undefined, 1],
    
    show_svg: true,
    svg_show_hatch: false,
    svg_hatch_spacing: [2, 0.1, undefined, 0.1],
    svg_hatch_direction: [-45, -180, 180, 1],
    svg_crosshatch: false,
    
    layout_center: true,
    layout_center_mode: ['bbox', ['bbox', 'avg']],
    
    node_size: [10, 1, undefined, 1],
    stroke_weight: [1, 1, undefined, 0.1],
    
    bg_color: '#efe9ce',
    conn_color: '#000',
    node_color: '#000',
    use_m_and_k_color: false,
    m_and_k_color: '#000',
    
    
    'SAVE': function() {},
};

export { config, params };
