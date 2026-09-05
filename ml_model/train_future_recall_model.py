# ==================================================
# MEDTRACE
# FUTURE RECALL PREDICTION MODEL
# ==================================================

import os
import pickle
import json
import random

import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report
)

random.seed(42)

NUMERIC_FEATURES = [
    "historical_recall_count",
    "complaint_count",
    "previous_recall_count",
    "production_volume",
    "storage_violations",
    "manufacturing_delays",
    "facility_count",
    "distribution_volume"
]

CATEGORICAL_FEATURES = [
    "drug_category",
    "manufacturer"
]

ALL_FEATURES = (
    NUMERIC_FEATURES +
    CATEGORICAL_FEATURES
)


def generate_future_recall_data(
    number_of_records=500
):
    """
    Generate simulated historical drug-period records.

    Each row represents a medicine/manufacturer
    during a historical period.

    future_recall:
        1 = recall occurred in the subsequent period
        0 = no recall occurred in the subsequent period
    """

    rows = []

    manufacturers = [
        "ABC Pharma",
        "XYZ Pharma",
        "MedCare Labs",
        "HealthFirst Pharma",
        "Nova Healthcare"
    ]

    categories = [
        "Antibiotic",
        "Analgesic",
        "Antidiabetic",
        "Antihistamine",
        "Cardiovascular",
        "Gastrointestinal"
    ]

    for _ in range(number_of_records):

        manufacturer = random.choice(
            manufacturers
        )

        category = random.choice(
            categories
        )

        historical_recall_count = random.randint(
            0, 5
        )

        complaint_count = random.randint(
            0, 30
        )

        previous_recall_count = random.randint(
            0, 4
        )

        production_volume = random.randint(
            5000, 50000
        )

        storage_violations = random.randint(
            0, 6
        )

        manufacturing_delays = random.randint(
            0, 5
        )

        facility_count = random.randint(
            1, 8
        )

        distribution_volume = int(
            production_volume *
            random.uniform(0.55, 0.95)
        )

        # ------------------------------------------
        # Simulated historical risk pattern
        # ------------------------------------------

        risk_signal = 0

        if historical_recall_count >= 3:
            risk_signal += 3
        elif historical_recall_count >= 1:
            risk_signal += 1

        if previous_recall_count >= 2:
            risk_signal += 2
        elif previous_recall_count == 1:
            risk_signal += 1

        if complaint_count >= 15:
            risk_signal += 2
        elif complaint_count >= 8:
            risk_signal += 1

        if storage_violations >= 3:
            risk_signal += 2
        elif storage_violations >= 1:
            risk_signal += 1

        if manufacturing_delays >= 2:
            risk_signal += 2
        elif manufacturing_delays == 1:
            risk_signal += 1

        if category == "Antibiotic":
            risk_signal += 1

        if category == "Antidiabetic":
            risk_signal += 1

        if manufacturer in [
            "ABC Pharma",
            "XYZ Pharma"
        ]:
            risk_signal += 1

        # Small random variation
        risk_signal += random.choice(
            [-1, 0, 0, 0, 1]
        )

        # Target:
        # Was a recall observed in the
        # subsequent historical period?
        future_recall = (
            1
            if risk_signal >= 6
            else 0
        )

        rows.append({
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
                category,

            "manufacturer":
                manufacturer,

            "future_recall":
                future_recall
        })

    return pd.DataFrame(rows)


def train_model():

    print("\n======================================")
    print("MEDTRACE FUTURE RECALL ML MODEL")
    print("======================================\n")

    df = generate_future_recall_data(500)

    print(
        f"Training records: {len(df)}"
    )

    X = df[ALL_FEATURES]

    y = df["future_recall"]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y
    )

    # ------------------------------------------
    # Preprocessing
    # ------------------------------------------

    preprocessor = ColumnTransformer(
        transformers=[

            (
                "numeric",

                StandardScaler(),

                NUMERIC_FEATURES
            ),

            (
                "categorical",

                OneHotEncoder(
                    handle_unknown="ignore"
                ),

                CATEGORICAL_FEATURES
            )
        ]
    )

    # ------------------------------------------
    # Logistic Regression
    # ------------------------------------------

    model = Pipeline(
        steps=[

            (
                "preprocessor",

                preprocessor
            ),

            (
                "classifier",

                LogisticRegression(
                    max_iter=1000
                )
            )
        ]
    )

    model.fit(
        X_train,
        y_train
    )

    # ------------------------------------------
    # Evaluation
    # ------------------------------------------

    predictions = model.predict(
        X_test
    )

    accuracy = accuracy_score(
        y_test,
        predictions
    )

    precision = precision_score(
        y_test,
        predictions,
        zero_division=0
    )

    recall = recall_score(
        y_test,
        predictions,
        zero_division=0
    )

    f1 = f1_score(
        y_test,
        predictions,
        zero_division=0
    )

    print("\n--------------------------------------")
    print("FUTURE RECALL MODEL PERFORMANCE")
    print("--------------------------------------")

    print(
        f"Accuracy : {accuracy:.2f}"
    )

    print(
        f"Precision: {precision:.2f}"
    )

    print(
        f"Recall   : {recall:.2f}"
    )

    print(
        f"F1 Score : {f1:.2f}"
    )

    print("\nClassification Report:\n")

    print(
        classification_report(
            y_test,
            predictions,
            zero_division=0
        )
    )

    # ------------------------------------------
    # Save model
    # ------------------------------------------

    base_dir = os.path.dirname(
        os.path.abspath(__file__)
    )

    model_path = os.path.join(
        base_dir,
        "future_recall_model.pkl"
    )

    with open(
        model_path,
        "wb"
    ) as file:

        pickle.dump(
            model,
            file
        )

    # ------------------------------------------
    # Save metadata
    # ------------------------------------------

    metadata = {

        "model":
            "Logistic Regression",

        "target":
            "Future recall occurrence",

        "training_records":
            int(len(df)),

        "test_records":
            int(len(X_test)),

        "accuracy":
            round(
                float(accuracy),
                4
            ),

        "precision":
            round(
                float(precision),
                4
            ),

        "recall":
            round(
                float(recall),
                4
            ),

        "f1_score":
            round(
                float(f1),
                4
            ),

        "features":
            ALL_FEATURES,

        "data_type":
            "Simulated historical drug-period data",

        "note":
            "Prototype model estimating future recall likelihood from historical patterns."
    }

    metadata_path = os.path.join(
        base_dir,
        "future_recall_metadata.json"
    )

    with open(
        metadata_path,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            metadata,
            file,
            indent=4
        )

    print("--------------------------------------")

    print(
        f"Model saved to:\n{model_path}"
    )

    print(
        f"Metadata saved to:\n{metadata_path}"
    )

    print("--------------------------------------\n")


if __name__ == "__main__":
    train_model()