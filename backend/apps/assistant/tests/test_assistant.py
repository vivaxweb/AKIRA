import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User, Department
from apps.assistant.models import KnowledgeDocument, ChatMessage
from apps.assistant.services import retrieve_relevant_knowledge, ask_assistant


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def assistant_setup(db):
    dept = Department.objects.create(code="CSE", name="Computer Science & Engineering")
    hod = User.objects.create_user(
        email="hod_assistant_test@demo.local",
        password="TestPassword@123",
        role=User.Role.HOD,
        department=dept,
        first_name="HOD",
        last_name="Tester",
    )
    student = User.objects.create_user(
        email="student_assistant_test@demo.local",
        password="TestPassword@123",
        role=User.Role.STUDENT,
        department=dept,
        first_name="Student",
        last_name="Tester",
    )
    other_student = User.objects.create_user(
        email="other_student_assistant@demo.local",
        password="TestPassword@123",
        role=User.Role.STUDENT,
        department=dept,
        first_name="Other",
        last_name="Student",
    )

    doc1 = KnowledgeDocument.objects.create(
        department=dept,
        title="B.Tech Academic Regulations & Attendance Norms (2026-27)",
        category=KnowledgeDocument.Category.ACADEMIC_REGULATION,
        tags="attendance, detention, passing, cie, condonation",
        content=(
            "Every student must maintain a minimum attendance of 75% in each registered course. "
            "Students having attendance between 65% and 74.9% may be considered for condonation. "
            "Students below 65% will be detained from Semester End Examination. "
            "Students must secure minimum 40% in Continuous Internal Evaluation (CIE)."
        ),
        is_active=True,
    )

    doc2 = KnowledgeDocument.objects.create(
        department=dept,
        title="B.Tech Capstone Project Manual & Similarity Policy",
        category=KnowledgeDocument.Category.PROJECT_GUIDELINES,
        tags="project, capstone, similarity, duplicate, ieee, viva",
        content=(
            "All capstone project proposals undergo automated TF-IDF similarity checking. "
            "Proposals with similarity >= 60% are flagged for duplicate idea revision. "
            "The project has 5 standard milestones including synopsis, mid-term, and final viva."
        ),
        is_active=True,
    )

    return {
        "dept": dept,
        "hod": hod,
        "student": student,
        "other_student": other_student,
        "doc1": doc1,
        "doc2": doc2,
    }


@pytest.mark.django_db
def test_retrieve_relevant_knowledge(assistant_setup):
    results = retrieve_relevant_knowledge("What is the mandatory attendance percentage?", top_k=2)
    assert len(results) > 0
    top_doc = results[0]
    assert "Attendance" in top_doc["title"]
    assert top_doc["score"] > 0
    assert "75%" in top_doc["content"]


@pytest.mark.django_db
def test_retrieve_no_match():
    results = retrieve_relevant_knowledge("completely irrelevant quantum astrophysics term xyz123")
    assert len(results) == 0


@pytest.mark.django_db
def test_ask_assistant_service(assistant_setup):
    student = assistant_setup["student"]
    result = ask_assistant(student, "What are the rules regarding student attendance and detention?")

    assert "response" in result
    assert "sources" in result
    assert "mode" in result
    assert len(result["sources"]) > 0
    assert "75%" in result["response"]

    # Verify ChatMessage was saved
    chat = ChatMessage.objects.filter(user=student).first()
    assert chat is not None
    assert chat.query == "What are the rules regarding student attendance and detention?"
    assert len(chat.sources) > 0


@pytest.mark.django_db
def test_assistant_chat_api(api_client, assistant_setup):
    student = assistant_setup["student"]
    api_client.force_authenticate(user=student)

    payload = {"query": "Tell me about capstone project duplicate similarity rules"}
    res = api_client.post("/api/v1/assistant/chat/", payload, format="json")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert "response" in data
    assert "sources" in data
    assert "mode" in data
    assert any("60%" in s.get("snippet", "") or "Capstone" in s["title"] for s in data["sources"])


@pytest.mark.django_db
def test_assistant_chat_api_empty_query(api_client, assistant_setup):
    student = assistant_setup["student"]
    api_client.force_authenticate(user=student)

    res = api_client.post("/api/v1/assistant/chat/", {"query": ""}, format="json")
    assert res.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_chat_history_isolation_and_delete(api_client, assistant_setup):
    student = assistant_setup["student"]
    other_student = assistant_setup["other_student"]

    # Student 1 asks a question
    ask_assistant(student, "How many milestones in capstone project?")

    # Other student checks history
    api_client.force_authenticate(user=other_student)
    res = api_client.get("/api/v1/assistant/history/")
    assert res.status_code == status.HTTP_200_OK
    assert len(res.json()) == 0

    # Student 1 checks history
    api_client.force_authenticate(user=student)
    res = api_client.get("/api/v1/assistant/history/")
    assert res.status_code == status.HTTP_200_OK
    assert len(res.json()) == 1
    assert "milestones" in res.json()[0]["query"]

    # Student 1 clears history
    del_res = api_client.delete("/api/v1/assistant/history/")
    assert del_res.status_code == status.HTTP_200_OK

    # Student 1 checks history again
    res2 = api_client.get("/api/v1/assistant/history/")
    assert len(res2.json()) == 0


@pytest.mark.django_db
def test_knowledge_documents_viewset(api_client, assistant_setup):
    student = assistant_setup["student"]
    api_client.force_authenticate(user=student)

    res = api_client.get("/api/v1/assistant/documents/")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    docs = data.get("results", data)
    assert len(docs) >= 2

    # Filter by search
    res_search = api_client.get("/api/v1/assistant/documents/?search=attendance")
    assert res_search.status_code == status.HTTP_200_OK
    search_data = res_search.json()
    search_docs = search_data.get("results", search_data)
    assert any("Attendance" in d["title"] for d in search_docs)

    # Filter by category
    res_cat = api_client.get(f"/api/v1/assistant/documents/?category={KnowledgeDocument.Category.PROJECT_GUIDELINES}")
    assert res_cat.status_code == status.HTTP_200_OK
    cat_data = res_cat.json()
    cat_docs = cat_data.get("results", cat_data)
    assert all(d["category"] == KnowledgeDocument.Category.PROJECT_GUIDELINES for d in cat_docs)
