const width = 975;
const height = 610;

const projection = d3.geoMercator()
    .scale((width - 3) / (2 * Math.PI))
    .translate([width / 2, height / 2])
    .center([0, 0]);

const path = d3.geoPath().projection(projection);

const zoom = d3.zoom()
    .scaleExtent([1, 2.67])
    .on("zoom", zoomed);

const svg = d3.select("#map")
    .append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .attr("height", height)
    .call(zoom);

const g = svg.append("g");

let selectedCountries = [];
let energyData = {};

// Load energy data from CSV
d3.csv("energy_import_export.csv").then(data => {
    data.forEach(row => {
        const { Country, ImportExport, Type, Units } = row;
        if (Type === "electricity") {
            if (!energyData[Country]) {
                energyData[Country] = [];
            }
            energyData[Country].push({ ImportExport, Units });
        }
    });
});

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

function reset() {
    g.selectAll("path").transition().style("fill", null);
    selectedCountries = [];
    svg.selectAll(".connection").remove();
    d3.select("#tooltip").style("opacity", 0);
    svg.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity,
        d3.zoomTransform(svg.node()).invert([width / 2, height / 2])
    );
}

function clicked(event, d) {
    const [[x0, y0], [x1, y1]] = path.bounds(d);
    const centroid = path.centroid(d);

    if (selectedCountries.length < 2) {
        selectedCountries.push({ data: d, centroid: centroid });
    } else {
        selectedCountries = [{ data: d, centroid: centroid }];
        svg.selectAll(".connection").remove();
    }

    g.selectAll("path").transition().style("fill", null);
    d3.select(this).transition().style("fill", selectedCountries.length === 1 ? "red" : "blue");

    if (selectedCountries.length === 2) {
        drawConnection();
    }

    const [cx, cy] = calculateCenter(selectedCountries);
    svg.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(Math.min(2.67, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
            .translate(-cx, -cy),
        d3.pointer(event, svg.node())
    );

    showTooltip(d, event.pageX, event.pageY);
}

function drawConnection() {
    const line = d3.line()
        .x(d => d[0])
        .y(d => d[1]);

    svg.append("path")
        .datum(selectedCountries.map(c => c.centroid))
        .attr("class", "connection")
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 2);
}

function calculateCenter(countries) {
    const x = (countries[0].centroid[0] + countries[1].centroid[0]) / 2;
    const y = (countries[0].centroid[1] + countries[1].centroid[1]) / 2;
    return [x, y];
}

function zoomed(event) {
    const { transform } = event;
    g.attr("transform", transform);
    g.attr("stroke-width", 1 / transform.k);
}

// Show tooltip with energy data
function showTooltip(countryData, x, y) {
    const countryName = countryData.properties.name;
    const tooltip = d3.select("#tooltip");

    if (energyData[countryName]) {
        const imports = energyData[countryName].filter(d => d.ImportExport === 'import');
        const exports = energyData[countryName].filter(d => d.ImportExport === 'export');

        let htmlContent = `<strong>${countryName}</strong><br><br>`;
        htmlContent += `<strong>Electricity Imports:</strong><br>`;
        imports.forEach(d => {
            htmlContent += `${d.Units}<br>`;
        });
        htmlContent += `<br><strong>Electricity Exports:</strong><br>`;
        exports.forEach(d => {
            htmlContent += `${d.Units}<br>`;
        });

        tooltip.html(htmlContent)
            .style("left", `${x + 15}px`)
            .style("top", `${y + 15}px`)
            .transition()
            .duration(200)
            .style("opacity", 0.9);
    } else {
        tooltip.transition()
            .duration(200)
            .style("opacity", 0);
    }
}

// Handle double-click to reset the view
svg.on("dblclick", reset);
