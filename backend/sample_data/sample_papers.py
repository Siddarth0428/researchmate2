import fitz
import json
import hashlib
from pathlib import Path
from typing import List, Dict, Any
from backend.config import PAPERS_DIR
from backend.database import get_connection
from backend.services.pdf_service import extract_pdf_data
from backend.services.embedding_service import compute_embedding
from backend.services.analysis_service import analyze_paper
from backend.services.gap_service import discover_research_gaps

SAMPLE_PAPERS_DEFINITIONS = [
    {
        "id": "paper_attention_2017",
        "filename": "vaswani2017_attention.pdf",
        "title": "Attention Is All You Need",
        "authors": "Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Lukasz Kaiser, Illia Polosukhin",
        "year": 2017,
        "abstract": "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train.",
        "pages": [
            {
                "page": 1,
                "text": """Attention Is All You Need\nAshish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit\nGoogle Brain & Google Research\n\nAbstract\nThe dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train.\n\n1. Introduction\nRecurrent neural networks, long short-term memory and gated recurrent neural networks in particular, have been firmly established as state of the art approaches in sequence modeling. Recurrent models typically factor computation along the symbol positions of the input and output sequences. This inherently sequential nature precludes parallelization within training examples, which becomes critical at longer sequence lengths."""
            },
            {
                "page": 2,
                "text": """2. Architecture and Proposed Method\nThe Transformer follows an overall encoder-decoder architecture using stacked self-attention and point-wise, fully connected layers for both the encoder and decoder. An attention function can be described as mapping a query and a set of key-value pairs to an output, where the query, keys, values, and output are all vectors. The output is computed as a weighted sum of the values, where the weight assigned to each value is computed by a compatibility function of the query with the corresponding key. Multi-Head Attention allows the model to jointly attend to information from different representation subspaces at different positions."""
            },
            {
                "page": 3,
                "text": """3. Experiments and Results\nOn the WMT 2014 English-to-German translation task, the big transformer model achieves a state-of-the-art BLEU score of 28.4, outperforming the existing best models including ensembles by more than 2.0 BLEU. On the WMT 2014 English-to-French translation task, our model establishes a new single-model state-of-the-art BLEU score of 41.8 after training for 3.5 days on eight GPUs.\n\n4. Limitations and Future Work\nA notable limitation of the standard dot-product self-attention mechanism is that its computational and memory complexity scales quadratically O(n^2) with the input sequence length, making processing of very long context windows prohibitively expensive on modern hardware. In future work, we plan to extend the Transformer to problems involving input and output modalities other than text, and investigate local and restricted attention mechanisms to efficiently handle massive sequence lengths."""
            }
        ]
    },
    {
        "id": "paper_lora_2021",
        "filename": "hu2021_lora.pdf",
        "title": "LoRA: Low-Rank Adaptation of Large Language Models",
        "authors": "Edward J. Hu, Yelong Shen, Phillip Wallis, Zeyuan Allen-Zhu, Yuanzhi Li, Shean Wang, Lu Wang, Weizhu Chen",
        "year": 2021,
        "abstract": "An important paradigm of natural language processing consists of large-scale pre-training on general domain data and adaptation to specific tasks. Full fine-tuning becomes increasingly impractical as models scale to hundreds of billions of parameters. We propose Low-Rank Adaptation, or LoRA, which freezes the pre-trained model weights and injects trainable rank decomposition matrices into each layer of the Transformer architecture, greatly reducing the number of trainable parameters for downstream tasks. LoRA can reduce the number of trainable parameters by 10,000 times and the GPU memory requirement by 3 times.",
        "pages": [
            {
                "page": 1,
                "text": """LoRA: Low-Rank Adaptation of Large Language Models\nEdward J. Hu, Yelong Shen, Phillip Wallis, Zeyuan Allen-Zhu\nMicrosoft Corporation\n\nAbstract\nAn important paradigm of natural language processing consists of large-scale pre-training on general domain data and adaptation to specific tasks. Full fine-tuning becomes increasingly impractical as models scale to hundreds of billions of parameters. We propose Low-Rank Adaptation, or LoRA, which freezes the pre-trained model weights and injects trainable rank decomposition matrices into each layer of the Transformer architecture, greatly reducing the number of trainable parameters for downstream tasks. LoRA can reduce the number of trainable parameters by 10,000 times and the GPU memory requirement by 3 times.\n\n1. Introduction and Problem Statement\nMany applications in natural language processing rely on adapting one large-scale pre-trained language model to multiple downstream applications. The major bottleneck of conventional full fine-tuning is that each task requires storing an independent copy of parameters with hundreds of gigabytes, incurring massive deployment costs."""
            },
            {
                "page": 2,
                "text": """2. Methodology: Low-Rank Parameter Decomposition\nLoRA allows us to train some dense layers in a neural network indirectly by optimizing rank decomposition matrices of the dense layers' change during adaptation instead, while keeping the pre-trained weights frozen. For a pre-trained weight matrix W0 in R^{d x k}, we constrain its update by representing the latter with a low-rank decomposition W0 + Delta W = W0 + B * A, where B in R^{d x r}, A in R^{r x k}, and the rank r << min(d, k). During training, W0 is frozen and does not receive gradient updates, while A and B contain trainable parameters."""
            },
            {
                "page": 3,
                "text": """3. Empirical Evaluation on GLUE and Benchmarks\nWe evaluate LoRA on RoBERTa, DeBERTa, and GPT-3 175B. LoRA performs on par or better than full fine-tuning on GLUE benchmarks while utilizing only 0.01% of the trainable parameters. On GPT-3 175B, LoRA matches fine-tuning accuracy with a 3x reduction in memory consumption.\n\n4. Limitations and Future Directions\nA key limitation is that batching inputs across different tasks with distinct LoRA adapters in a single forward pass introduces non-trivial latency and implementation complexity unless custom kernels are used. Furthermore, the optimal rank r depends strongly on task complexity and is currently selected via manual heuristic hyperparameter search."""
            }
        ]
    },
    {
        "id": "paper_cot_2022",
        "filename": "wei2022_cot.pdf",
        "title": "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models",
        "authors": "Jason Wei, Xuezhi Wang, Dale Schuurmans, Maarten Bosma, Brian Ichter, Fei Xia, Ed Chi, Quoc Le, Denny Zhou",
        "year": 2022,
        "abstract": "We explore how generating a chain of thought—a series of intermediate reasoning steps—significantly improves the ability of large language models to perform complex reasoning. In particular, we show how such reasoning abilities emerge naturally in sufficiently large language models via a simple method called chain-of-thought prompting, where a few chain of thought demonstrations are provided as exemplars in prompting. Experiments on arithmetic, commonsense, and symbolic reasoning benchmarks demonstrate substantial performance gains over standard prompting.",
        "pages": [
            {
                "page": 1,
                "text": """Chain-of-Thought Prompting Elicits Reasoning in Large Language Models\nJason Wei, Xuezhi Wang, Dale Schuurmans, Denny Zhou\nGoogle Research, Brain Team\n\nAbstract\nWe explore how generating a chain of thought—a series of intermediate reasoning steps—significantly improves the ability of large language models to perform complex reasoning. In particular, we show how such reasoning abilities emerge naturally in sufficiently large language models via a simple method called chain-of-thought prompting, where a few chain of thought demonstrations are provided as exemplars in prompting. Experiments on arithmetic, commonsense, and symbolic reasoning benchmarks demonstrate substantial performance gains over standard prompting.\n\n1. Introduction\nThe language modeling community has recently achieved tremendous success by scaling up model size. However, scaling up model size alone has not proved sufficient for achieving high performance on challenging tasks such as multi-step arithmetic, commonsense reasoning, and symbolic manipulation."""
            },
            {
                "page": 2,
                "text": """2. Chain-of-Thought Method\nConsider your own thought process when solving a complicated multi-step math word problem. One typically decomposes the problem into intermediate steps and solves each before arriving at the final answer. We propose chain-of-thought prompting: providing exemplars where each input question is followed by an explicit chain of thought leading to the solution. This allows the model to allocate more test-time compute to complex problems by generating a coherent sequence of intermediate tokens."""
            },
            {
                "page": 3,
                "text": """3. Experimental Results on GSM8K and SVAMP\nOn the challenging GSM8K benchmark of grade school math problems, chain-of-thought prompting with PaLM 540B achieves 56.9% accuracy, drastically outperforming standard prompting (17.9%) and surpassing the prior supervised state of the art (55.0%) without any fine-tuning.\n\n4. Limitations and Future Work\nChain-of-thought prompting exhibits a sharp emergent behavior: it only yields improvements for models with roughly 100 billion parameters or more, having negligible or even detrimental effect on smaller models. Moreover, while chain of thought improves accuracy, models can still generate factually flawed or ungrounded intermediate reasoning paths that accidentally arrive at correct answers (hallucination in reasoning chains). Developing automated verification mechanisms for intermediate steps is a critical area for future research."""
            }
        ]
    }
]

def create_sample_pdf(paper_def: Dict[str, Any], target_path: Path):
    """Creates an actual readable PDF file on disk using PyMuPDF."""
    doc = fitz.open()
    for page_info in paper_def["pages"]:
        page = doc.new_page(width=595, height=842)
        # Header banner
        page.draw_rect(fitz.Rect(40, 30, 555, 34), color=(0.2, 0.4, 0.9), fill=(0.2, 0.4, 0.9))
        rect = fitz.Rect(50, 50, 545, 800)
        page.insert_textbox(rect, page_info["text"], fontsize=10, fontname="helv", lineheight=1.25)
    doc.save(str(target_path))
    doc.close()

async def load_sample_papers_into_session(session_id: str) -> List[Dict[str, Any]]:
    """Loads and processes all sample papers through the real backend pipeline."""
    conn = get_connection()
    cursor = conn.cursor()
    
    loaded_papers = []
    
    for p_def in SAMPLE_PAPERS_DEFINITIONS:
        pid = p_def["id"]
        pdf_path = PAPERS_DIR / p_def["filename"]
        
        # Check if already in DB
        cursor.execute("SELECT id FROM papers WHERE id = ? AND session_id = ?", (pid, session_id))
        existing = cursor.fetchone()
        if existing:
            loaded_papers.append(pid)
            continue
            
        # Create physical PDF
        create_sample_pdf(p_def, pdf_path)
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()
        file_hash = hashlib.sha256(pdf_bytes).hexdigest()
        
        # Parse through real PDF service
        extracted = extract_pdf_data(pdf_path)
        
        # Insert Paper record
        cursor.execute(
            """
            INSERT INTO papers (id, session_id, hash, filename, file_path, title, authors, year, abstract, page_count, status, file_size, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', ?, datetime('now'))
            """,
            (
                pid,
                session_id,
                file_hash,
                p_def["filename"],
                str(pdf_path),
                extracted["title"],
                extracted["authors"],
                extracted["year"],
                extracted["abstract"],
                extracted["page_count"],
                len(pdf_bytes)
            )
        )
        
        # Store chunks and compute embeddings
        for c in extracted["chunks"]:
            chunk_id = f"chk_{pid}_{c['chunk_index']}"
            emb_json = compute_embedding(c["text"])
            cursor.execute(
                """
                INSERT INTO chunks (id, paper_id, section, page, text, embedding, chunk_index)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (chunk_id, pid, c["section"], c["page"], c["text"], emb_json, c["chunk_index"])
            )
            
        # Run Extractive Analysis
        analysis_data = await analyze_paper(extracted["title"], extracted["abstract"], extracted["chunks"])
        
        # Store Analysis
        cursor.execute(
            """
            INSERT OR REPLACE INTO analyses (
                id, paper_id, summary, problem, method, dataset, metrics, results, contributions, limitations, future_work, source_label, evidence_json, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            """,
            (
                f"ana_{pid}",
                pid,
                analysis_data["summary"],
                analysis_data["problem"],
                analysis_data["method"],
                analysis_data["dataset"],
                analysis_data["metrics"],
                analysis_data["results"],
                analysis_data["contributions"],
                analysis_data["limitations"],
                analysis_data["future_work"],
                analysis_data["source_label"],
                json.dumps(analysis_data["evidence"])
            )
        )
        loaded_papers.append(pid)

    conn.commit()
    conn.close()
    
    # Run cross-paper research gaps discovery
    discover_research_gaps(session_id)
    return loaded_papers
