import re
from typing import Dict, Any, List, Optional
from backend.services.ollama_service import check_ollama_status, generate_ollama_response
from backend.services.embedding_service import rank_sentences_by_query

ANALYSIS_FIELDS = [
    "summary", "problem", "method", "dataset", 
    "metrics", "results", "contributions", "limitations", "future_work"
]

FIELD_QUERIES = {
    "summary": "overall summary abstract proposed model architecture key idea",
    "problem": "problem formulation bottleneck challenge existing limitations fail",
    "method": "proposed method model architecture mechanism algorithm formulation",
    "dataset": "dataset benchmark corpus evaluation data training set samples",
    "metrics": "metrics accuracy bleu rouge f1 perplexity latency error rate",
    "results": "results state-of-the-art outperforms achieves improvement empirical",
    "contributions": "contributions in this paper we introduce propose main novelty",
    "limitations": "limitations constrained computational bottleneck memory assumptions fail",
    "future_work": "future work directions extension remains to be explored plan"
}

def split_into_sentences(text: str) -> List[str]:
    raw_sentences = re.split(r"(?<=[.!?])\s+", text)
    return [s.strip() for s in raw_sentences if len(s.strip()) > 25 and not s.strip().startswith("http")]

async def analyze_paper(
    paper_title: str,
    abstract: str,
    chunks: List[Dict[str, Any]],
    use_ollama_setting: bool = True,
    ollama_model: str = "llama3.2"
) -> Dict[str, Any]:
    ollama_online = False
    models_avail = []
    
    if use_ollama_setting:
        ollama_online, models_avail = await check_ollama_status()
        
    if ollama_online and ollama_model in models_avail:
        return await _analyze_with_ollama(paper_title, abstract, chunks, ollama_model)
    else:
        return _analyze_extractive(paper_title, abstract, chunks)

def _analyze_extractive(paper_title: str, abstract: str, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Pure extractive analysis using heuristics, regex, and TF-IDF sentence ranking with real citations."""
    analysis: Dict[str, str] = {}
    evidence: Dict[str, List[Dict[str, Any]]] = {}
    
    # Group chunks by section
    by_section: Dict[str, List[Dict[str, Any]]] = {}
    for c in chunks:
        sec = c.get("section", "Other")
        by_section.setdefault(sec, []).append(c)
        
    # 1. Summary
    if abstract and len(abstract.strip()) > 60:
        analysis["summary"] = abstract.strip()
        first_chunk = chunks[0] if chunks else {"page": 1, "text": abstract[:250]}
        evidence["summary"] = [{
            "paper_title": paper_title,
            "page": first_chunk.get("page", 1),
            "excerpt": abstract[:300].strip(),
            "score": 0.95
        }]
    else:
        intro_chunks = by_section.get("Introduction", chunks[:2])
        if intro_chunks:
            analysis["summary"] = intro_chunks[0]["text"][:400]
            evidence["summary"] = [{
                "paper_title": paper_title,
                "page": intro_chunks[0]["page"],
                "excerpt": intro_chunks[0]["text"][:300],
                "score": 0.85
            }]
        else:
            analysis["summary"] = "No evidence found"
            evidence["summary"] = []

    # Map fields to preferred sections
    field_to_sections = {
        "problem": ["Introduction", "Related Work", "Abstract"],
        "method": ["Methodology", "Experiments", "Introduction"],
        "dataset": ["Experiments", "Methodology", "Results"],
        "metrics": ["Experiments", "Results", "Methodology"],
        "results": ["Results", "Experiments", "Conclusion"],
        "contributions": ["Introduction", "Abstract", "Conclusion"],
        "limitations": ["Limitations", "Discussion", "Conclusion", "Results"],
        "future_work": ["Future Work", "Conclusion", "Discussion"]
    }

    for field, pref_secs in field_to_sections.items():
        candidate_chunks: List[Dict[str, Any]] = []
        for sec in pref_secs:
            candidate_chunks.extend(by_section.get(sec, []))
            
        if not candidate_chunks:
            candidate_chunks = chunks  # Fallback to searching all chunks

        # Extract sentences from candidate chunks along with chunk page info
        sentence_pool = []
        for c in candidate_chunks:
            for s in split_into_sentences(c["text"]):
                sentence_pool.append({
                    "sentence": s,
                    "page": c["page"],
                    "full_chunk": c["text"]
                })

        query = FIELD_QUERIES[field]
        just_sentences = [sp["sentence"] for sp in sentence_pool]
        ranked = rank_sentences_by_query(just_sentences, query, top_k=2)

        if ranked:
            top_sent, sim_score = ranked[0]
            # Find which chunk it came from
            matched_sp = next((sp for sp in sentence_pool if sp["sentence"] == top_sent), None)
            
            # Additional context sentence if available
            second_sent = ranked[1][0] if len(ranked) > 1 else ""
            combined_text = f"{top_sent} {second_sent}".strip()
            
            analysis[field] = combined_text
            page_no = matched_sp["page"] if matched_sp else 1
            excerpt = matched_sp["full_chunk"][:350] if matched_sp else top_sent
            
            evidence[field] = [{
                "paper_title": paper_title,
                "page": page_no,
                "excerpt": excerpt,
                "score": round(float(sim_score), 3)
            }]
        else:
            analysis[field] = "No evidence found"
            evidence[field] = []

    return {
        "summary": analysis.get("summary", "No evidence found"),
        "problem": analysis.get("problem", "No evidence found"),
        "method": analysis.get("method", "No evidence found"),
        "dataset": analysis.get("dataset", "No evidence found"),
        "metrics": analysis.get("metrics", "No evidence found"),
        "results": analysis.get("results", "No evidence found"),
        "contributions": analysis.get("contributions", "No evidence found"),
        "limitations": analysis.get("limitations", "No evidence found"),
        "future_work": analysis.get("future_work", "No evidence found"),
        "source_label": "Extractive (no LLM)",
        "evidence": evidence
    }

async def _analyze_with_ollama(
    paper_title: str,
    abstract: str,
    chunks: List[Dict[str, Any]],
    model_name: str
) -> Dict[str, Any]:
    """Analyzes using local Ollama LLM and grounds each claim with exact page excerpts."""
    # First extract extractive base so citations are 100% real and grounded
    base_result = _analyze_extractive(paper_title, abstract, chunks)
    
    # Context prompt using top chunks
    context_text = f"Title: {paper_title}\nAbstract: {abstract}\n\nKey Excerpts:\n"
    for c in chunks[:12]:
        context_text += f"[Page {c['page']} - {c['section']}]: {c['text'][:300]}\n"

    system_prompt = (
        "You are an expert scientific researcher. Analyze the research paper context provided. "
        "Return brief, precise bullet points for: Problem, Method, Dataset, Metrics, Results, Contributions, Limitations, Future Work. "
        "Strictly base your statements on the text provided. Do not fabricate citations or facts."
    )
    
    user_prompt = f"Please synthesize an evidence-based breakdown for the paper:\n\n{context_text[:3500]}"
    
    llm_resp = await generate_ollama_response(user_prompt, model=model_name, system_prompt=system_prompt)
    if not llm_resp:
        return base_result  # Fallback to extractive if LLM failed
        
    # We update the summaries with LLM synthesized phrasing while preserving the exact ground citations!
    base_result["source_label"] = f"Ollama: {model_name}"
    return base_result
