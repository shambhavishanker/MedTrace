// ==================================================
// MEDTRACE
// DASHBOARD 1 - RECALL INVESTIGATION CENTER
// ==================================================


// ==================================================
// LOAD ALL RECALLS
// ==================================================

async function loadRecalls() {

    const select = document.getElementById("recallSelect");

    if (!select) {
        console.error("Recall dropdown not found.");
        return;
    }

    try {

        const response = await fetch("/api/recalls");

        console.log("API status:", response.status);

        if (!response.ok) {
            throw new Error(
                `API error: ${response.status}`
            );
        }

        const recalls = await response.json();

        console.log("Recalls received:", recalls);

        if (!Array.isArray(recalls)) {
            throw new Error(
                "API did not return a recall array."
            );
        }

        select.innerHTML = "";

        const defaultOption =
            document.createElement("option");

        defaultOption.value = "";
        defaultOption.textContent =
            "-- Select a Recall --";

        select.appendChild(defaultOption);

        recalls.forEach(recall => {

            const option =
                document.createElement("option");

            option.value = recall.recall_id;

            option.textContent =
                `${recall.recall_id} - ${recall.medicine}`;

            select.appendChild(option);

        });

        console.log(
            `${recalls.length} recalls loaded successfully.`
        );

    } catch (error) {

        console.error(
            "Error loading recalls:",
            error
        );

        select.innerHTML = `
            <option value="">
                Unable to load recalls
            </option>
        `;
    }
}




// ==================================================
// LOAD SELECTED RECALL
// ==================================================

async function searchRecall() {


    const select =
        document.getElementById(
            "recallSelect"
        );


    if (!select) {

        console.error(
            "Recall dropdown not found."
        );

        return;
    }


    const recallId =
        select.value;


    // No recall selected

    if (!recallId) {

        alert(
            "Please select a recall."
        );

        return;
    }



    try {


        // ==================================================
        // GET COMPLETE RECALL
        // ==================================================

        const response =
            await fetch(
                `/api/recalls/${recallId}`
            );


        if (!response.ok) {

            throw new Error(
                "Recall not found."
            );

        }


        const recall =
            await response.json();



        // ==================================================
        // RECALL OVERVIEW
        // ==================================================

        setText(
            "recallId",
            recall.recall_id
        );


        setText(
            "medicine",
            recall.medicine
        );


        setText(
            "manufacturer",
            recall.manufacturer
        );


        setText(
            "batch",
            recall.batch
        );


        setText(
            "reason",
            recall.reason
        );


        setText(
            "severity",
            recall.severity
        );


        setText(
            "recallDate",
            recall.recall_date
        );


        setText(
            "status",
            recall.status
        );



        // ==================================================
        // BATCH NUMBER BADGE
        // ==================================================

        setText(
            "batchNumber",
            `Batch: ${recall.batch || "—"}`
        );



        // ==================================================
        // BATCH & INVENTORY
        // ==================================================

        const batch =
            recall.batch_details || {};


        const unitsProduced =
            Number(
                batch.units_produced
            ) || 0;


        const unitsDistributed =
            Number(
                batch.units_distributed
            ) || 0;


        const unitsRecovered =
            Number(
                batch.units_recovered
            ) || 0;


        const unitsRemaining = Math.max(
          unitsDistributed - unitsRecovered,
          0
        );

// ==================================================
// SET TEXT CONTENT
// ==================================================

function setText(id, value) {

    const element = document.getElementById(id);

    if (!element) {
        console.warn(
            `Element with id "${id}" not found.`
        );
        return;
    }

    element.textContent =
        value === null ||
        value === undefined ||
        value === ""
            ? "—"
            : value;
}

        setText(
            "unitsProduced",
            formatNumber(
                unitsProduced
            )
        );


        setText(
            "unitsDistributed",
            formatNumber(
                unitsDistributed
            )
        );


        setText(
            "unitsRecovered",
            formatNumber(
                unitsRecovered
            )
        );


        setText(
            "unitsRemaining",
            formatNumber(
                unitsRemaining
            )
        );



        // ==================================================
        // RECOVERY PERCENTAGE
        // ==================================================

        let recoveryPercentage = 0;


        if (
            unitsDistributed > 0
        ) {

            recoveryPercentage =
                (
                    unitsRecovered /
                    unitsDistributed
                ) * 100;

        }


        recoveryPercentage =
            Math.min(
                recoveryPercentage,
                100
            );


        // Display percentage

        setText(
            "recallCompletion",
            `${recoveryPercentage.toFixed(1)}%`
        );


        // Progress bar

        const progressBar =
            document.getElementById(
                "recoveryProgress"
            );


        if (progressBar) {

            progressBar.style.width =
                `${recoveryPercentage}%`;

        }



        // ==================================================
        // AFFECTED FACILITIES
        // ==================================================

        renderFacilities(
            recall.facilities || []
        );



        // ==================================================
        // RECALL TIMELINE
        // ==================================================

        renderTimeline(
            recall.timeline || {}
        );



        // ==================================================
        // INVESTIGATION FINDINGS
        // ==================================================

        renderInvestigation(
            recall.investigation || {}
        );


    } catch (error) {


        console.error(
            "Error loading recall:",
            error
        );


        alert(
            "Unable to load recall information."
        );

    }

}



// ==================================================
// RENDER FACILITIES
// ==================================================

function renderFacilities(
    facilities
) {


    const container =
        document.getElementById(
            "facilitiesContainer"
        );


    if (!container) {

        return;
    }


    // No facilities

    if (
        !facilities ||
        facilities.length === 0
    ) {

        container.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    —
                </div>

                <p>
                    No affected facility information available.
                </p>

            </div>
        `;

        return;
    }



    // Create table

    let tableHTML = `

        <table class="facilities-table">

            <thead>

                <tr>

                    <th>Facility</th>

                    <th>Location</th>

                    <th>Units Received</th>

                    <th>Units Recovered</th>

                    <th>Recovery %</th>

                    <th>Status</th>

                </tr>

            </thead>

            <tbody>
    `;



    facilities.forEach(
        facility => {


            const received =
                Number(
                    facility.units_received
                ) || 0;


            const recovered =
                Number(
                    facility.units_recovered
                ) || 0;


            let percentage = 0;


            if (
                received > 0
            ) {

                percentage =
                    (
                        recovered /
                        received
                    ) * 100;

            }


            percentage =
                Math.min(
                    percentage,
                    100
                );



            tableHTML += `

                <tr>

                    <td>
                        ${escapeHTML(
                            facility.name
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            facility.location
                        )}
                    </td>

                    <td>
                        ${formatNumber(
                            received
                        )}
                    </td>

                    <td>
                        ${formatNumber(
                            recovered
                        )}
                    </td>

                    <td>
                        ${percentage.toFixed(1)}%
                    </td>

                    <td>
                        ${escapeHTML(
                            facility.status
                        )}
                    </td>

                </tr>

            `;

        }
    );



    tableHTML += `

            </tbody>

        </table>

    `;



    container.innerHTML =
        tableHTML;

}



// ==================================================
// RENDER TIMELINE
// ==================================================

function renderTimeline(timeline) {
    const container = document.getElementById("timelineContainer");

    if (!timeline) {
        container.innerHTML = `
            <div class="empty-state">
                No timeline information available.
            </div>
        `;
        return;
    }

    let html = `
        <div class="timeline">

            ${createTimelineItem("Manufactured", timeline.manufactured)}

            ${createTimelineItem("Distributed", timeline.distributed)}

            ${createTimelineItem("Complaint Reported", timeline.complaint)}

            ${createTimelineItem("Lab Test", timeline.lab_test)}

            ${createTimelineItem("Recall Issued", timeline.recall_issued)}

            ${createTimelineItem("Stock Removed", timeline.stock_removed)}
    `;

    if (timeline.closed) {
        html += createTimelineItem(
            "Recall Closed",
            timeline.closed
        );
    }

    html += `
        </div>
    `;

    container.innerHTML = html;
}

// ==================================================
// RENDER INVESTIGATION
// ==================================================

function renderInvestigation(
    investigation
) {


    const container =
        document.getElementById(
            "investigationContainer"
        );


    if (!container) {

        return;
    }



    const status =
        investigation.status ||
        investigation.investigation_status ||
        "Under Investigation";


    const primaryFinding =
        investigation.primary_finding ||
        "—";


    const source =
        investigation.investigation_source ||
        "—";


    const affectedStage =
        investigation.affected_stage ||
        "—";


    const assessment =
        investigation.assessment ||
        "—";


    const recommendedAction =
        investigation.recommended_action ||
        "—";


    const evidence =
        investigation.evidence_reviewed ||
        [];



    // Evidence HTML

    let evidenceHTML = "";


    if (
        evidence.length > 0
    ) {

        evidenceHTML = `

            <div class="investigation-block">

                <span class="investigation-label">
                    Evidence Reviewed
                </span>

                <ul>
        `;


        evidence.forEach(
            item => {

                evidenceHTML += `
                    <li>
                        ${escapeHTML(item)}
                    </li>
                `;

            }
        );


        evidenceHTML += `

                </ul>

            </div>

        `;

    }



    // Complete investigation section

    container.innerHTML = `

        <div class="investigation-grid">


            <div class="investigation-block">

                <span class="investigation-label">
                    Investigation Status
                </span>

                <strong>
                    ${escapeHTML(status)}
                </strong>

            </div>



            <div class="investigation-block">

                <span class="investigation-label">
                    Primary Finding
                </span>

                <p>
                    ${escapeHTML(primaryFinding)}
                </p>

            </div>



            <div class="investigation-block">

                <span class="investigation-label">
                    Investigation Source
                </span>

                <p>
                    ${escapeHTML(source)}
                </p>

            </div>



            <div class="investigation-block">

                <span class="investigation-label">
                    Affected Stage
                </span>

                <p>
                    ${escapeHTML(affectedStage)}
                </p>

            </div>



            ${evidenceHTML}



            <div class="investigation-block">

                <span class="investigation-label">
                    Assessment
                </span>

                <p>
                    ${escapeHTML(assessment)}
                </p>

            </div>



            <div class="investigation-block">

                <span class="investigation-label">
                    Recommended Action
                </span>

                <p>
                    ${escapeHTML(recommendedAction)}
                </p>

            </div>


        </div>

    `;

}



// ==================================================
// CREATE TIMELINE ITEM
// ==================================================

function createTimelineItem(title, date) {
    if (!date) return "";

    return `
        <div class="timeline-item">

            <div class="timeline-dot"></div>

            <div class="timeline-content">
                <div class="timeline-title">
                    ${escapeHTML(title)}
                </div>

                <div class="timeline-date">
                    ${escapeHTML(date)}
                </div>
            </div>

        </div>
    `;
}
// ==================================================
// NUMBER FORMATTER
// ==================================================

function formatNumber(
    value
) {


    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "—";

    }


    const number =
        Number(value);


    if (
        Number.isNaN(number)
    ) {

        return value;

    }


    return number.toLocaleString(
        "en-IN"
    );

}



// ==================================================
// BASIC HTML ESCAPING
// ==================================================

function escapeHTML(
    value
) {


    if (
        value === null ||
        value === undefined
    ) {

        return "—";

    }


    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}



// ==================================================
// PAGE LOAD
// ==================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadRecalls();

    }
);