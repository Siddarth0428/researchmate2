import asyncio
import httpx

BASE_URL = "http://127.0.0.1:8000"

async def test_full_pipeline():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        print("[1/9] Testing GET /api/health...")
        resp = await client.get("/api/health")
        assert resp.status_code == 200, f"Health check failed: {resp.text}"
        data = resp.json()
        print("      API Status:", data["api_status"])
        print("      Active Model:", data["active_model_name"])
        print("      Embedding Engine:", data["embedding_model_loaded"])
        print("      Papers in Store:", data["total_papers"])

        print("[2/9] Testing POST /api/papers/sample (1-click Landmark Ingestion)...")
        resp = await client.post("/api/papers/sample?session_id=default")
        assert resp.status_code == 200
        print("      Sample loader response:", resp.json()["message"])

        print("[3/9] Testing GET /api/papers...")
        resp = await client.get("/api/papers?session_id=default")
        assert resp.status_code == 200
        papers = resp.json()
        assert len(papers) >= 3, "Expected at least 3 papers"
        first_paper = papers[0]
        print(f"      Retrieved {len(papers)} papers. Sample: '{first_paper['title']}' ({first_paper['year']})")

        print("[4/9] Testing GET /api/papers/{id}/file (PDF Serving)...")
        resp = await client.get(f"/api/papers/{first_paper['id']}/file")
        assert resp.status_code == 200
        assert resp.headers.get("content-type") == "application/pdf"
        print(f"      PDF file served successfully ({len(resp.content)} bytes)")

        print("[5/9] Testing GET /api/recommendations/{id}...")
        resp = await client.get(f"/api/recommendations/{first_paper['id']}?session_id=default")
        assert resp.status_code == 200
        recs = resp.json()
        print(f"      Found {len(recs)} recommendation(s). Top match: '{recs[0]['title']}' ({int(recs[0]['similarity_score']*100)}% match, shared: {recs[0]['shared_concepts']})")

        print("[6/9] Testing GET /api/graph...")
        resp = await client.get("/api/graph?session_id=default")
        assert resp.status_code == 200
        graph = resp.json()
        print(f"      Graph generated: {len(graph['nodes'])} nodes, {len(graph['links'])} similarity links")

        print("[7/9] Testing POST /api/compare...")
        pids = [p["id"] for p in papers[:2]]
        resp = await client.post("/api/compare", json={"session_id": "default", "paper_ids": pids})
        assert resp.status_code == 200
        comp = resp.json()
        print(f"      Comparison matrix built across {len(comp['papers'])} papers with {len(comp['matrix'])} criteria rows")

        print("[8/9] Testing GET /api/gaps...")
        resp = await client.get("/api/gaps?session_id=default")
        assert resp.status_code == 200
        gaps = resp.json()
        print(f"      Discovered {len(gaps)} evidence-backed research gaps. Top gap: '{gaps[0]['title']}' [Confidence: {gaps[0]['confidence']}]")

        print("[9/9] Testing POST /api/reports (Markdown & PDF)...")
        resp_md = await client.post("/api/reports", json={"session_id": "default", "title": "Verification Report", "format": "markdown"})
        assert resp_md.status_code == 200
        resp_pdf = await client.post("/api/reports", json={"session_id": "default", "title": "Verification Report", "format": "pdf"})
        assert resp_pdf.status_code == 200
        print("      Markdown Report:", resp_md.json()["filename"])
        print("      PDF Report:", resp_pdf.json()["filename"])

        print("\n ALL RESEARCHMATE ENDPOINTS VERIFIED AND PASSING SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(test_full_pipeline())
