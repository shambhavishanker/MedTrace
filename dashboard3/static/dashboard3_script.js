// ==================================================
// MEDTRACE
// DASHBOARD 3 - PREDICTIVE RISK DASHBOARD
// ==================================================

let allRecalls = [];
let filteredRecalls = [];
let selectedRecall = null;
let riskDistributionChart = null;


// ==================================================
// PAGE LOAD
// ==================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadRecalls();
        loadModelPerformance();
        loadFutureRecallPredictions();

    }
);


// ==================================================
// LOAD RECALL DATA
// ==================================================

async function loadRecalls() {

    try {

        const response = await fetch(
            "/api/recalls"
        );

        const data = await response.json();

        allRecalls = data.recalls || data;

        populateFilters();

        applyFilters();

    } catch (error) {

        console.error(
            "Failed to load recalls:",
            error
        );

    }

}


// ==================================================
// POPULATE FILTERS
// ==================================================

function populateFilters() {

    const years = new Set();
    const manufacturers = new Set();
    const categories = new Set();
    const severities = new Set();
    const states = new Set();


    allRecalls.forEach(
        recall => {

            const date =
                recall.recall_date ||
                recall.recall_initiated ||
                "";

            if (date) {

                years.add(
                    date.substring(0, 4)
                );

            }


            if (recall.manufacturer) {

                manufacturers.add(
                    recall.manufacturer
                );

            }


            if (recall.drug_category) {

                categories.add(
                    recall.drug_category
                );

            }


            if (recall.severity) {

                severities.add(
                    recall.severity
                );

            }


            const facilities =
                recall.facilities || [];


            facilities.forEach(
                facility => {

                    const state =
                        facility.state ||
                        facility.location ||
                        "";

                    if (state) {

                        states.add(
                            state
                        );

                    }

                }
            );

        }
    );


    fillSelect(
        "yearFilter",
        [...years].sort()
    );

    fillSelect(
        "manufacturerFilter",
        [...manufacturers].sort()
    );

    fillSelect(
        "categoryFilter",
        [...categories].sort()
    );

    fillSelect(
        "severityFilter",
        [...severities].sort()
    );

    fillSelect(
        "stateFilter",
        [...states].sort()
    );

}


function fillSelect(
    id,
    values
) {

    const select =
        document.getElementById(id);

    if (!select) {
        return;
    }


    const firstOption =
        select.options[0];


    select.innerHTML = "";

    select.appendChild(
        firstOption
    );


    values.forEach(
        value => {

            const option =
                document.createElement("option");

            option.value = value;
            option.textContent = value;

            select.appendChild(
                option
            );

        }
    );


    select.addEventListener(
        "change",
        applyFilters
    );

}


// ==================================================
// APPLY FILTERS
// ==================================================

function applyFilters() {

    const year =
        document.getElementById(
            "yearFilter"
        ).value;


    const manufacturer =
        document.getElementById(
            "manufacturerFilter"
        ).value;


    const category =
        document.getElementById(
            "categoryFilter"
        ).value;


    const severity =
        document.getElementById(
            "severityFilter"
        ).value;


    const state =
        document.getElementById(
            "stateFilter"
        ).value;


    filteredRecalls =
        allRecalls.filter(
            recall => {

                const date =
                    recall.recall_date ||
                    recall.recall_initiated ||
                    "";


                const recallYear =
                    date
                        ? date.substring(0, 4)
                        : "";


                const stateMatch =
                    state === "all" ||
                    (recall.facilities || []).some(
                        facility =>
                            (
                                facility.state ||
                                facility.location ||
                                ""
                            ) === state
                    );


                return (

                    (
                        year === "all" ||
                        recallYear === year
                    )

                    &&

                    (
                        manufacturer === "all" ||
                        recall.manufacturer === manufacturer
                    )

                    &&

                    (
                        category === "all" ||
                        recall.drug_category === category
                    )

                    &&

                    (
                        severity === "all" ||
                        recall.severity === severity
                    )

                    &&

                    stateMatch

                );

            }
        );


    updateRiskSummary();

    renderPriorityTable();

    updateRiskChart();


    if (filteredRecalls.length > 0) {

        const sorted =
            [...filteredRecalls].sort(
                (a, b) =>
                    calculateRisk(b).total -
                    calculateRisk(a).total
            );


        selectRecall(
            sorted[0]
        );

    } else {

        clearSelectedRecall();

    }

}


// ==================================================
// RULE-BASED RISK CALCULATION
// ==================================================

function calculateRisk(
    recall
) {

    let severityScore = 0;
    let reasonScore = 0;
    let recoveryScore = 0;
    let durationScore = 0;
    let manufacturerScore = 0;


    // Severity

    if (recall.severity === "Critical") {

        severityScore = 25;

    } else if (
        recall.severity === "Major"
    ) {

        severityScore = 18;

    } else {

        severityScore = 10;

    }


    // Reason

    const reason =
        recall.reason || "";


    if (reason === "Contamination") {

        reasonScore = 20;

    } else if (
        reason === "Incorrect Dosage"
    ) {

        reasonScore = 18;

    } else if (
        reason === "Mislabeling"
    ) {

        reasonScore = 15;

    } else if (
        reason === "Stability Failure"
    ) {

        reasonScore = 13;

    } else {

        reasonScore = 10;

    }


    // Recovery gap

    const batch =
        recall.batch_details || {};


    const distributed =
        Number(
            batch.units_distributed || 0
        );


    const recovered =
        Number(
            batch.units_recovered || 0
        );


    let recoveryRate = 0;


    if (distributed > 0) {

        recoveryRate =
            recovered /
            distributed;

    }


    recoveryScore =
        Math.round(
            20 *
            (1 - recoveryRate)
        );


    // Duration

    const start =
        recall.recall_date ||
        recall.recall_initiated;


    const end =
        recall.timeline &&
        recall.timeline.closed
            ? recall.timeline.closed
            : null;


    if (start) {

        const startDate =
            new Date(start);

        const endDate =
            end
                ? new Date(end)
                : new Date();


        const duration =
            Math.max(
                0,
                Math.round(
                    (
                        endDate -
                        startDate
                    ) /
                    (
                        1000 *
                        60 *
                        60 *
                        24
                    )
                )
            );


        durationScore =
            Math.min(
                15,
                Math.round(
                    duration / 2
                )
            );

    }


    // Manufacturer history

    const manufacturer =
        recall.manufacturer;


    const manufacturerRecalls =
        allRecalls.filter(
            item =>
                item.manufacturer ===
                manufacturer
        ).length;


    manufacturerScore =
        Math.min(
            20,
            manufacturerRecalls * 4
        );


    const total =
        severityScore +
        reasonScore +
        recoveryScore +
        durationScore +
        manufacturerScore;


    let priority = "Low";


    if (total >= 70) {

        priority = "High";

    } else if (total >= 40) {

        priority = "Medium";

    }


    return {

        total,
        priority,
        severityScore,
        reasonScore,
        recoveryScore,
        durationScore,
        manufacturerScore

    };

}


// ==================================================
// RISK SUMMARY
// ==================================================

function updateRiskSummary() {

    let high = 0;
    let medium = 0;
    let low = 0;
    let activeRisk = 0;


    filteredRecalls.forEach(
        recall => {

            const risk =
                calculateRisk(recall);


            if (
                risk.priority === "High"
            ) {

                high++;

            } else if (
                risk.priority === "Medium"
            ) {

                medium++;

            } else {

                low++;

            }


            const status =
                String(
                    recall.status || ""
                ).toLowerCase();


            if (
                status !== "closed" &&
                status !== "completed" &&
                risk.priority !== "Low"
            ) {

                activeRisk++;

            }

        }
    );


    document.getElementById(
        "highPriorityCount"
    ).textContent = high;


    document.getElementById(
        "mediumPriorityCount"
    ).textContent = medium;


    document.getElementById(
        "lowPriorityCount"
    ).textContent = low;


    document.getElementById(
        "activeRiskCount"
    ).textContent = activeRisk;

}


// ==================================================
// PRIORITY TABLE
// ==================================================

function renderPriorityTable() {

    const tbody =
        document.getElementById(
            "priorityTableBody"
        );


    tbody.innerHTML = "";


    const sorted =
        [...filteredRecalls].sort(
            (a, b) =>
                calculateRisk(b).total -
                calculateRisk(a).total
        );


    sorted.forEach(
        recall => {

            const risk =
                calculateRisk(recall);


            const batch =
                recall.batch_details || {};


            const distributed =
                Number(
                    batch.units_distributed || 0
                );


            const recovered =
                Number(
                    batch.units_recovered || 0
                );


            let recoveryGap = 0;


            if (distributed > 0) {

                recoveryGap =
                    (
                        1 -
                        recovered /
                        distributed
                    ) *
                    100;

            }


            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${recall.recall_id || "—"}
                </td>

                <td>
                    ${recall.medicine || "—"}
                </td>

                <td>
                    ${recall.severity || "—"}
                </td>

                <td>
                    ${recoveryGap.toFixed(1)}%
                </td>

                <td>
                    ${risk.total}
                </td>

                <td class="risk-${risk.priority.toLowerCase()}">
                    ${risk.priority}
                </td>

            `;


            row.style.cursor = "pointer";


            row.addEventListener(
                "click",
                () => selectRecall(recall)
            );


            tbody.appendChild(
                row
            );

        }
    );

}


// ==================================================
// RISK CHART
// ==================================================

function updateRiskChart() {

    const counts = {
        High: 0,
        Medium: 0,
        Low: 0
    };


    filteredRecalls.forEach(
        recall => {

            counts[
                calculateRisk(recall).priority
            ]++;

        }
    );


    const canvas =
        document.getElementById(
            "riskDistributionChart"
        );


    if (riskDistributionChart) {

        riskDistributionChart.destroy();

    }


    riskDistributionChart =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {

                    labels: [
                        "High",
                        "Medium",
                        "Low"
                    ],

                    datasets: [
                        {
                            data: [
                                counts.High,
                                counts.Medium,
                                counts.Low
                            ]
                        }
                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            position: "bottom"
                        }

                    }

                }

            }
        );

}


// ==================================================
// SELECT RECALL
// ==================================================

async function selectRecall(
    recall
) {

    selectedRecall = recall;


    updateRiskAssessment(
        recall
    );


    renderWarnings(
        recall
    );


    renderRecommendation(
        recall
    );


    await loadMLPrediction(
        recall.recall_id
    );

}


// ==================================================
// UPDATE RULE-BASED RISK ASSESSMENT
// ==================================================

function updateRiskAssessment(
    recall
) {

    const risk =
        calculateRisk(recall);


    document.getElementById(
        "riskScore"
    ).textContent =
        `${risk.total}/100`;


    document.getElementById(
        "riskPriority"
    ).textContent =
        `${risk.priority} Priority`;


    document.getElementById(
        "severityScore"
    ).textContent =
        risk.severityScore;


    document.getElementById(
        "reasonScore"
    ).textContent =
        risk.reasonScore;


    document.getElementById(
        "recoveryScore"
    ).textContent =
        risk.recoveryScore;


    document.getElementById(
        "durationScore"
    ).textContent =
        risk.durationScore;


    document.getElementById(
        "manufacturerScore"
    ).textContent =
        risk.manufacturerScore;


    setBar(
        "severityBar",
        risk.severityScore,
        25
    );


    setBar(
        "reasonBar",
        risk.reasonScore,
        20
    );


    setBar(
        "recoveryBar",
        risk.recoveryScore,
        20
    );


    setBar(
        "durationBar",
        risk.durationScore,
        15
    );


    setBar(
        "manufacturerBar",
        risk.manufacturerScore,
        20
    );

}


function setBar(
    id,
    value,
    max
) {

    const element =
        document.getElementById(id);


    const percentage =
        Math.min(
            100,
            Math.max(
                0,
                (
                    value /
                    max
                ) *
                100
            )
        );


    element.style.width =
        `${percentage}%`;

}


// ==================================================
// ML RECALL RESOLUTION PREDICTION
// ==================================================

async function loadMLPrediction(
    recallId
) {

    try {

        const response =
            await fetch(
                `/api/ml/predict/${recallId}`
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.error ||
                "Prediction failed"
            );

        }


        document.getElementById(
            "mlPrediction"
        ).textContent =
            result.prediction || "—";


        document.getElementById(
            "mlProbability"
        ).textContent =
            result.probability_percentage !== undefined
                ? `${result.probability_percentage}%`
                : "—";


        document.getElementById(
            "mlRiskLevel"
        ).textContent =
            result.risk_level || "—";


        document.getElementById(
            "mlModel"
        ).textContent =
            result.model || "—";


        document.getElementById(
            "mlTarget"
        ).textContent =
            result.target || "—";


        renderMLExplanation(
            result.explanation || []
        );

        updateKeyMLSignal(
            result.explanation || []
        ); 
        
        updateDelayInsight(
            result
        );

    } catch (error) {

        console.error(
            "ML prediction error:",
            error
        );


        document.getElementById(
            "mlPrediction"
        ).textContent =
            "Unavailable";


        document.getElementById(
            "mlProbability"
        ).textContent =
            "—";


        document.getElementById(
            "mlRiskLevel"
        ).textContent =
            "—";


        document.getElementById(
            "mlModel"
        ).textContent =
            "—";


        document.getElementById(
            "mlTarget"
        ).textContent =
            "—";


        document.getElementById(
            "mlExplanationContainer"
        ).innerHTML = `

            <div class="explanation-item">
                ML prediction could not be loaded.
            </div>

        `;

    }

}


// ==================================================
// ML EXPLANATION
// ==================================================

function renderMLExplanation(
    explanations
) {

    const container =
        document.getElementById(
            "mlExplanationContainer"
        );


    container.innerHTML = "";


    if (
        !explanations ||
        explanations.length === 0
    ) {

        container.innerHTML = `

            <div class="explanation-item">
                No significant model-influencing factors were returned.
            </div>

        `;

        return;

    }


    explanations.forEach(
        item => {

            const div =
                document.createElement(
                    "div"
                );


            const arrow =
                item.contribution > 0
                    ? "↑"
                    : "↓";


            div.className =
                "explanation-item";


            div.innerHTML = `

                <strong>
                    ${arrow}
                    ${item.feature}
                </strong>

                —
                Model influence:
                ${item.direction}

            `;


            container.appendChild(
                div
            );

        }
    );

}


// ==================================================
// FUTURE RECALL PREDICTIONS
// ==================================================

async function loadFutureRecallPredictions() {

    try {

        const response =
            await fetch(
                "/api/ml/future-recall-risk"
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Future prediction failed"
            );

        }


        const predictions =
            data.predictions || [];


        renderFutureRecallTable(
            predictions
        );


        updateFutureRiskInsight(
            predictions
        );


    } catch (error) {

        console.error(
            "Future recall prediction error:",
            error
        );


        document.getElementById(
            "futureRecallTableBody"
        ).innerHTML = `

            <tr>
                <td colspan="6">
                    Future recall predictions could not be loaded.
                </td>
            </tr>

        `;

    }

}


// ==================================================
// FUTURE RECALL TABLE
// ==================================================

function renderFutureRecallTable(
    predictions
) {

    const tbody =
        document.getElementById(
            "futureRecallTableBody"
        );


    tbody.innerHTML = "";


    predictions.forEach(
        item => {

            const row =
                document.createElement("tr");


            const riskClass =
                (
                    item.risk_level ||
                    "Low"
                ).toLowerCase();


            row.innerHTML = `

                <td>
                    ${item.medicine || "—"}
                </td>

                <td>
                    ${item.manufacturer || "—"}
                </td>

                <td>
                    ${item.drug_category || "—"}
                </td>

                <td>
                    ${item.historical_recall_count ?? "—"}
                </td>

                <td>
                    ${item.probability_percentage !== undefined
                        ? item.probability_percentage + "%"
                        : "—"}
                </td>

                <td class="risk-${riskClass}">
                    ${item.risk_level || "—"}
                </td>

            `;


            tbody.appendChild(
                row
            );

        }
    );


}


// ==================================================
// FUTURE RISK INSIGHT
// ==================================================

function updateFutureRiskInsight(
    predictions
) {

    const value =
        document.getElementById(
            "highestFutureRisk"
        );


    const detail =
        document.getElementById(
            "highestFutureRiskDetail"
        );


    if (
        !predictions ||
        predictions.length === 0
    ) {

        value.textContent = "—";

        detail.textContent =
            "No future recall predictions available.";

        return;

    }


    const highest =
        [...predictions].sort(
            (a, b) =>
                Number(
                    b.probability || 0
                ) -
                Number(
                    a.probability || 0
                )
        )[0];


    value.textContent =
        highest.medicine || "—";


    detail.textContent =
        `${highest.probability_percentage}% predicted likelihood • ${highest.risk_level} prediction risk • ${highest.manufacturer}`;

}


// ==================================================
// DELAY RISK INSIGHT
// ==================================================

function updateDelayInsight(
    result
) {

    const value =
        document.getElementById(
            "highestDelayRisk"
        );


    const detail =
        document.getElementById(
            "highestDelayRiskDetail"
        );


    if (!result) {

        value.textContent = "—";

        detail.textContent =
            "No resolution prediction available.";

        return;

    }


    value.textContent =
        result.risk_level || "—";


    const medicine =
        selectedRecall &&
        selectedRecall.medicine
            ? selectedRecall.medicine
            : "Selected recall";


    detail.textContent =
        `${medicine}: ${result.probability_percentage}% predicted likelihood of delayed resolution`;

}


// ==================================================
// KEY MODEL SIGNALS
// ==================================================

function updateKeyMLSignal(
    explanations
) {

    const element =
        document.getElementById(
            "keyMLSignal"
        );


    if (
        !explanations ||
        explanations.length === 0
    ) {

        element.textContent =
            "No major signals";

        return;

    }


    const factors =
        explanations
            .slice(0, 3)
            .map(
                item =>
                    item.feature
            );


    element.textContent =
        factors.join(
            " • "
        );

}


// ==================================================
// MODEL PERFORMANCE
// ==================================================

async function loadModelPerformance() {

    try {

        const [
            delayResponse,
            futureResponse
        ] = await Promise.all([

            fetch(
                "/api/ml/model-info"
            ),

            fetch(
                "/api/ml/future-recall-model-info"
            )

        ]);


        const delay =
            await delayResponse.json();


        const future =
            await futureResponse.json();


        // Delay model

        setText(
            "delayTrainingRecords",
            delay.training_records
        );


        setText(
            "delayAccuracy",
            formatMetric(
                delay.accuracy
            )
        );


        setText(
            "delayPrecision",
            formatMetric(
                delay.precision
            )
        );


        setText(
            "delayRecall",
            formatMetric(
                delay.recall
            )
        );


        setText(
            "delayF1",
            formatMetric(
                delay.f1_score
            )
        );


        // Future model

        setText(
            "futureTrainingRecords",
            future.training_records
        );


        setText(
            "futureAccuracy",
            formatMetric(
                future.accuracy
            )
        );


        setText(
            "futurePrecision",
            formatMetric(
                future.precision
            )
        );


        setText(
            "futureRecall",
            formatMetric(
                future.recall
            )
        );


        setText(
            "futureF1",
            formatMetric(
                future.f1_score
            )
        );

    } catch (error) {

        console.error(
            "Model performance error:",
            error
        );

    }

}


// ==================================================
// METRIC FORMATTER
// ==================================================

function formatMetric(
    value
) {

    if (
        value === undefined ||
        value === null
    ) {

        return "—";

    }


    const numeric =
        Number(value);


    if (
        Number.isNaN(numeric)
    ) {

        return value;

    }


    return (
        numeric <= 1
            ? `${(
                numeric * 100
            ).toFixed(0)}%`
            : `${numeric.toFixed(0)}%`
    );

}


// ==================================================
// SAFE TEXT SETTER
// ==================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (!element) {

        return;

    }


    if (
        value === undefined ||
        value === null
    ) {

        element.textContent = "—";

    } else {

        element.textContent = value;

    }

}


// ==================================================
// WARNINGS
// ==================================================

function renderWarnings(
    recall
) {

    const container =
        document.getElementById(
            "warningContainer"
        );


    container.innerHTML = "";


    const risk =
        calculateRisk(recall);


    if (
        risk.priority === "High"
    ) {

        addWarning(
            container,
            "High rule-based priority. Immediate review is recommended."
        );

    }


    const batch =
        recall.batch_details || {};


    const distributed =
        Number(
            batch.units_distributed || 0
        );


    const recovered =
        Number(
            batch.units_recovered || 0
        );


    if (
        distributed > 0 &&
        recovered / distributed < 0.60
    ) {

        addWarning(
            container,
            "Recovery remains below 60% of distributed units."
        );

    }


    if (
        recall.severity === "Critical"
    ) {

        addWarning(
            container,
            "Critical severity recall requires close monitoring."
        );

    }


    if (
        container.children.length === 0
    ) {

        container.innerHTML = `

            <div class="warning-box">
                No major rule-based warning signals detected.
            </div>

        `;

    }

}


function addWarning(
    container,
    message
) {

    const div =
        document.createElement(
            "div"
        );


    div.className =
        "warning-box";


    div.textContent =
        message;


    container.appendChild(
        div
    );

}


// ==================================================
// RECOMMENDATION
// ==================================================

function renderRecommendation(
    recall
) {

    const container =
        document.getElementById(
            "recommendationContainer"
        );


    const risk =
        calculateRisk(recall);


    let recommendation =
        "Continue routine monitoring and update the recall status as new information becomes available.";


    if (
        risk.priority === "High"
    ) {

        recommendation =
            "Prioritize investigation, recovery monitoring, stakeholder communication, and frequent status updates.";

    } else if (
        risk.priority === "Medium"
    ) {

        recommendation =
            "Maintain active monitoring, review recovery progress, and follow up with affected facilities.";

    }


    container.innerHTML = `

        <div class="recommendation-box">

            <strong>
                Recommended Action
            </strong>

            <br><br>

            ${recommendation}

        </div>

    `;

}


// ==================================================
// CLEAR SELECTED RECALL
// ==================================================

function clearSelectedRecall() {

    selectedRecall = null;


    const ids = [
        "riskScore",
        "riskPriority",
        "severityScore",
        "reasonScore",
        "recoveryScore",
        "durationScore",
        "manufacturerScore",
        "mlPrediction",
        "mlProbability",
        "mlRiskLevel",
        "mlModel",
        "mlTarget"
    ];


    ids.forEach(
        id => {

            const element =
                document.getElementById(id);

            if (element) {

                element.textContent = "—";

            }

        }
    );


    [
        "severityBar",
        "reasonBar",
        "recoveryBar",
        "durationBar",
        "manufacturerBar"
    ].forEach(
        id => {

            const element =
                document.getElementById(id);

            if (element) {

                element.style.width = "0%";

            }

        }
    );


    document.getElementById(
        "warningContainer"
    ).innerHTML = "";


    document.getElementById(
        "recommendationContainer"
    ).innerHTML = "";


    document.getElementById(
        "mlExplanationContainer"
    ).innerHTML = `

        <div class="explanation-item">
            Select a recall to view ML explanation factors.
        </div>

    `;


    document.getElementById(
        "highestDelayRisk"
    ).textContent = "—";


    document.getElementById(
        "highestDelayRiskDetail"
    ).textContent =
        "Select a recall to view its predicted resolution risk.";


    document.getElementById(
        "keyMLSignal"
    ).textContent = "—";

}