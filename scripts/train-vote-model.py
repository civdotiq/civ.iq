#!/usr/bin/env python3
"""
Vote Prediction Model Training Script

Trains an XGBoost classifier to predict how a legislator will vote on a
bill based on their donor profile. The model learns which funding patterns
predict which votes, including non-linear interactions.

Input:  training-data/vote-donor-records.json
Output: models/vote-prediction.onnx
        models/vote-prediction-metadata.json

Usage:  python scripts/train-vote-model.py
"""

import json
import sys
from datetime import datetime
from pathlib import Path

import numpy as np
import xgboost as xgb
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.metrics import accuracy_score, roc_auc_score, classification_report
from sklearn.preprocessing import LabelEncoder

try:
    import shap
    HAS_SHAP = True
except ImportError:
    HAS_SHAP = False

# ── Configuration ────────────────────────────────────────────────────

TRAINING_DATA_PATH = Path("training-data/vote-donor-records.json")
MODEL_OUTPUT_PATH = Path("models/vote-prediction.onnx")
METADATA_OUTPUT_PATH = Path("models/vote-prediction-metadata.json")

# 13 industry sectors in fixed order (must match TypeScript SECTOR_ORDER)
SECTOR_ORDER = [
    "Agribusiness",
    "Communications/Electronics",
    "Construction",
    "Defense",
    "Energy/Natural Resources",
    "Finance/Insurance/Real Estate",
    "Health",
    "Lawyers & Lobbyists",
    "Transportation",
    "Misc Business",
    "Labor",
    "Ideology/Single-Issue",
    "Other",
]

FEATURE_NAMES = (
    # 13 donor sector percentages
    [f"donor_pct_{s.lower().replace('/', '_').replace(' ', '_').replace('&', '')}" for s in SECTOR_ORDER]
    # Party (one-hot)
    + ["party_R", "party_D"]
    # Chamber
    + ["chamber_Senate"]
    # Years in office
    + ["years_in_office"]
    # 13 bill-affects-sector flags
    + [f"bill_affects_{s.lower().replace('/', '_').replace(' ', '_').replace('&', '')}" for s in SECTOR_ORDER]
    # Cosponsor count, sponsor same party
    + ["bill_cosponsor_count", "sponsor_same_party"]
    # Interaction features
    + ["donor_bill_overlap", "max_donor_sector_in_bill"]
)

PREDICTION_THRESHOLD = 0.6


# ── Data Loading ─────────────────────────────────────────────────────

def load_data():
    """Load and parse training data from JSON."""
    print(f"Loading training data from {TRAINING_DATA_PATH}...")
    with open(TRAINING_DATA_PATH) as f:
        records = json.load(f)

    print(f"Loaded {len(records)} records")
    return records


def build_features(records):
    """Build feature matrix and labels from raw records."""
    X = []
    y = []
    groups = []  # bioguideId for stratified splitting

    for record in records:
        features = []

        # 13 donor sector percentages
        donor_profile = record["donorProfile"]
        for sector in SECTOR_ORDER:
            features.append(donor_profile.get(sector, 0.0))

        # Party one-hot
        party = record["party"]
        features.append(1.0 if party == "R" else 0.0)
        features.append(1.0 if party == "D" else 0.0)

        # Chamber
        features.append(1.0 if record["chamber"] == "Senate" else 0.0)

        # Years in office
        features.append(float(record.get("yearsInOffice", 0)))

        # 13 bill-affects-sector flags
        bill_sectors = set(record.get("billSectors", []))
        for sector in SECTOR_ORDER:
            features.append(1.0 if sector in bill_sectors else 0.0)

        # Cosponsor count
        features.append(float(record.get("cosponsorCount", 0)))

        # Sponsor same party
        features.append(1.0 if record.get("sponsorParty") == party else 0.0)

        # Interaction features
        donor_bill_overlap = sum(
            donor_profile.get(s, 0.0) for s in bill_sectors if s in SECTOR_ORDER
        )
        features.append(donor_bill_overlap)

        max_donor_in_bill = max(
            (donor_profile.get(s, 0.0) for s in bill_sectors if s in SECTOR_ORDER),
            default=0.0,
        )
        features.append(max_donor_in_bill)

        X.append(features)
        y.append(1 if record["vote"] == "yea" else 0)
        groups.append(record["bioguideId"])

    return np.array(X), np.array(y), np.array(groups)


# ── Training ─────────────────────────────────────────────────────────

def train_model(X, y, groups):
    """Train XGBoost with stratified group k-fold cross-validation."""
    print(f"\nFeature matrix shape: {X.shape}")
    print(f"Label distribution: yea={np.sum(y == 1)}, nay={np.sum(y == 0)}")
    print(f"Unique legislators: {len(np.unique(groups))}")

    # Encode groups for stratification
    le = LabelEncoder()
    group_ids = le.fit_transform(groups)

    # Stratified split by legislator
    splitter = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=42)

    # Train/test split: use first fold for final evaluation
    train_idx, test_idx = next(splitter.split(X, y, group_ids))
    X_train, X_test = X[train_idx], X[test_idx]
    y_train, y_test = y[train_idx], y[test_idx]

    print(f"\nTrain set: {len(X_train)} records")
    print(f"Test set:  {len(X_test)} records")

    # Train XGBoost
    model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=5,
        eval_metric="logloss",
        random_state=42,
        use_label_encoder=False,
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    # Evaluate
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    y_pred = (y_pred_proba >= 0.5).astype(int)

    accuracy = accuracy_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_pred_proba)

    print(f"\n=== Model Performance ===")
    print(f"Accuracy: {accuracy:.4f}")
    print(f"AUC-ROC:  {auc:.4f}")
    print(f"\n{classification_report(y_test, y_pred, target_names=['nay', 'yea'])}")

    # Party-only baseline
    party_features = X_test[:, FEATURE_NAMES.index("party_R"):FEATURE_NAMES.index("party_D") + 1]
    party_model = xgb.XGBClassifier(n_estimators=50, max_depth=2, random_state=42, use_label_encoder=False)
    party_model.fit(
        X_train[:, FEATURE_NAMES.index("party_R"):FEATURE_NAMES.index("party_D") + 1],
        y_train,
        verbose=False,
    )
    party_accuracy = accuracy_score(y_test, party_model.predict(party_features))
    print(f"Party-only baseline accuracy: {party_accuracy:.4f}")
    print(f"Donor feature lift: +{(accuracy - party_accuracy) * 100:.1f} percentage points")

    # Feature importance
    importance = model.feature_importances_
    feature_ranking = sorted(
        zip(FEATURE_NAMES, importance),
        key=lambda x: x[1],
        reverse=True,
    )[:10]

    print(f"\n=== Top 10 Features ===")
    for name, imp in feature_ranking:
        print(f"  {name}: {imp:.4f}")

    # Compute SHAP values for per-prediction explanations
    shap_values_path = None
    if HAS_SHAP:
        print("\nComputing SHAP values...")
        explainer = shap.TreeExplainer(model)
        shap_vals = explainer.shap_values(X_test)
        # Save mean absolute SHAP values per feature for global importance
        mean_abs_shap = np.abs(shap_vals).mean(axis=0).tolist()
        shap_importance = sorted(
            zip(FEATURE_NAMES, mean_abs_shap),
            key=lambda x: x[1],
            reverse=True,
        )
        print("SHAP top 10:")
        for name, val in shap_importance[:10]:
            print(f"  {name}: {val:.4f}")

        # Save full SHAP values for the test set (enables per-prediction explanations)
        shap_values_path = Path("models/shap-values.json")
        shap_values_path.parent.mkdir(parents=True, exist_ok=True)
        with open(shap_values_path, "w") as f:
            json.dump({
                "featureNames": FEATURE_NAMES,
                "meanAbsShap": {name: float(val) for name, val in shap_importance},
                "expectedValue": float(explainer.expected_value),
            }, f, indent=2)
        print(f"SHAP values saved to {shap_values_path}")
    else:
        print("\nshap not installed — skipping SHAP analysis. Install with: pip install shap")
        shap_importance = None

    return model, {
        "accuracy": float(accuracy),
        "auc": float(auc),
        "party_accuracy": float(party_accuracy),
        "feature_ranking": feature_ranking,
        "shap_ranking": shap_importance,
        "training_records": len(X_train),
        "test_records": len(X_test),
    }


# ── Export ────────────────────────────────────────────────────────────

def export_model(model, metrics):
    """Export model to ONNX and save metadata."""
    # Create output directory
    MODEL_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    # Export to ONNX
    try:
        from onnxmltools import convert_xgboost
        from onnxmltools.convert.common.data_types import FloatTensorType

        initial_type = [("input", FloatTensorType([None, len(FEATURE_NAMES)]))]
        onnx_model = convert_xgboost(model, initial_types=initial_type)

        with open(MODEL_OUTPUT_PATH, "wb") as f:
            f.write(onnx_model.SerializeToString())

        model_size = MODEL_OUTPUT_PATH.stat().st_size
        print(f"\nONNX model saved to {MODEL_OUTPUT_PATH} ({model_size / 1024:.1f} KB)")
    except ImportError:
        print("\nWARNING: onnxmltools not installed. Saving XGBoost native format instead.")
        native_path = MODEL_OUTPUT_PATH.with_suffix(".json")
        model.save_model(str(native_path))
        print(f"XGBoost model saved to {native_path}")

    # Save metadata
    metadata = {
        "modelVersion": "1.0.0",
        "trainedAt": datetime.now().isoformat(),
        "trainingRecords": metrics["training_records"],
        "testAccuracy": metrics["accuracy"],
        "testAUC": metrics["auc"],
        "partyOnlyAccuracy": metrics["party_accuracy"],
        "featureNames": FEATURE_NAMES,
        "predictionThreshold": PREDICTION_THRESHOLD,
        "topFeatures": [
            {"feature": name, "importance": float(imp)}
            for name, imp in metrics["feature_ranking"]
        ],
    }

    # Include SHAP-based importance if available (more reliable than gain-based)
    if metrics.get("shap_ranking"):
        metadata["shapFeatures"] = [
            {"feature": name, "meanAbsShap": float(val)}
            for name, val in metrics["shap_ranking"]
        ]

    with open(METADATA_OUTPUT_PATH, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"Metadata saved to {METADATA_OUTPUT_PATH}")


# ── Main ──────────────────────────────────────────────────────────────

def main():
    if not TRAINING_DATA_PATH.exists():
        print(f"ERROR: Training data not found at {TRAINING_DATA_PATH}")
        print("Run 'npm run collect:training-data' first.")
        sys.exit(1)

    records = load_data()
    X, y, groups = build_features(records)
    model, metrics = train_model(X, y, groups)
    export_model(model, metrics)
    print("\nDone.")


if __name__ == "__main__":
    main()
