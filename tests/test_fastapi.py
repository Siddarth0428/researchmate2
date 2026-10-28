from fastapi.testclient import TestClient
from backend.main import app

def test_backend_e2e():
    client = TestClient(app)
    
    # 1. Health
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["api_status"] == "ok"
    assert "total_papers" in data
    print("Health check: OK")
    
    # 2. Sample papers
    res = client.post("/api/papers/sample?session_id=default")
    assert res.status_code == 200
    print("Sample loader: OK")
    
    # 3. Papers list
    res = client.get("/api/papers?session_id=default")
    assert res.status_code == 200
    papers = res.json()
    assert len(papers) >= 3
    pid = papers[0]["id"]
    print(f"Papers count: {len(papers)}, First paper ID: {pid}")
    
    # 4. Paper detail & citations
    res = client.get(f"/api/papers/{pid}")
    assert res.status_code == 200
    p_detail = res.json()
    assert p_detail["analysis"] is not None
    assert "evidence" in p_detail["analysis"]
    print("Paper detail & grounded analysis: OK")
    
    # 5. File serving
    res = client.get(f"/api/papers/{pid}/file")
    assert res.status_code == 200
    assert "application/pdf" in res.headers["content-type"]
    print("PDF File serving: OK")
    
    # 6. Recommendations
    res = client.get(f"/api/recommendations/{pid}?session_id=default")
    assert res.status_code == 200
    recs = res.json()
    assert len(recs) >= 1
    print(f"Recommendations count: {len(recs)}, Top match score: {recs[0]['similarity_score']}")
    
    # 7. Similarity Graph
    res = client.get("/api/graph?session_id=default")
    assert res.status_code == 200
    graph = res.json()
    assert len(graph["nodes"]) >= 3
    print(f"Graph nodes: {len(graph['nodes'])}, links: {len(graph['links'])}")
    
    # 8. Comparison
    pids = [p["id"] for p in papers[:2]]
    res = client.post("/api/compare", json={"session_id": "default", "paper_ids": pids})
    assert res.status_code == 200
    comp = res.json()
    assert len(comp["papers"]) == 2
    print("Comparison matrix: OK")
    
    # 9. Comparison CSV export
    res = client.get(f"/api/compare/export-csv?session_id=default&pids={','.join(pids)}")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    print("Comparison CSV export: OK")
    
    # 10. Research gaps
    res = client.get("/api/gaps?session_id=default")
    assert res.status_code == 200
    gaps = res.json()
    assert len(gaps) >= 1
    print(f"Gaps discovered: {len(gaps)}, Top gap confidence: {gaps[0]['confidence']}")
    
    # 11. Reports
    res = client.post("/api/reports", json={"session_id": "default", "title": "Verification Report", "format": "markdown"})
    assert res.status_code == 200
    print("Markdown report generation: OK")
    
    res = client.post("/api/reports", json={"session_id": "default", "title": "Verification Report", "format": "pdf"})
    assert res.status_code == 200
    print("PDF report generation: OK")
    
    print("\n>>> ALL 11 END-TO-END VERIFICATION TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    test_backend_e2e()
