from flask import Blueprint, render_template, jsonify
import json
from pathlib import Path

main_dashboard = Blueprint(
    "main_dashboard",
    __name__,
    template_folder="templates",
    static_folder="static",
    static_url_path="/main_dashboard/static"
)

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "medtrace_common_dataset.json"


def load_data():
    with open(DATA_FILE, "r", encoding="utf-8") as file:
        return json.load(file)


@main_dashboard.route("/")
def home():
    return render_template("index.html")


@main_dashboard.route("/api/dashboard")
def dashboard_data():

    data = load_data()
    recalls = data["recalls"]

    active = [
        r for r in recalls
        if r["status"] in ["Active", "In Progress"]
    ]

    closed = [
        r for r in recalls
        if r["status"] in ["Completed", "Closed"]
    ]

    critical = [
        r for r in recalls
        if r["severity"] == "Critical"
    ]

    hospitals = set()
    pharmacies = set()
    manufacturers = set()

    for recall in recalls:

        manufacturers.add(recall["manufacturer"])

        for facility in recall.get("facilities", []):

            if facility["type"] == "Hospital":
                hospitals.add(facility["name"])

            if facility["type"] == "Pharmacy":
                pharmacies.add(facility["name"])

    total_distributed = sum(
        r["batch_details"]["units_distributed"]
        for r in recalls
    )

    total_recovered = sum(
        r["batch_details"]["units_recovered"]
        for r in recalls
    )

    if total_distributed > 0:
        completion = round(
            (total_recovered / total_distributed) * 100
        )
    else:
        completion = 0

    recent = sorted(
        recalls,
        key=lambda r: r["recall_date"],
        reverse=True
    )[:5]

    result = {
        "kpis": {
            "total_active_recalls": len(active),
            "total_closed_recalls": len(closed),
            "critical_recalls": len(critical),
            "hospitals_affected": len(hospitals),
            "pharmacies_affected": len(pharmacies),
            "manufacturers_involved": len(manufacturers),
            "average_recall_response_time": "—",
            "average_recall_completion": f"{completion}%"
        },

        "recent_notifications": [
            {
                "id": r["recall_id"],
                "severity": r["severity"],
                "time": r["recall_date"]
            }
            for r in recent
        ],

        "high_priority_alerts": [
            {
                "id": r["recall_id"],
                "title": "Critical recall requires attention",
                "detail": f"{r['medicine']} — {r['manufacturer']}"
            }
            for r in active
            if r["severity"] == "Critical"
        ]
    }

    return jsonify(result)