const width = 975;
const height = 610;

// Set the projection to Mercator and adjust the scale and translation
const projection = d3.geoMercator()
    .scale((width - 3) / (2 * Math.PI))
    .translate([width / 2, height / 2])
    .center([0, 0]); // Longitude and Latitude of the center of the map

// Path generator with the specified projection
const path = d3.geoPath().projection(projection);

// Zoom behavior with adjusted scale
const zoom = d3.zoom()
    .scaleExtent([1, 2.67]) // 8 / 3 = 2.67, for 3x less zoom
    .on("zoom", zoomed);

// Create SVG
const svg = d3.select("#map")
    .append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .attr("height", height)
    .call(zoom);

// Group element for map features
const g = svg.append("g");

// Load and display the world map
d3.json("world-110m.v1.json").then(world => {
    const countries = g.append("g")
        .attr("fill", "#444")
        .attr("cursor", "pointer")
        .selectAll("path")
        .data(topojson.feature(world, world.objects.countries).features)
        .join("path")
        .on("click", clicked)
        .attr("d", path);

    countries.append("title")
        .text(d => d.properties.name);

    g.append("path")
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-linejoin", "round")
        .attr("d", path(topojson.mesh(world, world.objects.countries, (a, b) => a !== b)));

    svg.call(zoom);
});

// Reset function
function reset() {
    g.selectAll("path").transition().style("fill", null);
    svg.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity,
        d3.zoomTransform(svg.node()).invert([width / 2, height / 2])
    );
}

// Click function
function clicked(event, d) {
    const [[x0, y0], [x1, y1]] = path.bounds(d);
    event.stopPropagation();
    g.selectAll("path").transition().style("fill", null);
    d3.select(this).transition().style("fill", "red");
    svg.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(Math.min(2.67, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
            .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
        d3.pointer(event, svg.node())
    );
}

// Zoomed function
function zoomed(event) {
    const { transform } = event;
    g.attr("transform", transform);
    g.attr("stroke-width", 1 / transform.k);
}
