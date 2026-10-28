import json
import io
import pandas as pd
from typing import List, Dict, Any
from backend.database import get_connection

CRITERIA = [
    ("method", "Methodology / Architecture"),
    ("dataset", "Datasets & Benchmarks"),
    ("metrics", "Key Evaluation Metrics"),
    ("results", "Empirical Results"),
    ("limitations", "Known Limitations & Constraints"),
    ("contributions", "Primary Novelty / Contributions")
]

def generate_comparison_matrix(session_id: str, paper_ids: List[str]) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    
    placeholders = ",".join(["?"] * len(paper_ids))
    cursor.execute(
        f"""
        SELECT p.id, p.title, p.authors, p.year, 
               a.method, a.dataset, a.metrics, a.results, a.limitations, a.contributions, a.evidence_json
        FROM papers p
        LEFT JOIN analyses a ON p.id = a.paper_id
        WHERE p.id IN ({placeholders})
        """,
        paper_ids
    )
    rows = cursor.fetchall()
    conn.close()
    
    paper_meta = []
    matrix_rows = []
    
    # Map paper rows
    paper_map = {r["id"]: dict(r) for r in rows}
    
    for pid in paper_ids:
        if pid in paper_map:
            p = paper_map[pid]
            paper_meta.append({
                "id": p["id"],
                "title": p["title"],
                "authors": p["authors"] or "Unknown",
                "year": p["year"] or 2024
            })
            
    for crit_key, crit_label in CRITERIA:
        row_cells = {}
        for pid in paper_ids:
            if pid in paper_map:
                p = paper_map[pid]
                val = p.get(crit_key) or "No evidence found"
                # Parse evidence for citation chips
                evidence_list = []
                if p.get("evidence_json"):
                    try:
                        all_evidence = json.loads(p["evidence_json"])
                        evidence_list = all_evidence.get(crit_key, [])
                    except Exception:
                        pass
                
                row_cells[pid] = {
                    "text": val,
                    "evidence": evidence_list
                }
            else:
                row_cells[pid] = {"text": "Paper not loaded", "evidence": []}
                
        matrix_rows.append({
            "criterion": crit_label,
            "key": crit_key,
            "values": row_cells
        })

    return {
        "session_id": session_id,
        "paper_ids": paper_ids,
        "papers": paper_meta,
        "matrix": matrix_rows
    }

def export_comparison_to_csv(comparison_data: Dict[str, Any]) -> str:
    """Uses pandas to create a clean tabular comparison CSV string."""
    papers = comparison_data.get("papers", [])
    matrix = comparison_data.get("matrix", [])
    
    col_names = ["Criterion"] + [f"{p['title']} ({p['year']})" for p in papers]
    paper_ids = [p["id"] for p in papers]
    
    table_rows = []
    for item in matrix:
        row = [item["criterion"]]
        for pid in paper_ids:
            cell = item["values"].get(pid, {})
            text = cell.get("text", "N/A")
            row.append(text)
        table_rows.append(row)
        
    df = pd.DataFrame(table_rows, columns=col_names)
    output = io.StringIO()
    df.to_csv(output, index=False)
    return output.getvalue()
