// Load Main Dashboard data
fetch("/api/dashboard")
    .then(response => response.json())
    .then(data => {

        // =========================
        // KPI CARDS
        // =========================

        const kpis = data.kpis;

        document.getElementById("total-active").textContent =
            kpis.total_active_recalls;

        document.getElementById("total-closed").textContent =
            kpis.total_closed_recalls;

        document.getElementById("critical").textContent =
            kpis.critical_recalls;

        document.getElementById("hospitals").textContent =
            kpis.hospitals_affected;

        document.getElementById("pharmacies").textContent =
            kpis.pharmacies_affected;

        document.getElementById("manufacturers").textContent =
            kpis.manufacturers_involved;

        document.getElementById("response-time").textContent =
            kpis.average_recall_response_time;

        document.getElementById("completion").textContent =
            kpis.average_recall_completion;


        // =========================
        // RECENT NOTIFICATIONS
        // =========================

        const notifications =
            document.getElementById("notifications");

        notifications.innerHTML = "";

        data.recent_notifications.forEach(item => {

            const notification = document.createElement("div");

            notification.className = "notification-item";

            notification.innerHTML = `
                <strong>${item.id}</strong>
                <span>${item.severity}</span>
                <small>${item.time}</small>
            `;

            notifications.appendChild(notification);
        });


        // =========================
        // HIGH-PRIORITY ALERTS
        // =========================

        const alerts =
            document.getElementById("alerts");

        alerts.innerHTML = "";

        data.high_priority_alerts.forEach(item => {

            const alert = document.createElement("div");

            alert.className = "alert-item";

            alert.innerHTML = `
                <strong>${item.title}</strong>
                <p>${item.detail}</p>
            `;

            alerts.appendChild(alert);
        });

    })

    // =========================
    // ERROR HANDLING
    // =========================

    .catch(error => {
        console.error("Error loading dashboard data:", error);
    });