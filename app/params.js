const config = {
    FORMAT: 53 / 77, // W by H
    MAX_W: 600,
    MAX_H: 600,
    PIXEL_DENSITY: 2,
    FPS: 30,
    SVG_FORMAT: [297, 420],
    SVG_DPI: 600 / 7, // determines printed size (e.g map height of 600 to 7in -> 600/7)
    SVG_ADD_FRAME: true,
    SVG_DECIMALS: 2,
};

const params = {
    seed: [10, 0, undefined, 1],
    show_svg: true,
    svg_hatch_spacing: [2, 0.1, undefined, 0.1],
    svg_hatch_direction: [-45, -180, 180, 1],
};

export { config, params };
