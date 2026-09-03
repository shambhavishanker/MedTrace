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
# DASHBOARD 1 HOME
# --------------------------------------------------

@dashboard1.route("/investigation")
def dashboard():

    return render_template("dashboard1.html")


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

                return jsonify(recall)

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

                    "recall_id": recall["recall_id"],

                    "batch": recall["batch"],

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
                        recall.get("facilities", [])

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
                        recall.get("timeline", {})

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

@dashboard1.route("/api/recalls/<recall_id>/investigation")
def get_investigation(recall_id):

    try:

        data = load_data()

        for recall in data:

            if recall["recall_id"] == recall_id:

                investigation = recall.get(
                    "investigation",
                    {
                        "status":
                            "Under Investigation",

                        "primary_finding":
                            "Investigation details are being reviewed.",

                        "investigation_source":
                            "Quality Control Testing",

                        "affected_stage":
                            "Manufacturing",

                        "evidence_reviewed": [

                            "Batch quality test results",

                            "Manufacturing records",

                            "Distribution records"

                        ],

                        "assessment":
                            "Further investigation required.",

                        "recommended_action":
                            "Continue facility-level recovery and quality investigation."
                    }
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