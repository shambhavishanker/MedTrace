from flask import Blueprint, jsonify, render_template, request
import json
from pathlib import Path


dashboard1 = Blueprint(
    "dashboard1",
    __name__,
    template_folder="templates",
    static_folder="static",
    static_url_path="/dashboard1/static"
)


# --------------------------------------------------
# FILE PATH
# --------------------------------------------------

DATA_FILE = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "medtrace_common_dataset.json"
)


# --------------------------------------------------
# LOAD COMMON MEDTRACE DATASET
# --------------------------------------------------

def load_data():

    with open(
        DATA_FILE,
        "r",
        encoding="utf-8"
    ) as file:

        data = json.load(file)

    return data["recalls"]


# --------------------------------------------------
# BUILD INVESTIGATION DETAILS
# --------------------------------------------------

def build_investigation(recall):

    reason = recall.get(
        "reason",
        "Quality issue"
    )

    severity = recall.get(
        "severity",
        "Unknown"
    )

    medicine = recall.get(
        "medicine",
        "Medicine"
    )

    manufacturer = recall.get(
        "manufacturer",
        "Manufacturer"
    )

    batch = recall.get(
        "batch",
        "Unknown"
    )

    investigation = {

        "status": "Under Investigation",

        "primary_finding": (
            f"{reason} identified in batch {batch} "
            f"of {medicine} manufactured by "
            f"{manufacturer}."
        ),

        "investigation_source":
            "Quality Control Testing",

        "affected_stage":
            "Manufacturing",

        "evidence_reviewed": [
            "Batch quality test results",
            "Manufacturing records",
            "Distribution records"
        ],

        "assessment": (
            f"The recall is classified as "
            f"{severity} severity. Further review "
            f"of the affected batch and recovery "
            f"status is required."
        ),

        "recommended_action": (
            "Continue stock recovery, verify "
            "affected facility inventory, and "
            "complete the quality investigation."
        )
    }

    return investigation


# --------------------------------------------------
# DASHBOARD 1 HOME
# --------------------------------------------------

@dashboard1.route("/investigation")
def dashboard():

    return render_template(
        "dashboard1.html"
    )


# --------------------------------------------------
# GET ALL RECALLS
# --------------------------------------------------

@dashboard1.route("/api/recalls")
def get_recalls():

    try:

        data = load_data()

        return jsonify(data)

    except Exception as e:

        return jsonify({
            "error": "Unable to load dataset",
            "details": str(e)
        }), 500


# --------------------------------------------------
# GET ONE COMPLETE RECALL
# --------------------------------------------------

@dashboard1.route("/api/recalls/<recall_id>")
def get_recall(recall_id):

    try:

        data = load_data()

        for recall in data:

            if recall["recall_id"] == recall_id:

                # Make a copy so the original
                # dataset is NOT modified.
                recall_data = dict(recall)

                # Generate investigation details
                # for Dashboard 1 only.
                recall_data["investigation"] = (
                    build_investigation(recall)
                )

                return jsonify(recall_data)

        return jsonify({
            "error": "Recall not found"
        }), 404

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


# --------------------------------------------------
# GET BATCH DETAILS
# --------------------------------------------------

@dashboard1.route("/api/recalls/<recall_id>/batch")
def get_batch_details(recall_id):

    try:

        data = load_data()

        for recall in data:

            if recall["recall_id"] == recall_id:

                return jsonify({

                    "recall_id":
                        recall["recall_id"],

                    "batch":
                        recall["batch"],

                    "batch_details":
                        recall["batch_details"]

                })

        return jsonify({
            "error": "Recall not found"
        }), 404

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


# --------------------------------------------------
# GET FACILITY DETAILS
# --------------------------------------------------

@dashboard1.route("/api/recalls/<recall_id>/facilities")
def get_facilities(recall_id):

    try:

        data = load_data()

        for recall in data:

            if recall["recall_id"] == recall_id:

                return jsonify({

                    "recall_id":
                        recall["recall_id"],

                    "facilities":
                        recall.get(
                            "facilities",
                            []
                        )

                })

        return jsonify({
            "error": "Recall not found"
        }), 404

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


# --------------------------------------------------
# GET RECALL TIMELINE
# --------------------------------------------------

@dashboard1.route("/api/recalls/<recall_id>/timeline")
def get_timeline(recall_id):

    try:

        data = load_data()

        for recall in data:

            if recall["recall_id"] == recall_id:

                return jsonify({

                    "recall_id":
                        recall["recall_id"],

                    "timeline":
                        recall.get(
                            "timeline",
                            {}
                        )

                })

        return jsonify({
            "error": "Recall not found"
        }), 404

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


# --------------------------------------------------
# GET INVESTIGATION DETAILS
# --------------------------------------------------

@dashboard1.route(
    "/api/recalls/<recall_id>/investigation"
)
def get_investigation(recall_id):

    try:

        data = load_data()

        for recall in data:

            if recall["recall_id"] == recall_id:

                investigation = build_investigation(
                    recall
                )

                return jsonify({

                    "recall_id":
                        recall["recall_id"],

                    "investigation":
                        investigation

                })

        return jsonify({
            "error": "Recall not found"
        }), 404

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


# --------------------------------------------------
# SEARCH RECALLS
# --------------------------------------------------

@dashboard1.route("/api/search")
def search_recalls():

    try:

        search_value = request.args.get(
            "q",
            ""
        ).strip().lower()

        data = load_data()

        if not search_value:

            return jsonify(data)

        results = []

        for recall in data:

            recall_id = recall.get(
                "recall_id",
                ""
            ).lower()

            medicine = recall.get(
                "medicine",
                ""
            ).lower()

            batch = recall.get(
                "batch",
                ""
            ).lower()

            manufacturer = recall.get(
                "manufacturer",
                ""
            ).lower()

            if (

                search_value in recall_id

                or search_value in medicine

                or search_value in batch

                or search_value in manufacturer

            ):

                results.append(recall)

        return jsonify(results)

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500
