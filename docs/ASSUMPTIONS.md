# Department Digital Hub — ASSUMPTIONS

Each line: Question | Choice | Reason

## AMP-001 | Python 3.14.2 instead of 3.11.x | Python 3.11 is not installed on this machine; only 3.14.2 is available. Django 5.2.x and all required packages are compatible with 3.14. Recorded as a deviation from the spec.

## AMP-002 | Django 5.2.19 instead of 5.0.x | Django 5.0.x has a known Python 3.14 incompatibility (template Context __copy__ fails). Django 5.2.19 (current LTS) is fully compatible. Smallest safe alternative.

## AMP-003 | scikit-learn 1.9.1 instead of 1.6.1 | scikit-learn 1.6.1 has no pre-built binary wheel for Python 3.14 (requires Cython+Meson build chain not present). 1.9.1 has a Windows amd64 cp314 binary wheel.

## AMP-004 | psycopg[binary] 3.3.9 instead of 3.2.6 | psycopg-binary 3.2.6 binary wheels don't exist for Python 3.14 (available from 3.2.10+ but binaries only from 3.3.x). 3.3.9 is the latest stable with Python 3.14 binaries.

## AMP-005 | CO attainment: each assessment fully attributed to each of its linked COs | When an assessment is linked to multiple COs, the full score is considered for each CO rather than splitting. This is the most common interpretation in outcome-based education literature and simplifies the computation.

## AMP-006 | SIMILARITY_THRESHOLD default 0.4 for TF-IDF backend | Uncalibrated default. Run scripts/similarity_demo.py to calibrate for the department's project corpus.

## AMP-007 | Auth tokens: access in memory, refresh in localStorage | A known security trade-off documented in Section 8.3. HttpOnly cookies would be more secure but require CSRF handling; this choice keeps the client simpler for a demo/academic submission.

## AMP-008 | No real WhatsApp delivery | WhatsApp Business API requires a registered business account. The WhatsAppChannel logs "not configured" and makes no network calls. Marked as future work in STATUS.md.

## AMP-009 | Groq model default left empty in env | Model names change over time. Users must set GROQ_MODEL themselves after checking https://console.groq.com/docs/models. The .env.example suggests "llama-3.3-70b-versatile" as a starting point but this is not asserted in code.

## AMP-010 | Next.js 14.2.35 | Latest available 14.2.x patch at time of scaffolding.
