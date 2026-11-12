import logging
from typing import Dict, Any, List, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from .models import Project

logger = logging.getLogger(__name__)

SIMILARITY_FLAG_THRESHOLD = 60.0  # Percentage above which an idea is flagged as duplicate risk


def check_project_similarity(
    title: str,
    abstract: str,
    exclude_project_id: Optional[int] = None,
    limit: int = 5,
) -> Dict[str, Any]:
    """
    Computes a hybrid similarity score (Title + Abstract TF-IDF n-grams and cosine similarity)
    between an input proposal and all registered projects in the department repository.

    Returns:
        {
            "max_score": float (0.0 to 100.0),
            "is_flagged": bool (True if max_score >= 60.0),
            "matched_project_id": int | None,
            "top_matches": [
                {
                    "id": int,
                    "title": str,
                    "domain": str,
                    "batch_year": int,
                    "similarity_pct": float,
                    "status": str,
                    "guide_name": str,
                },
                ...
            ]
        }
    """
    clean_title = (title or "").strip()
    clean_abstract = (abstract or "").strip()

    if not clean_title and not clean_abstract:
        return {
            "max_score": 0.0,
            "is_flagged": False,
            "matched_project_id": None,
            "top_matches": [],
        }

    projects_qs = Project.objects.exclude(status=Project.Status.REJECTED)
    if exclude_project_id:
        projects_qs = projects_qs.exclude(id=exclude_project_id)

    projects_list = list(projects_qs.select_related("guide"))
    if not projects_list:
        return {
            "max_score": 0.0,
            "is_flagged": False,
            "matched_project_id": None,
            "top_matches": [],
        }

    try:
        # Title vectorization
        titles = [p.title for p in projects_list] + [clean_title]
        title_vec = TfidfVectorizer(ngram_range=(1, 2), stop_words="english")
        title_matrix = title_vec.fit_transform(titles)
        title_sims = cosine_similarity(title_matrix[-1], title_matrix[:-1])[0]

        # Content (Title + Abstract) vectorization
        contents = [f"{p.title}. {p.abstract}" for p in projects_list] + [f"{clean_title}. {clean_abstract}"]
        content_vec = TfidfVectorizer(ngram_range=(1, 2), stop_words="english", sublinear_tf=True)
        content_matrix = content_vec.fit_transform(contents)
        content_sims = cosine_similarity(content_matrix[-1], content_matrix[:-1])[0]

        scored_matches: List[Dict[str, Any]] = []
        for idx in range(len(projects_list)):
            t_score = float(title_sims[idx])
            c_score = float(content_sims[idx])

            # Hybrid scoring: give high weight if title matches strongly, or if combined text matches
            if t_score >= 0.8:
                blended = max(c_score, 0.4 * t_score + 0.6 * c_score, 0.75)
            elif t_score >= 0.5:
                blended = max(c_score, 0.45 * t_score + 0.55 * c_score)
            else:
                blended = max(c_score, 0.35 * t_score + 0.65 * c_score)

            pct = round(blended * 100.0, 1)
            project = projects_list[idx]
            scored_matches.append({
                "id": project.id,
                "title": project.title,
                "domain": project.domain,
                "batch_year": project.batch_year,
                "similarity_pct": pct,
                "status": project.status,
                "guide_name": project.guide.get_full_name() if project.guide else "Unassigned",
            })

        # Sort descending by similarity percentage
        scored_matches.sort(key=lambda x: x["similarity_pct"], reverse=True)
        top_matches = scored_matches[:limit]

        max_score = top_matches[0]["similarity_pct"] if top_matches else 0.0
        best_match_id = top_matches[0]["id"] if top_matches and max_score > 0 else None
        is_flagged = max_score >= SIMILARITY_FLAG_THRESHOLD

        return {
            "max_score": max_score,
            "is_flagged": is_flagged,
            "matched_project_id": best_match_id,
            "top_matches": top_matches,
        }

    except Exception as e:
        logger.exception("Error calculating project similarity: %s", e)
        return {
            "max_score": 0.0,
            "is_flagged": False,
            "matched_project_id": None,
            "top_matches": [],
        }
