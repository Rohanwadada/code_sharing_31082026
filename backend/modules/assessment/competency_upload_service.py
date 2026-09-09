from io import BytesIO
from typing import Dict, List

import pandas as pd
from fastapi import HTTPException, UploadFile

from modules.assessment.schema import (
    CompetencyReviewSummary,
    ReviewCompetencyItem,
    UploadedFileInfo,
)


def _format_file_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    if size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    return f"{size_bytes / (1024 * 1024):.1f} MB"


def parse_competency_upload(
    file: UploadFile,
) -> tuple[list[ReviewCompetencyItem], UploadedFileInfo, CompetencyReviewSummary]:
    filename = (file.filename or "").lower()
    content = file.file.read()
    file.file.seek(0)
    file_size = len(content)

    if filename.endswith(".csv"):
        df = pd.read_csv(BytesIO(content))
    elif filename.endswith((".xlsx", ".xls")):
        df = pd.read_excel(BytesIO(content))
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type.")

    df.columns = [
        str(c).strip().lower().replace(" ", "_").replace("-", "_") for c in df.columns
    ]
    raw_rows = df.to_dict(orient="records")
    cleaned = clean_competency_data(raw_rows)

    items = [
        ReviewCompetencyItem(
            row_number=index,
            competency=item["competency"],
            competency_definition=item["competency_definition"],
            sub_competency=item["sub_competency"],
            sub_competency_definition=item["sub_competency_definition"],
            priority="must have",
            add_to_test=True,
        )
        for index, item in enumerate(cleaned, start=1)
    ]

    unique_competencies = {item.competency for item in items}
    summary = {
        "total_competencies": len(unique_competencies),
        "total_sub_competencies": len(items),
        "selected_sub_competencies": sum(1 for item in items if item.add_to_test),
    }

    file_info = UploadedFileInfo(
        filename=file.filename or "upload",
        file_size_bytes=file_size,
        file_size_display=_format_file_size(file_size),
    )
    return items, file_info, summary


def clean_competency_data(raw_rows: List[Dict]) -> List[Dict]:
    """Normalize raw CSV/Excel rows into clean competency dictionaries.

    Expected input columns (case‑insensitive):
    - competency / key_competency
    - competency definition / competency_definition
    - sub competency / sub_competency
    - sub competency definition / sub_competency_definition
    """
    normalized_rows = []

    print(raw_rows)
    for row in raw_rows:
        norm = {}
        for k, v in row.items():
            if k is None:
                continue
            key_norm = str(k).strip().lower().replace(" ", "").replace("-", "")
            norm[key_norm] = v
        normalized_rows.append(norm)

    mapped = []
    for row in normalized_rows:
        comp = (
            row.get("competency")
            or row.get("key_competency")
            or row.get("competency_name")
        )
        comp_def = row.get("competency_definition") or row.get("competency_details")
        sub = row.get("sub_competency") or row.get("sub_competency_name")
        sub_def = row.get("sub_competency_definition") or row.get(
            "sub_competency_details"
        )

        if comp is None or sub is None:
            continue

        mapped.append(
            {
                "key_competency": str(comp).strip(),
                "sub_competency": str(sub).strip(),
                "competency_definition": str(comp_def).strip()
                if comp_def is not None
                else "",
                "sub_competency_definition": str(sub_def).strip()
                if sub_def is not None
                else "",
            }
        )

    if not mapped:
        raise ValueError("No valid competency data found in input.")

    cleaned_pairs = _normalize_pairs(mapped)

    cleaned = []
    for pair in cleaned_pairs:
        match = next(
            (
                r
                for r in mapped
                if r["key_competency"] == pair["key_competency"]
                and r["sub_competency"] == pair["sub_competency"]
            ),
            None,
        )
        if match:
            cleaned.append(
                {
                    "competency": match["key_competency"],
                    "competency_definition": match["competency_definition"],
                    "sub_competency": match["sub_competency"],
                    "sub_competency_definition": match["sub_competency_definition"],
                }
            )
    return cleaned


def _normalize_pairs(pairs: List[Dict]) -> List[Dict]:
    """De‑duplicate and sanitize competency pairs while preserving order."""
    seen = set()
    normalized = []
    for pair in pairs or []:
        raw_key = pair.get("key_competency")
        raw_sub = pair.get("sub_competency")
        key = "" if raw_key is None else str(raw_key).strip()
        sub = "" if raw_sub is None else str(raw_sub).strip()
        if not key or not sub:
            continue
        if key.lower() in {"none", "null", "nan"}:
            continue
        if sub.lower() in {"none", "null", "nan"}:
            continue
        item_key = (key.lower(), sub.lower())
        if item_key in seen:
            continue
        seen.add(item_key)
        normalized.append({"key_competency": key, "sub_competency": sub})
    return normalized
