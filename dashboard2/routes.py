from flask import Blueprint, jsonify, render_template, request
import json
from pathlib import Path
from collections import Counter, defaultdict
from datetime import datetime


dashboard2 = Blueprint(
    "dashboard2",
    __name__,
    template_folder="templates",
    static_folder="static",
    static_url_path="/dashboard2/static"
)


# =========================================================
# DATASET
# =========================================================

DATA_PATH = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "medtrace_common_dataset.json"
)


def load_dataset():
    with open(DATA_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


# =========================================================
# PAGE
# =========================================================

@dashboard2.route("/analytics")
def analytics():
    return render_template("analytics.html")


# =========================================================
# FILTER OPTIONS
# =========================================================

@dashboard2.route("/api/filter-options")
def filter_options():

    recalls = load_dataset().get("recalls", [])

    years = set()
    manufacturers = set()
    categories = set()
    severities = set()
    states = set()

    for recall in recalls:

        if recall.get("recall_date"):
            years.add(recall["recall_date"][:4])

        if recall.get("manufacturer"):
            manufacturers.add(recall["manufacturer"])

        if recall.get("drug_category"):
            categories.add(recall["drug_category"])

        if recall.get("severity"):
            severities.add(recall["severity"])

        for facility in recall.get("facilities", []):
            if facility.get("state"):
                states.add(facility["state"])

    return jsonify({
        "years": sorted(years),
        "manufacturers": sorted(manufacturers),
        "categories": sorted(categories),
        "severities": sorted(severities),
        "states": sorted(states)
    })


# =========================================================
# FILTER DATA
# =========================================================

def get_filtered_recalls():

    recalls = load_dataset().get("recalls", [])

    year = request.args.get("year", "All")
    manufacturer = request.args.get("manufacturer", "All")

    # Accept both names so the frontend cannot break the filter
    category = request.args.get(
        "category",
        request.args.get("drug_category", "All")
    )

    severity = request.args.get("severity", "All")
    state = request.args.get("state", "All")

    filtered = []

    for recall in recalls:

        # YEAR
        if year != "All":
            recall_date = recall.get("recall_date", "")

            if not recall_date.startswith(year):
                continue

        # MANUFACTURER
        if manufacturer != "All":
            if recall.get("manufacturer") != manufacturer:
                continue

        # DRUG CATEGORY
        if category != "All":
            if recall.get("drug_category") != category:
                continue

        # SEVERITY
        if severity != "All":
            if recall.get("severity") != severity:
                continue

        # STATE
        if state != "All":

            recall_states = {
                facility.get("state")
                for facility in recall.get("facilities", [])
                if facility.get("state")
            }

            if state not in recall_states:
                continue

        filtered.append(recall)

    return filtered


# =========================================================
# RECALL DURATION
# =========================================================

def get_duration(recall):

    recall_date = recall.get("recall_date")
    closed_date = recall.get("timeline", {}).get("closed")

    if not recall_date or not closed_date:
        return None

    try:

        start = datetime.strptime(
            recall_date,
            "%Y-%m-%d"
        )

        end = datetime.strptime(
            closed_date,
            "%Y-%m-%d"
        )

        return (end - start).days

    except (ValueError, TypeError):

        return None


# =========================================================
# ANALYTICS API
# =========================================================

@dashboard2.route("/api/analytics")
def analytics_api():

    recalls = get_filtered_recalls()

    total = len(recalls)


    # =====================================================
    # TOP RECALL REASONS
    # =====================================================

    reasons = Counter(
        recall.get("reason")
        for recall in recalls
        if recall.get("reason")
    )

    top_reasons = {
        "labels": list(reasons.keys()),
        "values": list(reasons.values())
    }


    # =====================================================
    # MONTHLY TREND
    # =====================================================

    months = Counter()

    for recall in recalls:

        date = recall.get("recall_date")

        if date:
            months[date[:7]] += 1

    monthly = sorted(months.items())

    monthly_trend = {
        "labels": [item[0] for item in monthly],
        "values": [item[1] for item in monthly]
    }


    # =====================================================
    # MANUFACTURER TREND
    # =====================================================

    manufacturers = Counter(
        recall.get("manufacturer")
        for recall in recalls
        if recall.get("manufacturer")
    )

    manufacturer_trend = {
        "labels": list(manufacturers.keys()),
        "values": list(manufacturers.values())
    }


    # =====================================================
    # DRUG CATEGORY %
    # =====================================================

    categories = Counter(
        recall.get("drug_category")
        for recall in recalls
        if recall.get("drug_category")
    )

    category_percentages = {}

    if total > 0:

        for category, count in categories.items():

            category_percentages[category] = round(
                (count / total) * 100,
                1
            )

    drug_category = {
        "labels": list(category_percentages.keys()),
        "values": list(category_percentages.values())
    }


    # =====================================================
    # AVERAGE RECALL DURATION
    # =====================================================

    durations = []

    for recall in recalls:

        duration = get_duration(recall)

        if duration is not None:
            durations.append(duration)

    if durations:
        average_duration = round(
            sum(durations) / len(durations)
        )
    else:
        average_duration = 0


    # =====================================================
    # RECALL FREQUENCY
    # =====================================================

    recall_frequency = total


    # =====================================================
    # SEVERITY ANALYSIS
    # =====================================================

    severity_counts = Counter(
        recall.get("severity")
        for recall in recalls
        if recall.get("severity")
    )

    severity = {
        "labels": list(severity_counts.keys()),
        "values": list(severity_counts.values())
    }


    # =====================================================
    # HEATMAP
    # COUNT EACH RECALL ONCE PER STATE
    # =====================================================

    heatmap_data = defaultdict(
        lambda: {
            "Critical": 0,
            "Major": 0,
            "Minor": 0
        }
    )

    for recall in recalls:

        severity_value = recall.get("severity")

        if severity_value not in [
            "Critical",
            "Major",
            "Minor"
        ]:
            continue

        recall_states = {
            facility.get("state")
            for facility in recall.get("facilities", [])
            if facility.get("state")
        }

        for state_value in recall_states:

            heatmap_data[state_value][severity_value] += 1


    heatmap = []

    for state_name in sorted(heatmap_data):

        heatmap.append({
            "state": state_name,
            "Critical": heatmap_data[state_name]["Critical"],
            "Major": heatmap_data[state_name]["Major"],
            "Minor": heatmap_data[state_name]["Minor"]
        })


    # =====================================================
    # MANUFACTURER PERFORMANCE
    # =====================================================

    manufacturer_performance_data = defaultdict(
        lambda: {
            "recalls": 0,
            "critical": 0
        }
    )

    for recall in recalls:

        manufacturer = recall.get("manufacturer")

        if not manufacturer:
            continue

        manufacturer_performance_data[
            manufacturer
        ]["recalls"] += 1

        if recall.get("severity") == "Critical":

            manufacturer_performance_data[
                manufacturer
            ]["critical"] += 1


    manufacturer_performance = []

    for manufacturer in sorted(
        manufacturer_performance_data
    ):

        manufacturer_performance.append({
            "manufacturer": manufacturer,
            "recalls": manufacturer_performance_data[
                manufacturer
            ]["recalls"],
            "critical": manufacturer_performance_data[
                manufacturer
            ]["critical"]
        })


    # =====================================================
    # INSIGHTS
    # =====================================================

    insights = []

    if total > 0:

        # Most common reason
        if reasons:

            reason, count = reasons.most_common(1)[0]

            percentage = round(
                (count / total) * 100
            )

            insights.append(
                f"{reason} is the most common recall reason, "
                f"accounting for {percentage}% of recalls."
            )


        # Manufacturer with most recalls
        if manufacturers:

            manufacturer, count = (
                manufacturers.most_common(1)[0]
            )

            insights.append(
                f"{manufacturer} has the highest number of "
                f"recalls with {count} recorded cases."
            )


        # Largest drug category
        if categories:

            category, count = (
                categories.most_common(1)[0]
            )

            percentage = round(
                (count / total) * 100
            )

            insights.append(
                f"{category} accounts for "
                f"{percentage}% of recalls."
            )


        # Most common severity
        if severity_counts:

            common_severity, count = (
                severity_counts.most_common(1)[0]
            )

            percentage = round(
                (count / total) * 100
            )

            insights.append(
                f"{common_severity} recalls are the most "
                f"frequent severity level, representing "
                f"{percentage}% of recalls."
            )


    # =====================================================
    # FINAL RESPONSE
    # =====================================================

    return jsonify({

        "top_reasons": top_reasons,

        "monthly_trend": monthly_trend,

        "manufacturer_trend": manufacturer_trend,

        "drug_category": drug_category,

        "average_duration": average_duration,

        "recall_frequency": recall_frequency,

        "heatmap": heatmap,

        "manufacturer_performance":
            manufacturer_performance,

        "severity": severity,

        "insights": insights

    })