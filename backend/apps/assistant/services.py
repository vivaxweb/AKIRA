"""
RAG (Retrieval-Augmented Generation) Knowledge Assistant Service.
Supports:
1. TF-IDF Contextual Document Retrieval across Department Knowledge Base
2. Cloud LLM generation via Groq API (when GROQ_API_KEY is configured)
3. Offline Extractive Deterministic Engine (when offline, evaluating locally, or key not set)
"""
import os
import json
import urllib.request
import urllib.error
from django.conf import settings
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from apps.assistant.models import KnowledgeDocument, ChatMessage


def retrieve_relevant_knowledge(query: str, top_k: int = 3):
    """
    Retrieves the most semantically relevant department knowledge documents
    using TF-IDF vectorization with n-grams and cosine similarity.
    """
    docs = list(KnowledgeDocument.objects.filter(is_active=True))
    if not docs:
        return []

    corpus = [f"{d.title} {d.tags} {d.content}" for d in docs]
    query_text = query.strip()

    try:
        vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english", sublinear_tf=True)
        tfidf_matrix = vectorizer.fit_transform(corpus)
        query_vec = vectorizer.transform([query_text])
        similarities = cosine_similarity(query_vec, tfidf_matrix).flatten()

        ranked_indices = similarities.argsort()[::-1]
        results = []
        for idx in ranked_indices[:top_k]:
            score = float(similarities[idx])
            if score > 0.04:  # Relevance threshold
                doc = docs[idx]
                # Extract the most relevant snippet/paragraph
                paragraphs = [p.strip() for p in doc.content.split("\n\n") if p.strip()]
                best_snippet = paragraphs[0] if paragraphs else doc.content[:300]

                # If multiple paragraphs, find the one with highest overlap
                if len(paragraphs) > 1:
                    p_vecs = vectorizer.transform(paragraphs)
                    p_sims = cosine_similarity(query_vec, p_vecs).flatten()
                    best_p_idx = p_sims.argmax()
                    best_snippet = paragraphs[best_p_idx]

                results.append({
                    "id": doc.id,
                    "title": doc.title,
                    "category": doc.get_category_display(),
                    "score": round(score, 3),
                    "snippet": best_snippet[:350],
                    "content": doc.content,
                })
        return results
    except Exception:
        # Fallback to simple keyword search
        results = []
        query_words = set(query.lower().split())
        for doc in docs:
            doc_text = f"{doc.title} {doc.content}".lower()
            matches = sum(1 for w in query_words if w in doc_text)
            if matches > 0:
                results.append({
                    "id": doc.id,
                    "title": doc.title,
                    "category": doc.get_category_display(),
                    "score": round(matches / len(query_words), 2),
                    "snippet": doc.content[:300],
                    "content": doc.content,
                })
        return sorted(results, key=lambda x: x["score"], reverse=True)[:top_k]


def call_groq_llm(query: str, context_docs: list) -> str:
    """
    Calls the Groq Cloud API using the ultra-fast Llama-3.1 model.
    Falls back gracefully to None if key is absent, invalid, or offline.
    """
    api_key = getattr(settings, "GROQ_API_KEY", "") or os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        return None

    context_str = "\n\n---\n\n".join(
        [f"Document: {d['title']} ({d['category']})\n{d['content']}" for d in context_docs]
    )

    system_prompt = (
        "You are the official Academic AI Knowledge Assistant for the Department of Computer Science "
        "& Engineering at Tatyasaheb Kore Institute of Engineering & Technology (TKIET), Warananagar (AY 2026-27).\n"
        "Your role is to answer questions from students and faculty accurately, professionally, and clearly.\n"
        "Always base your responses on the provided departmental context. Mention specific course codes, "
        "percentage cutoffs, evaluation components, and official guidelines where relevant. Format with clean "
        "markdown bullet points and sections."
    )

    user_content = (
        f"Department Knowledge Context:\n{context_str}\n\n"
        f"User Question: {query}\n\n"
        f"Answer:"
    )

    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        "temperature": 0.2,
        "max_tokens": 800,
    }

    try:
        req = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "DepartmentDigitalHub/1.0",
            },
        )
        with urllib.request.urlopen(req, timeout=10) as res:
            if res.status == 200:
                body = json.loads(res.read().decode("utf-8"))
                return body["choices"][0]["message"]["content"].strip()
    except Exception:
        return None

    return None


def generate_offline_extractive_response(query: str, retrieved_docs: list) -> str:
    """
    High-quality offline extractive knowledge engine that provides structured,
    well-cited answers based on official department documents when offline or without external API keys.
    """
    q_lower = query.lower()

    # Greetings and general system overview
    if any(g in q_lower for g in ["hi", "hello", "hey", "who are you", "what can you do", "help"]):
        return (
            "### Welcome to the Department Digital Hub Knowledge Assistant\n\n"
            "I am the dedicated AI Academic Assistant for the **Department of Computer Science & Engineering** "
            "at **Tatyasaheb Kore Institute of Engineering & Technology (TKIET), Warananagar**.\n\n"
            "You can ask me questions regarding:\n"
            "- **Academic Regulations**: Attendance rules, CIE minimum passing marks, and detention cutoffs\n"
            "- **Curriculum & Syllabi**: Course outcomes, unit modules, and textbooks for DBMS (CS501) and other subjects\n"
            "- **Capstone Projects**: Proposal guidelines, similarity duplicate check thresholds, and 5-stage milestones\n"
            "- **Campus Placement**: Eligibility criteria, CGPA cutoffs, and company drive policies\n"
            "- **NBA & Accreditation**: Course Outcome to Program Outcome (CO-PO) attainment calculations\n\n"
            "*Type any question or click a suggestion chip below to begin!*"
        )

    if not retrieved_docs:
        return (
            "### Inquiry Received\n\n"
            "I searched the Department Knowledge Repository, but did not find an exact match for your specific query. "
            "Here are the general departmental guidelines:\n\n"
            "- **Attendance**: Minimum 75% attendance in every course is mandatory to be eligible for end-semester examinations.\n"
            "- **Continuous Internal Evaluation (CIE)**: Students must secure at least 40% aggregate marks in CIE components.\n"
            "- **Capstone Projects**: Must pass the duplicate idea similarity check (< 60% threshold) and be approved by the Department Guide Committee.\n\n"
            "*For further clarification, please reach out to your Class Coordinator or the Head of Department.*"
        )

    # Use the top retrieved document
    top_doc = retrieved_docs[0]
    title = top_doc["title"]
    category = top_doc["category"]
    content = top_doc["content"]

    # Build structured contextual response
    response = (
        f"### Information from: {title}\n"
        f"**Category:** {category} | **Confidence:** {int(top_doc['score'] * 100)}%\n\n"
    )

    # Specific topic handlers for crisp answers
    if "attendance" in q_lower:
        response += (
            "**Key Attendance Regulations:**\n"
            "- **Mandatory Cutoff:** Students must maintain a minimum of **75% attendance** across all theory and practical sessions.\n"
            "- **Deficit Warning:** Students with attendance between 65% and 74.9% may apply for condonation on medical grounds through the Class Coordinator.\n"
            "- **Critical Detention:** Students below 65% are flagged as **HIGH RISK** on the Early Warning System and will be detained from appearing in end-semester examinations.\n\n"
            f"> *Excerpt from {title}:*\n"
            f"{top_doc['snippet']}\n"
        )
    elif "cie" in q_lower or "passing" in q_lower or "marks" in q_lower or "internal" in q_lower:
        response += (
            "**Continuous Internal Evaluation (CIE) Passing Criteria:**\n"
            "- **Minimum Passing Threshold:** Students must secure a minimum of **40% marks** in each internal assessment component.\n"
            "- **Components:** Continuous evaluation comprises CIE-1 (20 Marks), CIE-2 (20 Marks), and Lab Continuous Assignments.\n"
            "- **Remedial Policy:** Students failing in two or more assessments or showing a >= 15% grade drop are automatically assigned to special remedial tutoring sessions.\n\n"
            f"> *Reference from {title}:*\n"
            f"{top_doc['snippet']}\n"
        )
    elif "project" in q_lower or "capstone" in q_lower or "similarity" in q_lower or "milestone" in q_lower:
        response += (
            "**B.Tech Capstone Project Policies:**\n"
            "- **Similarity Duplicate Check:** All proposed project synopses undergo automated TF-IDF similarity checking. Proposals with **>= 60% similarity** to previous batches are flagged for duplicate idea revision.\n"
            "- **5 Standard Milestones:**\n"
            "  1. Synopsis & Problem Statement\n"
            "  2. SRS & Architecture Design\n"
            "  3. Mid-Term Evaluation Presentation\n"
            "  4. Prototype & Code Implementation\n"
            "  5. Final Dissertation Report (IEEE format) & Viva-Voce\n"
            "- **Faculty Guide Sign-Off:** Each milestone requires sign-off from the allotted department guide.\n\n"
            f"> *Guidelines Summary from {title}:*\n"
            f"{top_doc['snippet']}\n"
        )
    elif "placement" in q_lower or "tcs" in q_lower or "infosys" in q_lower:
        response += (
            "**Campus Placement Eligibility & Guidelines:**\n"
            "- **Academic Criteria:** Minimum **CGPA >= 6.75** throughout B.Tech with no active backlogs at the time of drive registration.\n"
            "- **Pre-Placement Requirements:** Compulsory completion of technical aptitude assessments and mock coding interviews.\n"
            "- **Registration:** Eligible students must register via the Department Placement Cell prior to announced deadlines.\n\n"
            f"> *Official Circular Excerpt from {title}:*\n"
            f"{top_doc['snippet']}\n"
        )
    else:
        # General matched response
        paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
        selected_paragraphs = paragraphs[:3]
        response += "\n\n".join(selected_paragraphs)

    return response


def ask_assistant(user, query: str) -> dict:
    """
    Main entry point for AI Knowledge Assistant.
    Retrieves relevant documents, invokes Groq LLM or offline extractive generator,
    and records chat history.
    """
    retrieved_docs = retrieve_relevant_knowledge(query)

    # 1. Attempt Groq Cloud API
    mode = "offline_extractive"
    response_text = call_groq_llm(query, retrieved_docs)

    if response_text:
        mode = "groq_llm"
    else:
        # 2. Offline Extractive Generator
        response_text = generate_offline_extractive_response(query, retrieved_docs)

    # Sanitize source citations
    clean_sources = [
        {
            "id": d["id"],
            "title": d["title"],
            "category": d["category"],
            "score": d["score"],
            "snippet": d["snippet"],
        }
        for d in retrieved_docs
    ]

    # Save to chat history
    ChatMessage.objects.create(
        user=user,
        query=query,
        response=response_text,
        sources=clean_sources,
        mode=mode,
        tokens_used=len(response_text.split()),
    )

    return {
        "query": query,
        "response": response_text,
        "sources": clean_sources,
        "mode": mode,
    }
