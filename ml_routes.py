# ==================================================
# MEDTRACE
# MACHINE LEARNING API
# ==================================================

from flask import Blueprint, jsonify
import json
import os
import pickle
import pandas as pd

from ml_model.feature_engineering import (
    prepare_recall_dataframe
)


# --------------------------------------------------
# BLUEPRINT
# --------------------------------------------------

ml_routes = Blueprint(
    "ml_routes",
    __name__
)


# --------------------------------------------------
# FILE PATHS
# --------------------------------------------------

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

DATA_FILE = os.path.join(
    BASE_DIR,
    "data",
    "medtrace_common_dataset.json"
)

MODEL_FILE = os.path.join(
    BASE_DIR,
    "ml_model",
    "recall_delay_model.pkl"
)

METADATA_FILE = os.path.join(
    BASE_DIR,
    "ml_model",
    "model_metadata.json"
)

# Future recall model
FUTURE_MODEL_FILE = os.path.join(
    BASE_DIR,
    "ml_model",
    "future_recall_model.pkl"
)

FUTURE_METADATA_FILE = os.path.join(
    BASE_DIR,
    "ml_model",
    "future_recall_metadata.json"
)


# --------------------------------------------------
# LOAD DATA
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
# LOAD DELAY MODEL
# --------------------------------------------------

def load_model():

    with open(
        MODEL_FILE,
        "rb"
    ) as file:

        return pickle.load(file)


# --------------------------------------------------
# LOAD DELAY MODEL METADATA
# --------------------------------------------------

def load_metadata():

    try:

        with open(
            METADATA_FILE,
            "r",
            encoding="utf-8"
        ) as file:

            return json.load(file)

    except Exception:

        return {}


# --------------------------------------------------
# LOAD FUTURE RECALL MODEL
# --------------------------------------------------

def load_future_model():

    with open(
        FUTURE_MODEL_FILE,
        "rb"
    ) as file:

        return pickle.load(file)


# --------------------------------------------------
# LOAD FUTURE RECALL METADATA
# --------------------------------------------------

def load_future_metadata():

    try:

        with open(
            FUTURE_METADATA_FILE,
            "r",
            encoding="utf-8"
        ) as file:

            return json.load(file)

    except Exception:

        return {}


# --------------------------------------------------
# HUMAN-READABLE FEATURE NAME
# --------------------------------------------------

def format_feature_name(
    feature_name
):

    name = feature_name

    if "__" in name:

        name = name.split(
            "__",
            1
        )[1]

    replacements = {

        "complaint_count":
            "Complaint Count",

        "previous_recall_count":
            "Previous Recall History",

        "production_volume":
            "Production Volume",

        "storage_violations":
            "Storage Violations",

        "manufacturing_delays":
            "Manufacturing Delays",

        "facility_count":
            "Affected Facility Count",

        "distribution_volume":
            "Distribution Volume",

        "historical_recall_count":
            "Historical Recall Count",

        "severity_Critical":
            "Critical Severity",

        "severity_Major":
            "Major Severity",

        "severity_Minor":
            "Minor Severity",

        "reason_Contamination":
            "Contamination",

        "reason_Incorrect Dosage":
            "Incorrect Dosage",

        "reason_Mislabeling":
            "Mislabeling",

        "reason_Stability Failure":
            "Stability Failure",

        "reason_Packaging":
            "Packaging",

        "drug_category_Antibiotic":
            "Antibiotic",

        "drug_category_Analgesic":
            "Analgesic",

        "drug_category_Antidiabetic":
            "Antidiabetic",

        "drug_category_Antihistamine":
            "Antihistamine",

        "drug_category_Cardiovascular":
            "Cardiovascular",

        "drug_category_Gastrointestinal":
            "Gastrointestinal"
    }

    return replacements.get(
        name,
        name.replace(
            "_",
            " "
        ).title()
    )


# --------------------------------------------------
# ML FEATURE CONTRIBUTIONS
# --------------------------------------------------

def get_feature_contributions(
    model,
    dataframe
):

    try:

        preprocessor = (
            model.named_steps[
                "preprocessor"
            ]
        )

        classifier = (
            model.named_steps[
                "classifier"
            ]
        )

        transformed = (
            preprocessor.transform(
                dataframe
            )
        )

        feature_names = (
            preprocessor
            .get_feature_names_out()
        )

        coefficients = (
            classifier.coef_[0]
        )

        if hasattr(
            transformed,
            "toarray"
        ):

            transformed = (
                transformed.toarray()
            )

        values = transformed[0]

        contributions = []

        for index, feature_name in enumerate(
            feature_names
        ):

            contribution = (
                float(values[index])
                *
                float(coefficients[index])
            )

            if abs(contribution) < 0.05:

                continue

            contributions.append({

                "feature":
                    format_feature_name(
                        feature_name
                    ),

                "contribution":
                    round(
                        contribution,
                        3
                    ),

                "direction":
                    (
                        "Increases delay risk"
                        if contribution > 0
                        else
                        "Reduces delay risk"
                    )
            })

        contributions.sort(

            key=lambda item:
                abs(
                    item["contribution"]
                ),

            reverse=True
        )

        return contributions[:6]

    except Exception as e:

        print(
            "Explanation error:",
            e
        )

        return []


# ==================================================
# EXISTING MODEL
# PREDICT DELAYED RESOLUTION
# ==================================================

@ml_routes.route(
    "/api/ml/predict/<recall_id>"
)
def predict_recall(
    recall_id
):

    try:

        recalls = load_data()

        recall = next(

            (
                item
                for item in recalls
                if item.get(
                    "recall_id"
                ) == recall_id
            ),

            None
        )

        if recall is None:

            return jsonify({
                "error":
                    "Recall not found"
            }), 404

        dataframe = (
            prepare_recall_dataframe(
                [recall]
            )
        )

        model = load_model()

        prediction = (
            model.predict(
                dataframe
            )[0]
        )

        probability = (
            model.predict_proba(
                dataframe
            )[0][1]
        )

        if prediction == 1:

            prediction_label = (
                "Delayed Resolution"
            )

        else:

            prediction_label = (
                "On-time Resolution"
            )

        if probability >= 0.70:

            risk_level = "High"

        elif probability >= 0.40:

            risk_level = "Medium"

        else:

            risk_level = "Low"

        explanations = (
            get_feature_contributions(
                model,
                dataframe
            )
        )

        return jsonify({

            "recall_id":
                recall["recall_id"],

            "medicine":
                recall.get(
                    "medicine",
                    "Unknown"
                ),

            "prediction":
                prediction_label,

            "probability":
                round(
                    float(probability),
                    4
                ),

            "probability_percentage":
                round(
                    float(probability) * 100,
                    2
                ),

            "risk_level":
                risk_level,

            "model":
                "Logistic Regression",

            "target":
                "Delayed recall resolution",

            "explanation":
                explanations

        })

    except Exception as e:

        return jsonify({

            "error":
                "ML prediction failed",

            "details":
                str(e)

        }), 500


# ==================================================
# EXISTING MODEL PERFORMANCE
# ==================================================

@ml_routes.route(
    "/api/ml/model-info"
)
def model_info():

    metadata = load_metadata()

    return jsonify(
        metadata
    )


# ==================================================
# FUTURE RECALL PREDICTION
# ==================================================

@ml_routes.route(
    "/api/ml/future-recall-risk"
)
def future_recall_risk():

    try:

        recalls = load_data()

        model = load_future_model()

        results = []

        # ------------------------------------------
        # Group current records by medicine and
        # manufacturer
        # ------------------------------------------

        grouped = {}

        for recall in recalls:

            medicine = recall.get(
                "medicine",
                "Unknown"
            )

            manufacturer = recall.get(
                "manufacturer",
                "Unknown"
            )

            key = (
                medicine,
                manufacturer
            )

            if key not in grouped:

                grouped[key] = []

            grouped[key].append(
                recall
            )

        # ------------------------------------------
        # Create prediction input
        # ------------------------------------------

        for (
            medicine,
            manufacturer
        ), medicine_recalls in grouped.items():

            latest = medicine_recalls[-1]

            batch = latest.get(
                "batch_details",
                {}
            )

            facilities = latest.get(
                "facilities",
                []
            )

            ml_features = latest.get(
                "ml_features",
                {}
            )

            # Historical recall count
            historical_recall_count = len(
                medicine_recalls
            )

            # Aggregate complaint count
            complaint_count = sum(
                float(
                    item.get(
                        "ml_features",
                        {}
                    ).get(
                        "complaint_count",
                        0
                    )
                )
                for item in medicine_recalls
            )

            previous_recall_count = int(
                ml_features.get(
                    "previous_recall_count",
                    0
                )
            )

            production_volume = float(
                ml_features.get(
                    "production_volume",
                    batch.get(
                        "units_produced",
                        0
                    )
                )
            )

            storage_violations = float(
                ml_features.get(
                    "storage_violations",
                    0
                )
            )

            manufacturing_delays = float(
                ml_features.get(
                    "manufacturing_delays",
                    0
                )
            )

            facility_count = len(
                facilities
            )

            distribution_volume = float(
                batch.get(
                    "units_distributed",
                    0
                )
            )

            drug_category = latest.get(
                "drug_category",
                "Other"
            )

            # --------------------------------------
            # Create dataframe in the exact format
            # expected by the trained model
            # --------------------------------------

            input_data = pd.DataFrame([
                {
                    "historical_recall_count":
                        historical_recall_count,

                    "complaint_count":
                        complaint_count,

                    "previous_recall_count":
                        previous_recall_count,

                    "production_volume":
                        production_volume,

                    "storage_violations":
                        storage_violations,

                    "manufacturing_delays":
                        manufacturing_delays,

                    "facility_count":
                        facility_count,

                    "distribution_volume":
                        distribution_volume,

                    "drug_category":
                        drug_category,

                    "manufacturer":
                        manufacturer
                }
            ])

            prediction = model.predict(
                input_data
            )[0]

            probability = model.predict_proba(
                input_data
            )[0][1]

            if probability >= 0.70:

                risk_level = "High"

            elif probability >= 0.40:

                risk_level = "Medium"

            else:

                risk_level = "Low"

            if prediction == 1:

                prediction_label = (
                    "Higher Recall Likelihood"
                )

            else:

                prediction_label = (
                    "Lower Recall Likelihood"
                )

            results.append({

                "medicine":
                    medicine,

                "manufacturer":
                    manufacturer,

                "drug_category":
                    drug_category,

                "prediction":
                    prediction_label,

                "probability":
                    round(
                        float(probability),
                        4
                    ),

                "probability_percentage":
                    round(
                        float(probability) * 100,
                        2
                    ),

                "risk_level":
                    risk_level,

                "historical_recall_count":
                    historical_recall_count
            })

        # ------------------------------------------
        # Highest probability first
        # ------------------------------------------

        results.sort(

            key=lambda item:
                item["probability"],

            reverse=True
        )

        return jsonify({

            "model":
                "Logistic Regression",

            "target":
                "Future recall occurrence",

            "data_type":
                "Prototype prediction using simulated historical patterns",

            "predictions":
                results

        })

    except Exception as e:

        return jsonify({

            "error":
                "Future recall prediction failed",

            "details":
                str(e)

        }), 500


# ==================================================
# FUTURE RECALL MODEL PERFORMANCE
# ==================================================

@ml_routes.route(
    "/api/ml/future-recall-model-info"
)
def future_recall_model_info():

    metadata = load_future_metadata()

    return jsonify(
        metadata
    )