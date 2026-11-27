import os
import re
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
        "markdown bullet points, tables, and mathematical formulas."
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
    q_lower = query.lower().strip()
    words = [w for w in re.split(r"\W+", q_lower) if w]

    # Exact word-boundary greeting detection (avoids false-positives like 'white' or 'which')
    is_pure_greeting = False
    greetings = {"hi", "hello", "hey", "greetings"}
    if len(words) <= 3 and any(w in greetings for w in words):
        is_pure_greeting = True
    elif any(phrase in q_lower for phrase in ["who are you", "what can you do", "help me", "introduce yourself"]):
        is_pure_greeting = True

    if is_pure_greeting:
        return (
            "### Welcome to the Department Digital Hub AI Assistant\n\n"
            "I am the dedicated AI Academic & Technical Assistant for the **Department of Computer Science & Engineering** "
            "at **Tatyasaheb Kore Institute of Engineering & Technology (TKIET), Warananagar**.\n\n"
            "I can answer questions regarding:\n"
            "- **Software Engineering & Testing**: Black Box vs White Box testing, Cyclomatic Complexity calculations, Code Walkthroughs vs Inspections, Documentation, and Gunning's Fog Index\n"
            "- **COCOMO & Project Planning**: Basic, Intermediate (15 cost drivers & EAF), Detailed COCOMO (lifecycle phases), and COCOMO-II Object Points & NOP\n"
            "- **Software Design & Architecture**: 3 levels of design, Coupling vs Cohesion (6 types each), Function-Oriented Design (DFD & Structured Charts), and Object-Oriented Design\n"
            "- **Software Requirements Specification (SRS)**: 12 characteristics of good SRS, functional requirements, design constraints, and external interfaces\n"
            "- **Software Process Models**: 4 core process activities, 5 framework activities, 8 umbrella activities, and Hardware vs Software development differences\n"
            "- **Academic Regulations**: Attendance rules (75% mandatory cutoff, medical condonation), CIE passing criteria (40% aggregate), and detention policies\n"
            "- **Capstone Projects & Placements**: Proposal duplicate idea similarity threshold (<60%), 5-stage milestones, and T&P recruitment eligibility\n\n"
            "*Type any question or click a suggestion chip below to begin!*"
        )

    if not retrieved_docs:
        return (
            "### Inquiry Received\n\n"
            "I searched the Department Knowledge Repository, but did not find an exact match for your specific query. "
            "Here are the core topics available in the department system:\n\n"
            "- **Software Engineering & Estimation**: COCOMO models (Basic, Intermediate, Detailed, COCOMO-II), Software Testing (Black/White Box, Cyclomatic Complexity), Software Design (Cohesion, Coupling, DFD, OOD), SRS specifications, Code reviews\n"
            "- **Academic Regulations**: Minimum 75% attendance mandatory, CIE internal minimum 40% aggregate passing marks\n"
            "- **Capstone Projects**: Proposal similarity check (<60% threshold) and 5-stage milestones\n"
            "- **Campus Placement**: Aggregate CGPA >= 6.75 with no active backlogs for recruitment drives\n\n"
            "*For additional departmental inquiries, please reach out to your Class Coordinator or Head of Department.*"
        )

    # Use the top retrieved document
    top_doc = retrieved_docs[0]
    title = top_doc["title"]
    category = top_doc["category"]

    # Build structured contextual response
    header = (
        f"### Information from: {title}\n"
        f"**Category:** {category} | **Confidence:** {int(top_doc['score'] * 100)}%\n\n"
    )

    # 1. SOFTWARE TESTING & CYCLOMATIC COMPLEXITY
    if any(k in q_lower for k in ["black box", "white box", "cyclomatic", "complexity", "testing", "test case", "cfg", "control flow", "coverage", "driver", "stub"]):
        return header + (
            "#### 1. Black Box Testing vs. White Box Testing\n\n"
            "| Feature | Black Box Testing | White Box Testing (Structural) |\n"
            "| :--- | :--- | :--- |\n"
            "| **Concept** | Tests software functionality without knowing internal code structure | Analyzes code structure, logic paths, and internal implementation |\n"
            "| **Also Known As** | Behavioral / Functional Testing | Glass Box / Structural Testing |\n"
            "| **Techniques** | **Equivalence Class Partitioning (ECP)** (e.g. integer sqrt in 0..5000: `{-5, 500, 6000}`) and **Boundary Value Analysis (BVA)** (`{-1, 0, 5000, 5001}`) | **Coverage-based** & **Fault-based** testing |\n"
            "| **Coverage Types** | Requirement / Specification coverage | Statement, Branch, Condition, and Path coverage |\n"
            "| **Primary Goal** | Detects failures under varied inputs/conditions | Detects defects, unreachable code, and infinite loops directly |\n\n"
            "#### 2. White Box Coverage Strategies\n"
            "- **Statement Coverage:** Each program statement must be executed at least once.\n"
            "- **Branch Coverage:** Each branch (true/false outcome) must be traversed at least once.\n"
            "- **Condition Coverage:** Each Boolean condition evaluates to true at least once and false at least once.\n"
            "- **Path Coverage:** Every linearly independent path in the program is executed at least once.\n\n"
            "#### 3. Cyclomatic Complexity Metric Calculation\n"
            "Cyclomatic Complexity $V(G)$ is calculated from the **Control Flow Graph (CFG)** using four equivalent formulas:\n\n"
            "$$\\mathbf{V(G) = E - N + 2}$$\n\n"
            "- **Where:**\n"
            "  - **$E$** = Number of edges (transfers of control in the CFG)\n"
            "  - **$N$** = Number of nodes (unique program statements in the CFG)\n"
            "- **Alternative Equivalent Formulas:**\n"
            "  - $V(G) = \\text{Total Number of Non-Overlapping Bounded Areas} + 1$\n"
            "  - $V(G) = \\text{Decision Points} + 1$\n"
            "  - $V(G) = \\text{Predicate Nodes} + 1$\n\n"
            "**Worked Example (Euclid's GCD Program):**\n"
            "For the standard GCD algorithm with a `while (x != y)` loop and an inner `if (x > y)` branch, the CFG has $E = 8$ edges and $N = 7$ nodes:\n"
            "$$V(G) = 8 - 7 + 2 = \\mathbf{3}$$\n\n"
            "#### 4. Unit Testing Environment (Drivers & Stubs)\n"
            "- **Module Under Test (MUT):** The isolated unit being tested.\n"
            "- **Driver:** Non-local data structures and calling harness that calls the MUT with test cases.\n"
            "- **Stub:** Dummy procedure with simplified behavior that substitutes for called subroutines."
        )

    # 2. COCOMO OVERVIEW & BASIC COCOMO
    if any(k in q_lower for k in ["three modes", "organic", "semidetached", "embedded", "basic cocomo", "effort applied", "person-months", "staff size", "productivity level"]):
        return header + (
            "#### 1. Overview & Three Modes of COCOMO (B. W. Boehm, 1981)\n\n"
            "| Mode | Typical Size | Nature of Project | Team Experience | Innovation | Deadline | Development Environment |\n"
            "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n"
            "| **Organic** | 2 – 50 KLOC | Small, well-understood applications (e.g., payroll, inventory) | Experienced developers | Little | Not tight | Familiar & In-house |\n"
            "| **Semidetached** | 50 – 300 KLOC | Medium size utility systems (e.g., compilers, database systems, editors) | Average previous experience | Medium | Medium | Medium complexity |\n"
            "| **Embedded** | > 300 KLOC | Large real-time systems (e.g., ATMs, Air Traffic Control) | Very little previous experience | Significant | Tight | Complex hardware/interfaces |\n\n"
            "#### 2. Basic COCOMO Equations\n"
            "- **Effort Applied ($E$):** $E = a_b \\times (\\text{KLOC})^{b_b}$ (in Person-Months / PM)\n"
            "- **Development Time ($D$):** $D = c_b \\times (E)^{d_b}$ (in Months)\n"
            "- **Average Staff Size ($SS$):** $SS = \\frac{E}{D}$ (Persons)\n"
            "- **Productivity ($P$):** $P = \\frac{\\text{KLOC}}{E}$ (KLOC/PM) or $\\text{LOC/PM}$\n\n"
            "#### 3. Basic COCOMO Coefficients Table 4(a)\n\n"
            "| Software Project Mode | $a_b$ | $b_b$ | $c_b$ | $d_b$ |\n"
            "| :--- | :---: | :---: | :---: | :---: |\n"
            "| **Organic** | 2.4 | 1.05 | 2.5 | 0.38 |\n"
            "| **Semidetached** | 3.0 | 1.12 | 2.5 | 0.35 |\n"
            "| **Embedded** | 3.6 | 1.20 | 2.5 | 0.32 |\n\n"
            "#### 4. Worked Numerical Examples\n"
            "- **Example 4.6 (200 KLOC, Semidetached Mode):**\n"
            "  - $E = 3.0 \\times (200)^{1.12} = \\mathbf{1133.12\\text{ PM}}$\n"
            "  - $D = 2.5 \\times (1133.12)^{0.35} = \\mathbf{29.3\\text{ Months}}$\n"
            "  - Average Staff Size: $SS = 1133.12 / 29.3 = \\mathbf{38.67\\text{ Persons}}$\n"
            "  - Productivity: $P = 200 / 1133.12 = 0.1765\\text{ KLOC/PM} = \\mathbf{176\\text{ LOC/PM}}$"
        )

    # 3. INTERMEDIATE COCOMO & 15 COST DRIVERS (EAF)
    if any(k in q_lower for k in ["intermediate cocomo", "cost driver", "cost drivers", "eaf", "effort adjustment factor", "rely", "cplx", "acap", "pcap"]):
        return header + (
            "#### 1. Intermediate COCOMO Equations & Table 6 Coefficients\n"
            "- **Effort ($E$):** $E = a_i \\times (\\text{KLOC})^{b_i} \\times \\text{EAF}$ (Person-Months)\n"
            "- **Development Time ($D$):** $D = c_i \\times (E)^{d_i}$ (Months)\n"
            "- **Coefficients ($a_i, b_i, c_i, d_i$):**\n"
            "  - Organic: $a_i = 3.2, b_i = 1.05, c_i = 2.5, d_i = 0.38$\n"
            "  - Semidetached: $a_i = 3.0, b_i = 1.12, c_i = 2.5, d_i = 0.35$\n"
            "  - Embedded: $a_i = 2.8, b_i = 1.20, c_i = 2.5, d_i = 0.32$\n\n"
            "#### 2. The 15 Cost Drivers (Effort Multipliers Table 5)\n"
            "The Effort Adjustment Factor (EAF) is the product of all 15 multipliers across 4 categories:\n\n"
            "| Category | Driver Code | Description | Nominal (1.00) Range |\n"
            "| :--- | :--- | :--- | :---: |\n"
            "| **Product Attributes** | **RELY** | Required software reliability | 0.75 (Very Low) – 1.40 (Very High) |\n"
            "| | **DATA** | Database size relative to program | 0.94 (Low) – 1.16 (Very High) |\n"
            "| | **CPLX** | Product complexity | 0.70 (Very Low) – 1.65 (Extra High) |\n"
            "| **Hardware Attributes** | **TIME** | Execution time constraint | 1.00 (Nominal) – 1.66 (Extra High) |\n"
            "| | **STOR** | Main storage constraint | 1.00 (Nominal) – 1.56 (Extra High) |\n"
            "| | **VIRT** | Virtual machine volatility | 0.87 (Low) – 1.30 (Very High) |\n"
            "| | **TURN** | Computer turnaround time | 0.87 (Low) – 1.15 (Very High) |\n"
            "| **Personnel Attributes** | **ACAP** | Analyst capability | 1.46 (Very Low) – 0.71 (Very High) |\n"
            "| | **AEXP** | Applications experience | 1.29 (Very Low) – 0.82 (Very High) |\n"
            "| | **PCAP** | Programmer capability | 1.42 (Very Low) – 0.70 (Very High) |\n"
            "| | **VEXP** | Virtual machine experience | 1.21 (Very Low) – 0.90 (High) |\n"
            "| | **LEXP** | Programming language experience | 1.14 (Very Low) – 0.95 (High) |\n"
            "| **Project Attributes** | **MODP** | Modern programming practices | 1.24 (Very Low) – 0.82 (Very High) |\n"
            "| | **TOOL** | Use of software tools | 1.24 (Very Low) – 0.83 (Very High) |\n"
            "| | **SCED** | Required development schedule | 1.23 (Very Low) – 1.10 (Very High) |\n\n"
            "#### 3. Key Finding from Example 4.7 (Developer Capability vs. Language Experience)\n"
            "- **Case I (High capability, low language experience):** $\\text{EAF} = 0.82 \\times 1.14 = 0.9348 \\rightarrow E = \\mathbf{3470\\text{ PM}}$, $D = 33.9\\text{ M}$.\n"
            "- **Case II (Low capability, high language experience):** $\\text{EAF} = 1.29 \\times 0.95 = 1.22 \\rightarrow E = \\mathbf{4528\\text{ PM}}$, $D = 36.9\\text{ M}$.\n"
            "- **Conclusion:** Highly capable developers outperform low-quality developers even when working with unfamiliar programming languages."
        )

    # 4. DETAILED COCOMO & LIFECYCLE PHASES
    if any(k in q_lower for k in ["detailed cocomo", "phase-sensitive", "size equivalent", "re-usable", "reusable code", "mu_p", "tau_p"]):
        return header + (
            "#### 1. Detailed COCOMO Key Features\n"
            "- **Phase-Sensitive Effort Multipliers:** Effort multipliers are applied separately to individual development phases (Design, Programming, Integration & Test).\n"
            "- **Three-Level Product Hierarchy:** Estimates are computed at **Modules**, **Subsystem**, and **System Level**.\n\n"
            "#### 2. Size Equivalent Formula for Reusable Code\n"
            "When reusing existing code, an adjustment factor $A$ is computed from the modified design document ($DD\\%$), code ($C\\%$), and integration ($I\\%$):\n\n"
            "$$A = 0.4 \\times DD + 0.3 \\times C + 0.3 \\times I$$\n"
            "$$S_{\\text{equivalent}} = \\frac{S \\times A}{100}$$\n\n"
            "#### 3. Phase-wise Cost and Schedule Formulas\n"
            "- **Phase Effort ($E_p$):** $E_p = \\mu_p \\times E$\n"
            "- **Phase Development Time ($D_p$):** $D_p = \\tau_p \\times D$\n"
            "- **Effort Distribution Ranges:**\n"
            "  - Plan & Requirements: 6% – 8% effort (10% – 40% time)\n"
            "  - System & Detailed Design: 16% – 18% effort (19% – 38% time)\n"
            "  - Module Code & Test: 48% – 68% effort (24% – 64% time)\n"
            "  - Integration & Test: 16% – 34% effort (18% – 34% time)"
        )

    # 5. COCOMO-II & APPLICATION COMPOSITION (OBJECT POINTS)
    if any(k in q_lower for k in ["cocomo 2", "cocomo-ii", "object points", "application composition", "early design", "post architecture", "nop", "prod"]):
        return header + (
            "#### 1. COCOMO-II Stages (Table 8)\n"
            "- **Stage I: Application Composition Model:** Used for prototyping and application composition projects (screens, reports, 3GL components).\n"
            "- **Stage II: Early Design Model:** Used in the early design phase when architectural details are still emerging.\n"
            "- **Stage III: Post-Architecture Model:** Used after the detailed architecture is finalized using function points or SLOC.\n\n"
            "#### 2. Application Composition Estimation Steps (Fig. 5)\n"
            "1. **Assess Object Counts:** Count screens, reports, and 3GL components.\n"
            "2. **Classify Complexity Levels:** Simple, Medium, Difficult using Table 9(a) (screens) & 9(b) (reports) based on views and data tables.\n"
            "3. **Assign Complexity Weights (Table 10):**\n"
            "   - **Screens:** Simple = 1, Medium = 2, Difficult = 3\n"
            "   - **Reports:** Simple = 2, Medium = 5, Difficult = 8\n"
            "   - **3GL Components:** Difficult = 10\n"
            "4. **Determine Object-Point Count:** Sum the weighted instances.\n"
            "5. **Compute New Object Points (NOP):**\n"
            "   $$\\mathbf{NOP = \\frac{\\text{Object Points} \\times (100 - \\%\\text{reuse})}{100}}$$\n"
            "6. **Productivity Rate (PROD, Table 11):** Very Low = 4, Low = 7, Nominal = 13, High = 25, Very High = 50 NOP/PM.\n"
            "7. **Estimate Effort:** $\\mathbf{\\text{Effort in PM} = \\frac{NOP}{\\text{PROD}}}$.\n\n"
            "**Worked Example 4.9:**\n"
            "- 4 screens (medium = 2) + 2 reports (difficult = 8): $\\text{Count} = 4 \\times 2 + 2 \\times 8 = 24$.\n"
            "- With 10% reuse: $NOP = \\frac{24 \\times 90}{100} = 21.6$.\n"
            "- Low productivity ($PROD = 7$): $\\text{Effort} = 21.6 / 7 = \\mathbf{3.086\\text{ Person-Months}}$."
        )

    # 6. COUPLING AND COHESION
    if any(k in q_lower for k in ["coupling", "cohesion", "intra-module", "inter-module", "stamp coupling", "functional cohesion"]):
        return header + (
            "#### 1. Cohesion vs. Coupling Comparison\n\n"
            "| Dimension | Cohesion | Coupling |\n"
            "| :--- | :--- | :--- |\n"
            "| **Definition** | Intra-module concept: relationship & functional strength *within* a module | Inter-module concept: relationship & dependency *between* different modules |\n"
            "| **Desirable Goal** | **High Cohesion** is best for software | **Low (Loose) Coupling** is best for software |\n"
            "| **Focus** | Module focuses on a single dedicated responsibility | Modules remain independent with minimal shared state |\n"
            "| **Impact** | Increases modularity, readability, and ease of maintenance | Decreases ripple effects and accidental breakages during changes |\n\n"
            "#### 2. Six Types of Cohesion (Highest to Lowest)\n"
            "1. **Functional Cohesion:** Every element contributes to a single, well-defined task (Best).\n"
            "2. **Sequential Cohesion:** Output from one part serves as input to the next part.\n"
            "3. **Communication Cohesion:** Elements operate on the same input data or produce the same output.\n"
            "4. **Procedural Cohesion:** Elements are grouped because they follow a specific execution sequence.\n"
            "5. **Temporal Cohesion:** Elements are grouped because they are executed at the same time (e.g. startup).\n"
            "6. **Coincidental / Layer Cohesion:** Elements have no meaningful relationship except being in the same module.\n\n"
            "#### 3. Six Types of Coupling (Lowest to Highest / Best to Worst)\n"
            "1. **Data Coupling:** Modules communicate only by passing simple data arguments (Best).\n"
            "2. **Stamp Coupling:** Modules share a composite data structure but each needs only part of it.\n"
            "3. **Control Coupling:** One module directs the control flow of another by passing flags or switches.\n"
            "4. **External Coupling:** Modules depend on external communication protocols, devices, or file formats.\n"
            "5. **Common Coupling:** Multiple modules share read/write access to global data structures.\n"
            "6. **Content Coupling:** One module directly accesses or modifies internal data or statements of another (Worst)."
        )

    # 7. SOFTWARE DESIGN CONCEPTS, OBJECTIVES & LEVELS
    if any(k in q_lower for k in ["software design", "design process", "design concepts", "levels of design", "architectural design", "preliminary design"]):
        return header + (
            "#### 1. Software Design Process & Objectives\n"
            "- **Purpose:** Transforms customer requirements from the SRS document into a technical design document for programming.\n"
            "- **Five Key Objectives:**\n"
            "  1. **Correctness:** Correctly implements all functionalities specified in the SRS.\n"
            "  2. **Efficiency:** Optimizes resource usage, execution time, and implementation cost.\n"
            "  3. **Understandability:** Modular layered design that is intuitive to follow.\n"
            "  4. **Completeness:** Covers all data structures, modules, algorithms, and interfaces.\n"
            "  5. **Maintainability:** Easily adaptable when change requests arrive from customers.\n\n"
            "#### 2. Core Software Design Concepts\n"
            "- **Abstraction:** Retaining essential characteristics while suppressing implementation details.\n"
            "- **Modularity:** Decomposing software into manageable, independently testable units.\n"
            "- **Architecture:** The high-level structure providing conceptual integrity.\n"
            "- **Information Hiding:** Encapsulating design decisions so internal data is inaccessible from outside.\n"
            "- **Refinement & Patterns:** Successive decomposition and reusable proven solutions.\n"
            "- **Refactoring:** Improving internal code structure without altering external behavior.\n\n"
            "#### 3. Three Levels of Software Design\n"
            "1. **Architectural Design:** Defines overall structure, major subsystems, and solution domain.\n"
            "2. **Preliminary (High-Level) Design:** Decomposes problem into modules, establishes control relationships, and outputs Structure Charts / UML.\n"
            "3. **Detailed Design:** Defines individual module data structures, algorithms, and specifications."
        )

    # 8. FUNCTION-ORIENTED DESIGN & OBJECT-ORIENTED DESIGN
    if any(k in q_lower for k in ["dfd", "data flow", "data-flow", "structured chart", "object oriented", "object-oriented", "ood", "polymorphism", "encapsulation"]):
        return header + (
            "#### 1. Function-Oriented Design & Notations\n"
            "Decomposes system into modules where each module performs a single functional transformation.\n"
            "- **Four Design Notations:** Data Flow Diagrams (DFD), Data Dictionaries, Structured Charts, and Pseudocode.\n"
            "- **DFD Symbols:**\n"
            "  - **Rounded Rectangle:** Processes / functional transformations.\n"
            "  - **Rectangle:** Data stores (files/databases).\n"
            "  - **Circle:** External entities (user interaction providing input/receiving output).\n"
            "  - **Arrows:** Data flow paths with descriptive names.\n"
            "  - **'and' / 'or' Keywords:** Boolean linking for multiple inputs/outputs.\n\n"
            "#### 2. Structured Charts\n"
            "- Partitions a system into black boxes in a hierarchy.\n"
            "- **Symbols:** Rectangle (Module), Arrow (Call), Open circle arrow (Data couple), Filled circle arrow (Control flag), Curved arrow (Loop), Diamond (Decision).\n\n"
            "#### 3. Object-Oriented Design (OOD) Concepts\n"
            "- **Objects:** Entities with private state data and methods operating on that data.\n"
            "- **Classes:** Blueprints or generalized descriptions of objects.\n"
            "- **Messages:** Communication between objects specifying target, operation, and parameters.\n"
            "- **Abstraction:** Amplification of essentials and removal of irrelevancies.\n"
            "- **Encapsulation:** Bundling data and operations into a single unit while hiding internal representation.\n"
            "- **Inheritance:** Subclasses inheriting and extending features from superclasses.\n"
            "- **Polymorphism:** A single interface executing different implementations depending on object type."
        )

    # 9. SRS CHARACTERISTICS & COMPONENTS
    if any(k in q_lower for k in ["srs", "requirements specification", "characteristics of good srs", "functional requirements", "design constraints"]):
        return header + (
            "#### 1. Characteristics of a Good SRS Document\n"
            "1. **Correctness:** Accurately expresses true user requirements verified by user review.\n"
            "2. **Completeness:** Includes all functions, performance criteria, constraints, and responses to invalid inputs.\n"
            "3. **Consistency:** Free from conflicts in object characteristics, logical/temporal actions, or terminology.\n"
            "4. **Unambiguousness:** Every requirement has exactly one interpretation.\n"
            "5. **Ranking for Importance & Stability:** Identified as essential, conditional, or optional.\n"
            "6. **Modifiability:** Cross-referenced and indexed so changes can be made easily.\n"
            "7. **Verifiability:** Requirements can be tested or verified in a cost-effective manner.\n"
            "8. **Traceability:** Supports **Backward Traceability** (referencing earlier source docs) and **Forward Traceability** (unique IDs referenced in design and code).\n"
            "9. **Design Independence:** Specifies *what* the system should do, never *how* (no implementation details).\n"
            "10. **Testability:** Easy to construct test cases and verification plans from the document.\n"
            "11. **Understandable by Customer:** Avoids obscure formal notations; uses clear terminology.\n"
            "12. **Right Level of Abstraction:** Details are appropriately scaled to the development stage.\n\n"
            "#### 2. Core Components of an SRS\n"
            "- **Functional Requirements:** Data inputs, ranges, transformations, outputs, and abnormal/error behaviors.\n"
            "- **Design Constraints:** Standard compliance, hardware limitations, fault tolerance limits, and security (access control, encryption, audit logs).\n"
            "- **External Interface Requirements:** User interfaces, hardware interfaces, and communication protocols."
        )

    # 10. SOFTWARE PROCESS, FRAMEWORK & UMBRELLA ACTIVITIES
    if any(k in q_lower for k in ["software process", "process framework", "umbrella activities", "hardware vs software"]):
        return header + (
            "#### 1. Four Core Software Process Activities\n"
            "1. **Software Specification (Requirements Engineering):** Defining functionality and constraints.\n"
            "2. **Software Design and Implementation:** Designing architecture and coding.\n"
            "3. **Software Verification and Validation (V&V):** Ensuring conformance to specifications and user needs.\n"
            "4. **Software Evolution (Maintenance):** Modifying software for changing business and customer needs.\n\n"
            "#### 2. Five Common Process Framework Activities\n"
            "- **Communication:** Heavy customer interaction and requirements elicitation.\n"
            "- **Planning:** Estimating tasks, technical risks, schedule, and resources.\n"
            "- **Modeling:** Creating requirement analysis and architecture models.\n"
            "- **Construction:** Code generation and multi-level testing.\n"
            "- **Deployment:** Delivery of releases and gathering user feedback.\n\n"
            "#### 3. Eight Types of Umbrella Activities\n"
            "1. Software Project Tracking and Control\n"
            "2. Risk Management\n"
            "3. Software Quality Assurance (SQA)\n"
            "4. Formal Technical Reviews (FTR)\n"
            "5. Measurement & Metrics\n"
            "6. Software Configuration Management (SCM)\n"
            "7. Reusability Management\n"
            "8. Work Product Preparation and Production\n\n"
            "#### 4. Hardware vs. Software Development Differences\n"
            "- Software is easier and less costly to change through iterative releases; hardware cannot be refactored after physical manufacturing.\n"
            "- Hardware designs are constrained by standard components, require long component acquisition lead times, and necessitate extensive upfront architectural decisions."
        )

    # 11. CODING, CODE REVIEW & DOCUMENTATION
    if any(k in q_lower for k in ["coding", "code review", "walkthrough", "inspection", "gunning", "fog index", "internal documentation", "external documentation"]):
        return header + (
            "#### 1. Code Review vs. Testing\n"
            "- **Code Review (CR):** Cost-effective error-elimination strategy conducted after clean compilation; directly uncovers defects and algorithmic errors.\n"
            "- **Testing:** Uncovers program *failures* under specific test inputs; requires subsequent debugging and error correction.\n\n"
            "#### 2. Code Walkthrough vs. Code Inspection\n\n"
            "| Attribute | Code Walkthrough | Code Inspection |\n"
            "| :--- | :--- | :--- |\n"
            "| **Nature** | Informal code analysis technique | Formal, structured defect-detection technique |\n"
            "| **Team** | 3 to 7 developers simulating execution by hand | Inspection team using standard checklists |\n"
            "| **Focus** | Algorithmic and logical errors | Classical programming errors & coding standards |\n"
            "| **Management** | Managers **do not** attend to prevent evaluative pressure | Formal meeting with defined inspection roles |\n\n"
            "#### 3. Classical Errors Checked during Inspection\n"
            "- Uninitialized variables and incompatible data assignments\n"
            "- Infinite / non-terminating loops and improper loop variable modifications\n"
            "- Parameter type and count mismatches in procedure calls\n"
            "- Array index out of bounds and memory allocation/de-allocation leaks\n"
            "- Comparison of equality on floating-point numbers\n\n"
            "#### 4. Software Documentation & Gunning's Fog Index\n"
            "- **Internal Documentation:** Comments, meaningful identifiers, indentation, module headers, enumerated types.\n"
            "- **External Documentation:** User Manual, SRS, Design Document, Test Document, Installation Guide.\n"
            "- **Gunning's Fog Index Formula (Readability in years of formal education):**\n\n"
            "$$\\mathbf{\\text{Fog}(D) = \\left[0.4 \\times \\left(\\frac{\\text{Words}}{\\text{Sentences}}\\right)\\right] + \\left[\\frac{\\text{Words with } \\ge 3\\text{ syllables}}{\\text{Total Words}} \\times 100\\right]}$$"
        )

    # 12. ACADEMIC REGULATIONS & POLICIES
    if "attendance" in q_lower:
        return header + (
            "**Key Attendance Regulations:**\n"
            "- **Mandatory Cutoff:** Students must maintain a minimum of **75% attendance** across all theory and practical sessions.\n"
            "- **Deficit Warning:** Students with attendance between 65% and 74.9% may apply for condonation on medical grounds through the Class Coordinator.\n"
            "- **Critical Detention:** Students below 65% are flagged as **HIGH RISK** on the Early Warning System and will be detained from appearing in end-semester examinations.\n\n"
            f"> *Excerpt from {title}:*\n"
            f"{top_doc['snippet']}\n"
        )
    elif any(k in q_lower for k in ["cie", "passing", "marks", "internal"]):
        return header + (
            "**Continuous Internal Evaluation (CIE) Passing Criteria:**\n"
            "- **Minimum Passing Threshold:** Students must secure a minimum of **40% aggregate marks** in internal assessment components.\n"
            "- **Components:** Continuous evaluation comprises CIE-1 (20 Marks), CIE-2 (20 Marks), and Lab Continuous Assignments (10 Marks).\n"
            "- **Remedial Policy:** Students failing in internal assessments or showing a >= 15% grade drop are automatically assigned to special remedial tutoring sessions.\n\n"
            f"> *Reference from {title}:*\n"
            f"{top_doc['snippet']}\n"
        )
    elif any(k in q_lower for k in ["project", "capstone", "similarity", "milestone"]):
        return header + (
            "**B.Tech Capstone Project Policies:**\n"
            "- **Similarity Duplicate Check:** All proposed project synopses undergo automated TF-IDF similarity checking. Proposals with **>= 60% similarity** to previous batches are flagged for duplicate idea revision.\n"
            "- **5 Standard Milestones:**\n"
            "  1. Synopsis & Problem Statement (Week 3)\n"
            "  2. SRS & Architecture Design (Week 6)\n"
            "  3. Mid-Term Evaluation Presentation (Week 10)\n"
            "  4. Prototype & Code Implementation (Week 13)\n"
            "  5. Final Dissertation Report (IEEE format) & Viva-Voce (Week 15)\n"
            "- **Faculty Guide Sign-Off:** Each milestone requires sign-off from the allotted department guide.\n\n"
            f"> *Guidelines Summary from {title}:*\n"
            f"{top_doc['snippet']}\n"
        )
    elif any(k in q_lower for k in ["placement", "tcs", "infosys"]):
        return header + (
            "**Campus Placement Eligibility & Guidelines:**\n"
            "- **Academic Criteria:** Minimum **CGPA >= 6.75** throughout B.Tech with no active backlogs at the time of drive registration.\n"
            "- **Pre-Placement Requirements:** Compulsory completion of technical aptitude assessments and mock coding interviews.\n"
            "- **Dream Offer Policy:** Students securing a Dream Offer (> 7.0 LPA) are excused from further pooled campus interviews to ensure maximum placement opportunity.\n\n"
            f"> *Official Circular Excerpt from {title}:*\n"
            f"{top_doc['snippet']}\n"
        )

    # 13. DYNAMIC MULTI-DOCUMENT SYNTHESIS FALLBACK
    sections = []
    for d in retrieved_docs[:2]:
        paragraphs = [p.strip() for p in d["content"].split("\n\n") if p.strip()]
        if paragraphs:
            sections.append(f"#### From: {d['title']} ({d['category']})\n\n" + "\n\n".join(paragraphs[:3]))

    return header + "\n\n---\n\n".join(sections)


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
