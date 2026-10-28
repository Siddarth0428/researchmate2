from typing import List, Dict, Any
from backend.database import get_connection
from backend.services.embedding_service import compute_similarity, extract_shared_concepts

def get_recommendations_for_paper(paper_id: str, session_id: str, top_k: int = 5) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    
    # Get target paper
    cursor.execute("SELECT id, title, authors, year, abstract FROM papers WHERE id = ?", (paper_id,))
    target = cursor.fetchone()
    if not target:
        conn.close()
        return []
        
    target_text = f"{target['title']} {target['abstract']}"
    
    # Get all other papers in session
    cursor.execute(
        "SELECT id, title, authors, year, abstract FROM papers WHERE session_id = ? AND id != ?",
        (session_id, paper_id)
    )
    others = cursor.fetchall()
    conn.close()
    
    recommendations = []
    for other in others:
        other_text = f"{other['title']} {other['abstract']}"
        score = compute_similarity(target_text, other_text)
        shared_concepts = extract_shared_concepts(target_text, other_text, top_n=4)
        
        recommendations.append({
            "paper_id": other["id"],
            "title": other["title"],
            "authors": other["authors"] or "Unknown Authors",
            "year": other["year"] or 2024,
            "similarity_score": round(float(score), 3),
            "shared_concepts": shared_concepts
        })
        
    recommendations.sort(key=lambda r: r["similarity_score"], reverse=True)
    return recommendations[:top_k]

def build_similarity_graph(session_id: str) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, title, authors, year, abstract FROM papers WHERE session_id = ?", (session_id,))
    papers = cursor.fetchall()
    conn.close()
    
    nodes = []
    for idx, p in enumerate(papers):
        nodes.append({
            "id": p["id"],
            "title": p["title"],
            "authors": p["authors"] or "Unknown",
            "year": p["year"] or 2024,
            "group": (idx % 4) + 1
        })
        
    links = []
    n = len(papers)
    for i in range(n):
        for j in range(i + 1, n):
            p1 = papers[i]
            p2 = papers[j]
            t1 = f"{p1['title']} {p1['abstract']}"
            t2 = f"{p2['title']} {p2['abstract']}"
            sim = compute_similarity(t1, t2)
            
            # Connect if similarity is noticeable, or if sparse connect top pairs
            if sim >= 0.10 or n <= 5:
                shared = extract_shared_concepts(t1, t2, top_n=3)
                links.append({
                    "source": p1["id"],
                    "target": p2["id"],
                    "weight": round(float(sim), 3),
                    "shared_concepts": shared
                })
                
    return {
        "nodes": nodes,
        "links": links
    }
