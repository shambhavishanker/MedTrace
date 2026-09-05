# ==================================================
# MEDTRACE
# ML FEATURE ENGINEERING
# ==================================================

import pandas as pd


# --------------------------------------------------
# FEATURES USED BY THE MODEL
# --------------------------------------------------

NUMERIC_FEATURES = [
    "complaint_count",
    "previous_recall_count",
    "production_volume",
    "storage_violations",
    "manufacturing_delays",
    "facility_count",
    "distribution_volume"
]


CATEGORICAL_FEATURES = [
    "severity",
    "reason",
    "drug_category"
]


# --------------------------------------------------
# PREPARE RAW RECALL DATA
# --------------------------------------------------

def prepare_recall_dataframe(recalls):

    rows = []

    for recall in recalls:

        batch = recall.get(
            "batch_details",
            {}
        )

        facilities = recall.get(
            "facilities",
            []
        )

        ml_features = recall.get(
            "ml_features",
            {}
        )

        distributed = float(
            batch.get(
                "units_distributed",
                0
            )
        )

        rows.append({

            "severity":
                recall.get(
                    "severity",
                    "Minor"
                ),

            "reason":
                recall.get(
                    "reason",
                    "Packaging"
                ),

            "drug_category":
                recall.get(
                    "drug_category",
                    "Other"
                ),

            "complaint_count":
                float(
                    ml_features.get(
                        "complaint_count",
                        0
                    )
                ),

            "previous_recall_count":
                float(
                    ml_features.get(
                        "previous_recall_count",
                        0
                    )
                ),

            "production_volume":
                float(
                    ml_features.get(
                        "production_volume",
                        batch.get(
                            "units_produced",
                            0
                        )
                    )
                ),

            "storage_violations":
                float(
                    ml_features.get(
                        "storage_violations",
                        0
                    )
                ),

            "manufacturing_delays":
                float(
                    ml_features.get(
                        "manufacturing_delays",
                        0
                    )
                ),

            "facility_count":
                len(facilities),

            "distribution_volume":
                distributed
        })

    return pd.DataFrame(rows)