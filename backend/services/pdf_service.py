import fitz  # PyMuPDF
import hashlib
import re
from typing import Dict, List, Any, Tuple
from pathlib import Path

SECTION_PATTERNS = [
    (r"(?i)^(?:[0-9IVX]+\.?\s*)?abstract", "Abstract"),
    (r"(?i)^(?:[0-9IVX]+\.?\s*)?introduction", "Introduction"),
    (r"(?i)^(?:[0-9IVX]+\.?\s*)?(?:related\s+work|background)", "Related Work"),
    (r"(?i)^(?:[0-9IVX]+\.?\s*)?(?:methodology|methods|proposed\s+method|architecture|approach)", "Methodology"),
    (r"(?i)^(?:[0-9IVX]+\.?\s*)?(?:experiments|experimental\s+setup|evaluation)", "Experiments"),
    (r"(?i)^(?:[0-9IVX]+\.?\s*)?(?:results|findings|discussion)", "Results"),
    (r"(?i)^(?:[0-9IVX]+\.?\s*)?(?:limitations|broader\s+impact)", "Limitations"),
    (r"(?i)^(?:[0-9IVX]+\.?\s*)?(?:future\s+work|future\s+directions)", "Future Work"),
    (r"(?i)^(?:[0-9IVX]+\.?\s*)?(?:conclusion|concluding\s+remarks)", "Conclusion"),
    (r"(?i)^(?:[0-9IVX]+\.?\s*)?references", "References"),
]

def compute_file_hash(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()

def extract_pdf_data(file_path: Path) -> Dict[str, Any]:
    doc = fitz.open(str(file_path))
    if len(doc) == 0:
        raise ValueError("PDF file is empty (0 pages).")
    
    total_pages = len(doc)
    page_texts: List[Dict[str, Any]] = []
    total_char_count = 0

    # Extract pages with multi-column awareness
    for page_num in range(total_pages):
        page = doc[page_num]
        # get_text("blocks") returns tuples: (x0, y0, x1, y1, text, block_no, block_type)
        blocks = page.get_text("blocks")
        # Filter text blocks only (block_type == 0)
        text_blocks = [b for b in blocks if len(b) > 4 and b[4].strip()]
        
        # Sort blocks to handle multi-column correctly:
        # A 2-column page has width ~ 600pt. If blocks span left (<300) and right (>280),
        # sort left column top-to-bottom first, then right column top-to-bottom.
        page_width = page.rect.width
        mid_x = page_width / 2.0
        
        # Check if page has 2 distinct columns
        left_blocks = [b for b in text_blocks if b[0] < mid_x and b[2] <= mid_x + 60]
        right_blocks = [b for b in text_blocks if b[0] >= mid_x - 30]
        
        if len(left_blocks) >= 2 and len(right_blocks) >= 2:
            left_blocks.sort(key=lambda b: b[1])   # sort by y0
            right_blocks.sort(key=lambda b: b[1])  # sort by y0
            ordered_blocks = left_blocks + right_blocks
        else:
            ordered_blocks = sorted(text_blocks, key=lambda b: (round(b[1] / 15), b[0]))
        
        page_str = "\n\n".join([b[4].strip() for b in ordered_blocks])
        total_char_count += len(page_str)
        page_texts.append({
            "page": page_num + 1,
            "text": page_str,
            "blocks": ordered_blocks
        })

    if total_char_count < 100:
        raise ValueError("Scanned or empty PDF detected with no extractable text. Please upload a PDF with selectable text.")

    # Detect Title and Authors from Page 1
    page1_text = page_texts[0]["text"]
    title, authors = detect_title_and_authors(doc[0], page1_text)
    
    # Detect Year
    year = detect_year(page1_text)
    
    # Extract Abstract
    abstract = extract_abstract(page1_text)
    
    # Extract Sections & Chunks across all pages
    sections, chunks = parse_sections_and_chunks(page_texts)

    return {
        "title": title,
        "authors": authors,
        "year": year,
        "abstract": abstract,
        "page_count": total_pages,
        "sections": sections,
        "chunks": chunks,
        "full_text": "\n\n".join([p["text"] for p in page_texts])
    }

def detect_title_and_authors(page1: fitz.Page, page1_text: str) -> Tuple[str, str]:
    # Extract text with font size heuristics
    blocks = page1.get_text("dict").get("blocks", [])
    spans_with_size = []
    
    for b in blocks:
        if "lines" in b:
            for line in b["lines"]:
                for span in line.get("spans", []):
                    text = span.get("text", "").strip()
                    size = span.get("size", 10)
                    if text and len(text) > 3:
                        spans_with_size.append((size, text))
                        
    if spans_with_size:
        # Sort by font size descending
        max_size = max(s[0] for s in spans_with_size)
        title_spans = [s[1] for s in spans_with_size if s[0] >= max_size - 1.5]
        title_candidate = " ".join(title_spans).strip()
        # Clean up title
        title_candidate = re.sub(r"\s+", " ", title_candidate)
        if 10 < len(title_candidate) < 250:
            title = title_candidate
        else:
            title = page1_text.split("\n")[0][:150].strip()
    else:
        title = page1_text.split("\n")[0][:150].strip()

    # Detect authors: usually below title before Abstract
    authors = "Unknown Authors"
    lines = [l.strip() for l in page1_text.split("\n") if l.strip()]
    for idx, line in enumerate(lines[:12]):
        if re.search(r"(?i)abstract", line):
            break
        if idx > 0 and len(line) > 3 and not any(k in line.lower() for k in ["university", "department", "http", "@", "arxiv", "proceedings"]):
            authors = line
            break
            
    return title, authors

def detect_year(text: str) -> int:
    match = re.search(r"(?:19|20)\d{2}", text[:1500])
    if match:
        year = int(match.group(0))
        if 1980 <= year <= 2030:
            return year
    return 2024

def extract_abstract(page1_text: str) -> str:
    # Match text between "Abstract" and "1. Introduction" or next section
    match = re.search(r"(?i)abstract[\s\:\.\—\-]*(.*?)(?:(?:1\.?\s*)?introduction|\n\n[0-9]\s+[A-Z])", page1_text, re.DOTALL)
    if match:
        abstract = match.group(1).strip()
        abstract = re.sub(r"\s+", " ", abstract)
        if len(abstract) > 40:
            return abstract[:2000]
            
    # Fallback: grab first 2 substantial paragraphs
    paras = [p.strip() for p in page1_text.split("\n\n") if len(p.strip()) > 80]
    if len(paras) > 1:
        return paras[1][:1500]
    return page1_text[:600]

def parse_sections_and_chunks(page_texts: List[Dict[str, Any]]) -> Tuple[Dict[str, str], List[Dict[str, Any]]]:
    sections: Dict[str, str] = {
        "Abstract": "",
        "Introduction": "",
        "Related Work": "",
        "Methodology": "",
        "Experiments": "",
        "Results": "",
        "Limitations": "",
        "Future Work": "",
        "Conclusion": ""
    }
    
    current_section = "Introduction"
    chunks: List[Dict[str, Any]] = []
    chunk_idx = 0
    
    for p in page_texts:
        page_num = p["page"]
        lines = p["text"].split("\n")
        buffer = []
        
        for line in lines:
            line_clean = line.strip()
            if not line_clean:
                continue
                
            # Check if line indicates a section transition
            new_section = None
            if len(line_clean) < 80:
                for pat, sec_name in SECTION_PATTERNS:
                    if re.match(pat, line_clean):
                        new_section = sec_name
                        break
            
            if new_section:
                # Flush previous buffer as a chunk if it has text
                if buffer:
                    chunk_text = " ".join(buffer).strip()
                    if len(chunk_text) > 40:
                        chunks.append({
                            "section": current_section,
                            "page": page_num,
                            "text": chunk_text,
                            "chunk_index": chunk_idx
                        })
                        chunk_idx += 1
                        sections[current_section] = (sections.get(current_section, "") + " " + chunk_text).strip()
                    buffer = []
                current_section = new_section
            else:
                buffer.append(line_clean)
                # If buffer exceeds ~250 words, create a chunk
                if len(buffer) >= 15:
                    chunk_text = " ".join(buffer).strip()
                    chunks.append({
                        "section": current_section,
                        "page": page_num,
                        "text": chunk_text,
                        "chunk_index": chunk_idx
                    })
                    chunk_idx += 1
                    sections[current_section] = (sections.get(current_section, "") + " " + chunk_text).strip()
                    buffer = []
                    
        if buffer:
            chunk_text = " ".join(buffer).strip()
            if len(chunk_text) > 40:
                chunks.append({
                    "section": current_section,
                    "page": page_num,
                    "text": chunk_text,
                    "chunk_index": chunk_idx
                })
                chunk_idx += 1
                sections[current_section] = (sections.get(current_section, "") + " " + chunk_text).strip()

    return sections, chunks
