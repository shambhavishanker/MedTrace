const charts = {};

const COLORS = [
    "#5DADE2",
    "#A8C686",
    "#E8B47A",
    "#E6CF8B",
    "#72C3BE",
    "#9B7BC7",
    "#E88FA5"
];

const SEVERITY_COLORS = [
    "#C9878F",
    "#C7D89B",
    "#E7B075"
];


// =========================================================
// CHART HELPERS
// =========================================================

function destroyChart(id) {
    if (charts[id]) {
        charts[id].destroy();
        delete charts[id];
    }
}


const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,

    plugins: {
        legend: {
            labels: {
                font: {
                    size: 10
                },
                boxWidth: 10,
                padding: 10
            }
        }
    },

    scales: {
        x: {
            grid: {
                display: false
            },
            ticks: {
                font: {
                    size: 9
                }
            }
        },

        y: {
            beginAtZero: true,

            ticks: {
                font: {
                    size: 9
                },
                precision: 0
            },

            grid: {
                color: "#edf0f2"
            }
        }
    }
};


// =========================================================
// NORMALIZE LABEL/VALUE DATA
// =========================================================

function getChartData(data) {

    if (!data) {
        return {
            labels: [],
            values: []
        };
    }

    // Backend format:
    // {
    //     labels: [...],
    //     values: [...]
    // }

    if (
        data.labels &&
        data.values &&
        Array.isArray(data.labels) &&
        Array.isArray(data.values)
    ) {
        return {
            labels: data.labels,
            values: data.values.map(Number)
        };
    }

    // Array format

    if (Array.isArray(data)) {

        return {
            labels: data.map(item =>
                item.label ??
                item.name ??
                item.key ??
                ""
            ),

            values: data.map(item =>
                Number(
                    item.value ??
                    item.count ??
                    0
                )
            )
        };
    }

    // Object format

    if (typeof data === "object") {

        return {
            labels: Object.keys(data),

            values: Object.values(data)
                .map(value => Number(value))
        };
    }

    return {
        labels: [],
        values: []
    };
}


// =========================================================
// BAR CHART
// =========================================================

function createBarChart(
    id,
    labels,
    values,
    colors = COLORS
) {

    const canvas =
        document.getElementById(id);

    if (!canvas) return;

    destroyChart(id);

    charts[id] = new Chart(canvas, {

        type: "bar",

        data: {

            labels: labels,

            datasets: [{
                label: "Recalls",

                data: values,

                backgroundColor:
                    labels.map(
                        (_, index) =>
                            colors[
                                index % colors.length
                            ]
                    ),

                borderColor:
                    labels.map(
                        (_, index) =>
                            colors[
                                index % colors.length
                            ]
                    ),

                borderWidth: 1,

                borderRadius: 5,

                borderSkipped: false
            }]
        },

        options: chartOptions
    });
}


// =========================================================
// LINE CHART
// =========================================================

function createLineChart(
    id,
    labels,
    values
) {

    const canvas =
        document.getElementById(id);

    if (!canvas) return;

    destroyChart(id);

    charts[id] = new Chart(canvas, {

        type: "line",

        data: {

            labels: labels,

            datasets: [{

                label: "Recalls",

                data: values,

                borderColor: "#4A9BD8",

                backgroundColor:
                    "rgba(74,155,216,0.12)",

                fill: true,

                tension: 0.35,

                pointRadius: 4,

                pointHoverRadius: 6,

                pointBackgroundColor:
                    "#4A9BD8",

                pointBorderColor:
                    "#ffffff",

                pointBorderWidth: 2
            }]
        },

        options: chartOptions
    });
}


// =========================================================
// DOUGHNUT CHART
// =========================================================

function createDoughnutChart(
    id,
    labels,
    values
) {

    const canvas =
        document.getElementById(id);

    if (!canvas) return;

    destroyChart(id);

    charts[id] = new Chart(canvas, {

        type: "doughnut",

        data: {

            labels: labels,

            datasets: [{

                data: values,

                backgroundColor: COLORS,

                borderColor: "#ffffff",

                borderWidth: 3,

                hoverOffset: 5
            }]
        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            cutout: "52%",

            plugins: {

                legend: {

                    position: "right",

                    labels: {

                        font: {
                            size: 10
                        },

                        boxWidth: 10,

                        padding: 9
                    }
                }
            }
        }
    });
}


// =========================================================
// FILTERS
// =========================================================

function fillSelect(id, values) {

    const select =
        document.getElementById(id);

    if (!select) return;

    select.innerHTML = "";

    const all =
        document.createElement("option");

    all.value = "All";
    all.textContent = "All";

    select.appendChild(all);


    [...new Set(values)]

        .filter(
            value =>
                value !== null &&
                value !== undefined &&
                value !== ""
        )

        .forEach(value => {

            const option =
                document.createElement("option");

            option.value = value;
            option.textContent = value;

            select.appendChild(option);
        });
}


async function loadFilterOptions() {

    const response =
        await fetch("/api/filter-options");

    if (!response.ok) {
        throw new Error(
            "Failed to load filter options"
        );
    }

    const data =
        await response.json();


    fillSelect(
        "year",
        data.years || []
    );

    fillSelect(
        "manufacturer",
        data.manufacturers || []
    );

    fillSelect(
        "category",
        data.categories || []
    );

    fillSelect(
        "severity",
        data.severities || []
    );

    fillSelect(
        "state",
        data.states || []
    );


    document
        .querySelectorAll(
            ".filters-grid select"
        )
        .forEach(select => {

            select.addEventListener(
                "change",
                loadAnalytics
            );

        });
}


// =========================================================
// CURRENT FILTERS
// =========================================================

function getFilters() {

    return new URLSearchParams({

        year:
            document.getElementById("year")
                ?.value || "All",

        manufacturer:
            document.getElementById("manufacturer")
                ?.value || "All",

        category:
            document.getElementById("category")
                ?.value || "All",

        severity:
            document.getElementById("severity")
                ?.value || "All",

        state:
            document.getElementById("state")
                ?.value || "All"
    });
}


// =========================================================
// LOAD ANALYTICS
// =========================================================

async function loadAnalytics() {

    const response =
        await fetch(
            "/api/analytics?" +
            getFilters().toString()
        );

    if (!response.ok) {
        throw new Error(
            "Failed to load analytics"
        );
    }

    const data =
        await response.json();


    console.log(
        "MedTrace Analytics:",
        data
    );


    // =====================================================
    // TOP RECALL REASONS
    // =====================================================

    const reasons =
        getChartData(
            data.top_reasons
        );

    createBarChart(
        "topReasonsChart",
        reasons.labels,
        reasons.values
    );


    // =====================================================
    // MONTHLY TREND
    // =====================================================

    const monthly =
        getChartData(
            data.monthly_trend
        );

    createLineChart(
        "monthlyTrendChart",
        monthly.labels,
        monthly.values
    );


    // =====================================================
    // MANUFACTURER TREND
    // =====================================================

    const manufacturers =
        getChartData(
            data.manufacturer_trend
        );

    createBarChart(
        "manufacturerTrendChart",
        manufacturers.labels,
        manufacturers.values
    );


    // =====================================================
    // DRUG CATEGORY
    // =====================================================

    const categories =
        getChartData(
            data.drug_category
        );

    createDoughnutChart(
        "drugCategoryChart",
        categories.labels,
        categories.values
    );


    // =====================================================
    // AVERAGE DURATION
    // =====================================================

    const duration =
        document.getElementById(
            "averageDuration"
        );

    if (duration) {

        duration.textContent =
            data.average_duration ?? 0;
    }


    // =====================================================
    // RECALL FREQUENCY
    // =====================================================

    const frequency =
        document.getElementById(
            "recallFrequency"
        );

    if (frequency) {

        frequency.textContent =
            data.recall_frequency ?? 0;
    }


    // =====================================================
    // HEATMAP
    // =====================================================

    renderHeatmap(
        data.heatmap || []
    );


    // =====================================================
    // MANUFACTURER PERFORMANCE
    // =====================================================

    renderManufacturerPerformance(
        data.manufacturer_performance || []
    );


    // =====================================================
    // SEVERITY
    // =====================================================

    const severity =
        getChartData(
            data.severity
        );

    createBarChart(
        "severityChart",
        severity.labels,
        severity.values,
        SEVERITY_COLORS
    );


    // =====================================================
    // INSIGHTS
    // =====================================================

    renderInsights(
        data.insights || []
    );
}


// =========================================================
// HEATMAP
// =========================================================

function renderHeatmap(rows) {

    const target =
        document.getElementById(
            "heatmapContainer"
        );

    if (!target) return;


    if (!Array.isArray(rows) || rows.length === 0) {

        target.innerHTML =
            "<div class='empty'>" +
            "No heatmap data available." +
            "</div>";

        return;
    }


    let html = `

        <table class="data-table">

            <thead>

                <tr>
                    <th>State</th>
                    <th>Critical</th>
                    <th>Major</th>
                    <th>Minor</th>
                </tr>

            </thead>

            <tbody>
    `;


    rows.forEach(row => {

        html += `

            <tr>

                <td>
                    ${escapeHTML(row.state)}
                </td>

                <td>
                    ${row.Critical ?? 0}
                </td>

                <td>
                    ${row.Major ?? 0}
                </td>

                <td>
                    ${row.Minor ?? 0}
                </td>

            </tr>
        `;
    });


    html += `

            </tbody>

        </table>
    `;


    target.innerHTML = html;
}


// =========================================================
// MANUFACTURER PERFORMANCE
// =========================================================

function renderManufacturerPerformance(rows) {

    const target =
        document.getElementById(
            "manufacturerPerformance"
        );

    if (!target) return;


    // IMPORTANT:
    // Always replace Loading...
    // even when there is no data.

    if (!Array.isArray(rows) || rows.length === 0) {

        target.innerHTML =
            "<div class='empty'>" +
            "No manufacturer performance data available." +
            "</div>";

        return;
    }


    let html = `

        <table class="data-table">

            <thead>

                <tr>

                    <th>Manufacturer</th>
                    <th>Recalls</th>
                    <th>Critical</th>

                </tr>

            </thead>

            <tbody>
    `;


    rows.forEach(row => {

        html += `

            <tr>

                <td>
                    ${escapeHTML(
                        row.manufacturer
                    )}
                </td>

                <td>
                    ${Number(
                        row.recalls || 0
                    )}
                </td>

                <td>
                    ${Number(
                        row.critical || 0
                    )}
                </td>

            </tr>
        `;
    });


    html += `

            </tbody>

        </table>
    `;


    target.innerHTML = html;
}


// =========================================================
// INSIGHTS
// =========================================================

function renderInsights(items) {

    const target =
        document.getElementById(
            "insights"
        );

    if (!target) return;


    // ALWAYS replace Loading insights...

    if (!Array.isArray(items) || items.length === 0) {

        target.innerHTML =
            "<div class='empty'>" +
            "No insights available for the selected filters." +
            "</div>";

        return;
    }


    let html = "";


    items.forEach((item, index) => {

        html += `

            <div class="analysis-item">

                <span class="insight-number">
                    ${index + 1}
                </span>

                <span>
                    ${escapeHTML(item)}
                </span>

            </div>
        `;
    });


    target.innerHTML = html;
}


// =========================================================
// HTML SAFETY
// =========================================================

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");
}


// =========================================================
// INITIALIZE
// =========================================================

async function init() {

    try {

        await loadFilterOptions();

        await loadAnalytics();

    } catch (error) {

        console.error(
            "MedTrace Dashboard 2 error:",
            error
        );

        const performance =
            document.getElementById(
                "manufacturerPerformance"
            );

        const insights =
            document.getElementById(
                "insights"
            );


        if (performance) {

            performance.innerHTML =
                "<div class='empty'>" +
                "Unable to load manufacturer performance." +
                "</div>";
        }


        if (insights) {

            insights.innerHTML =
                "<div class='empty'>" +
                "Unable to load insights." +
                "</div>";
        }
    }
}


document.addEventListener(
    "DOMContentLoaded",
    init
);