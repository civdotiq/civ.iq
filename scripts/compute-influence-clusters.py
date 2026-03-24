#!/usr/bin/env python3
"""
Influence Pattern Discovery — Offline Clustering

Discovers which legislators behave similarly based on shared funding sources,
regardless of party. Computes a donor similarity matrix, applies UMAP for
visualization, and HDBSCAN for cluster discovery.

Input:  training-data/donor-profiles.json (from Phase 1)
Output: src/lib/intelligence/clusters/influence-clusters.json

Usage:  python scripts/compute-influence-clusters.py
"""

import json
import sys
from datetime import datetime
from pathlib import Path

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import normalize

try:
    import umap
except ImportError:
    print("ERROR: umap-learn not installed. Run: pip install umap-learn")
    sys.exit(1)

try:
    import hdbscan
except ImportError:
    print("ERROR: hdbscan not installed. Run: pip install hdbscan")
    sys.exit(1)


# ── Configuration ────────────────────────────────────────────────────

INPUT_PATH = Path("training-data/donor-profiles.json")
OUTPUT_PATH = Path("src/lib/intelligence/clusters/influence-clusters.json")

# 13 IndustrySector values in fixed order
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


def main():
    if not INPUT_PATH.exists():
        print(f"ERROR: Donor profiles not found at {INPUT_PATH}")
        print("Run 'npm run collect:training-data' first.")
        sys.exit(1)

    # 1. Load donor profiles
    print(f"Loading donor profiles from {INPUT_PATH}...")
    with open(INPUT_PATH) as f:
        profiles = json.load(f)

    print(f"Loaded {len(profiles)} legislator profiles")

    if len(profiles) < 10:
        print("ERROR: Too few profiles for clustering")
        sys.exit(1)

    # 2. Build feature matrix (N × 13)
    X = np.array([
        [p["sectorDistribution"].get(s, 0) for s in SECTOR_ORDER]
        for p in profiles
    ])
    X = normalize(X, norm="l1", axis=1)  # Ensure each row sums to 1

    print(f"Feature matrix shape: {X.shape}")

    # 3. UMAP dimensionality reduction to 2D (for visualization)
    print("Running UMAP...")
    reducer = umap.UMAP(
        n_components=2,
        metric="cosine",
        random_state=42,
        n_neighbors=15,
        min_dist=0.1,
    )
    coords_2d = reducer.fit_transform(X)
    print(f"UMAP complete: {coords_2d.shape}")

    # Verify no NaN in coordinates
    if np.any(np.isnan(coords_2d)):
        print("WARNING: NaN values in UMAP coordinates — replacing with 0")
        coords_2d = np.nan_to_num(coords_2d, 0.0)

    # 4. HDBSCAN clustering on full 13-dim space (not 2D projection)
    print("Running HDBSCAN...")
    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=5,
        min_samples=3,
        metric="euclidean",  # On L1-normalized vectors
    )
    labels = clusterer.fit_predict(X)

    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    n_noise = int(np.sum(labels == -1))
    print(f"Found {n_clusters} clusters, {n_noise} noise points")

    # 5. Compute cluster metadata
    clusters = {}
    for cluster_id in sorted(set(labels)):
        if cluster_id == -1:
            continue  # Skip noise

        members = [i for i, l in enumerate(labels) if l == cluster_id]
        member_profiles = X[members]
        mean_profile = member_profiles.mean(axis=0)
        top_sectors_idx = np.argsort(mean_profile)[::-1][:3]
        top_sectors = [
            {"sector": SECTOR_ORDER[i], "meanPct": round(float(mean_profile[i]), 4)}
            for i in top_sectors_idx
        ]

        # Party composition
        parties = [profiles[i]["party"] for i in members]
        party_counts = {
            "D": parties.count("D"),
            "R": parties.count("R"),
            "I": parties.count("I"),
        }

        is_cross_party = party_counts["D"] > 0 and party_counts["R"] > 0

        clusters[int(cluster_id)] = {
            "memberCount": len(members),
            "topSectors": top_sectors,
            "partyComposition": party_counts,
            "isCrossParty": is_cross_party,
        }

    # Count cross-party clusters
    cross_party = sum(1 for c in clusters.values() if c["isCrossParty"])
    print(f"\nCross-party clusters: {cross_party}/{n_clusters}")

    # Print cluster summary
    for cid, meta in sorted(clusters.items()):
        sectors = ", ".join(s["sector"] for s in meta["topSectors"])
        party_str = f'{meta["partyComposition"]["D"]}D, {meta["partyComposition"]["R"]}R'
        if meta["partyComposition"]["I"] > 0:
            party_str += f', {meta["partyComposition"]["I"]}I'
        cross = " [CROSS-PARTY]" if meta["isCrossParty"] else ""
        print(f"  Cluster {cid}: {meta['memberCount']} members ({party_str}){cross} — {sectors}")

    # 6. Export
    output = {
        "generatedAt": datetime.now().isoformat(),
        "legislatorCount": len(profiles),
        "clusterCount": n_clusters,
        "noisePoints": n_noise,
        "crossPartyClusters": cross_party,
        "legislators": [
            {
                "bioguideId": profiles[i]["bioguideId"],
                "party": profiles[i]["party"],
                "chamber": profiles[i]["chamber"],
                "state": profiles[i]["state"],
                "x": round(float(coords_2d[i][0]), 4),
                "y": round(float(coords_2d[i][1]), 4),
                "clusterId": int(labels[i]),
                "topSectors": profiles[i].get("topSectors", [])[:3],
            }
            for i in range(len(profiles))
        ],
        "clusters": clusters,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, separators=(",", ":"))

    file_size = OUTPUT_PATH.stat().st_size
    print(f"\nOutput: {OUTPUT_PATH} ({file_size / 1024:.1f} KB)")

    # Validate
    if n_clusters < 3:
        print("WARNING: Fewer than 3 clusters found — consider adjusting HDBSCAN parameters")
    if cross_party < 1:
        print("WARNING: No cross-party clusters found — approach may need revisiting")
    if file_size > 200 * 1024:
        print(f"WARNING: Output file ({file_size / 1024:.0f} KB) exceeds 200KB target")

    print("\nDone.")


if __name__ == "__main__":
    main()
