import json
import uuid
from typing import List, Dict, Any
from backend.database import get_connection
from backend.services.embedding_service import compute_similarity

DEFAULT_CATEGORIES = ["Computational", "Empirical & Data", "Architectural", "Generalization", "Verification"]

def discover_research_gaps(session_id: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        """
        SELECT p.id, p.title, p.year, a.limitations, a.future_work, a.evidence_json
        FROM papers p
        JOIN analyses a ON p.id = a.paper_id
        WHERE p.session_id = ?
        """,
        (session_id,)
    )
    rows = cursor.fetchall()
    
    total_papers = len(rows)
    if total_papers == 0:
        conn.close()
        return []
        
    # Gather limitation and future work statements with paper metadata
    statements = []
    for r in rows:
        paper_title = r["title"]
        year = r["year"] or 2024
        evidence_map = {}
        if r["evidence_json"]:
            try:
                evidence_map = json.loads(r["evidence_json"])
            except Exception:
                pass
                
        lim = (r["limitations"] or "").strip()
        if lim and lim != "No evidence found":
            ev_list = evidence_map.get("limitations", [])
            page = ev_list[0]["page"] if ev_list else 1
            excerpt = ev_list[0]["excerpt"] if ev_list else lim[:250]
            statements.append({
                "type": "limitation",
                "text": lim,
                "paper_title": paper_title,
                "year": year,
                "page": page,
                "excerpt": excerpt
            })
            
        fw = (r["future_work"] or "").strip()
        if fw and fw != "No evidence found":
            ev_list = evidence_map.get("future_work", [])
            page = ev_list[0]["page"] if ev_list else 1
            excerpt = ev_list[0]["excerpt"] if ev_list else fw[:250]
            statements.append({
                "type": "future_work",
                "text": fw,
                "paper_title": paper_title,
                "year": year,
                "page": page,
                "excerpt": excerpt
            })

    if not statements:
        conn.close()
        return []

    # Semantic clustering of statements
    clusters: List[List[Dict[str, Any]]] = []
    for stmt in statements:
        matched_cluster = None
        for cl in clusters:
            # Check similarity with representative statement of cluster
            sim = compute_similarity(stmt["text"], cl[0]["text"])
            if sim >= 0.22:
                matched_cluster = cl
                break
        if matched_cluster is not None:
            matched_cluster.append(stmt)
        else:
            clusters.append([stmt])

    # Rank clusters by frequency and recency
    gap_results = []
    # Clear old gaps for this session
    cursor.execute("DELETE FROM gaps WHERE session_id = ?", (session_id,))

    for idx, cl in enumerate(clusters):
        papers_in_cluster = list({s["paper_title"] for s in cl})
        freq = len(papers_in_cluster)
        max_year = max(s["year"] for s in cl)
        
        # Determine confidence and rationale
        if freq >= 3 or (freq >= 2 and total_papers <= 3):
            confidence = "High"
            rationale = f"Corroborated across {freq} of {total_papers} papers with strong empirical alignment."
        elif freq >= 2:
            confidence = "Medium"
            rationale = f"Identified in {freq} of {total_papers} papers as an unresolved barrier."
        else:
            confidence = "Low"
            rationale = f"Observed in 1 of {total_papers} papers; requires broader validation."

        # Assign category based on keywords
        combined_text = " ".join([s["text"] for s in cl]).lower()
        if any(k in combined_text for k in ["memory", "gpu", "compute", "quadratic", "flop", "hardware", "scale"]):
            category = "Computational Bottleneck"
        elif any(k in combined_text for k in ["dataset", "bias", "benchmark", "label", "synthetic", "token"]):
            category = "Data & Benchmarking"
        elif any(k in combined_text for k in ["generalize", "out-of-distribution", "robust", "domain"]):
            category = "Generalization & Robustness"
        elif any(k in combined_text for k in ["reasoning", "hallucination", "verify", "proof", "step"]):
            category = "Reasoning & Verification"
        else:
            category = "Methodological Limitation"

        # Synthesize title from cluster representative
        rep_text = cl[0]["text"]
        title_snippet = rep_text[:110].strip()
        if len(title_snippet) >= 100:
            title_snippet = title_snippet[:title_snippet.rfind(" ")] + "..."
            
        evidence = []
        for s in cl:
            evidence.append({
                "paper_title": s["paper_title"],
                "page": s["page"],
                "excerpt": s["excerpt"],
                "score": 0.90
            })

        gap_id = f"gap_{uuid.uuid4().hex[:8]}"
        gap_obj = {
            "id": gap_id,
            "session_id": session_id,
            "title": f"{category}: {title_snippet}",
            "text": rep_text,
            "category": category,
            "frequency": freq,
            "confidence": confidence,
            "rationale": rationale,
            "evidence": evidence,
            "created_at": "Just now"
        }
        
        # Save to DB
        cursor.execute(
            """
            INSERT INTO gaps (id, session_id, title, text, category, frequency, confidence, rationale, evidence_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            """,
            (gap_id, session_id, gap_obj["title"], gap_obj["text"], gap_obj["category"], freq, confidence, rationale, json.dumps(evidence))
        )
        gap_results.append(gap_obj)

    conn.commit()
    conn.close()

    # Sort gaps: High confidence first, then by frequency descending
    conf_order = {"High": 3, "Medium": 2, "Low": 1}
    gap_results.sort(key=lambda g: (conf_order.get(g["confidence"], 0), g["frequency"]), reverse=True)
    return gap_results

def get_session_gaps(session_id: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM gaps WHERE session_id = ? ORDER BY frequency DESC", (session_id,))
    rows = cursor.fetchall()
    conn.close()
    
    if not rows:
        return discover_research_gaps(session_id)
        
    res = []
    for r in rows:
        ev = []
        if r["evidence_json"]:
            try:
                ev = json.loads(r["evidence_json"])
            except Exception:
                pass
        res.append({
            "id": r["id"],
            "session_id": r["session_id"],
            "title": r["title"],
            "text": r["text"],
            "category": r["category"],
            "frequency": r["frequency"],
            "confidence": r["confidence"],
            "rationale": r["rationale"],
            "evidence": ev,
            "created_at": r["created_at"]
        })
    return res
