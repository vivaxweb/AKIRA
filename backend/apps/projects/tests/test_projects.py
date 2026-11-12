import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.accounts.models import Department
from apps.projects.models import Project, ProjectMember, ProjectMilestone, SimilarityCheck
from apps.projects.similarity import check_project_similarity

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def department(db):
    dept, _ = Department.objects.get_or_create(name="Computer Science & Engineering", code="CSE")
    return dept


@pytest.fixture
def users(db, department):
    pwd = "TestPassword@123"
    hod = User.objects.create_user(
        email="hod_proj@demo.local",
        password=pwd,
        role=User.Role.HOD,
        department=department,
        first_name="HOD",
        last_name="CSE",
    )
    guide = User.objects.create_user(
        email="guide_proj@demo.local",
        password=pwd,
        role=User.Role.FACULTY,
        department=department,
        first_name="Guide",
        last_name="Faculty",
    )
    other_faculty = User.objects.create_user(
        email="other_faculty@demo.local",
        password=pwd,
        role=User.Role.FACULTY,
        department=department,
        first_name="Other",
        last_name="Faculty",
    )
    student1 = User.objects.create_user(
        email="student1_proj@demo.local",
        password=pwd,
        role=User.Role.STUDENT,
        department=department,
        first_name="Student",
        last_name="One",
    )
    student2 = User.objects.create_user(
        email="student2_proj@demo.local",
        password=pwd,
        role=User.Role.STUDENT,
        department=department,
        first_name="Student",
        last_name="Two",
    )
    return {
        "hod": hod,
        "guide": guide,
        "other_faculty": other_faculty,
        "student1": student1,
        "student2": student2,
    }


@pytest.mark.django_db
class TestSimilarityEngine:
    def test_empty_corpus_returns_zero(self):
        res = check_project_similarity("Autonomous Drone Navigation", "Using computer vision and ROS")
        assert res["max_score"] == 0.0
        assert res["is_flagged"] is False
        assert len(res["top_matches"]) == 0

    def test_duplicate_idea_flagged_above_threshold(self, department, users):
        # Create an existing project in repository
        Project.objects.create(
            department=department,
            title="Automated Crop Disease Detection using Deep Convolutional Neural Networks",
            abstract=(
                "This project proposes an automated agricultural system that uses deep convolutional "
                "neural networks (CNNs) to classify plant diseases from leaf imagery collected in orchards. "
                "ResNet and MobileNet architectures are evaluated for real-time mobile inference."
            ),
            domain="Machine Learning",
            batch_year=2025,
            team_leader=users["student1"],
            status=Project.Status.APPROVED,
        )

        # Propose duplicate / very similar idea
        duplicate_title = "Automated Crop Disease Detection with Deep Convolutional Neural Networks"
        duplicate_abstract = (
            "We present an automated agricultural system using deep convolutional neural networks (CNNs) "
            "to classify plant and crop leaf diseases from imagery using ResNet and MobileNet architectures."
        )

        res = check_project_similarity(duplicate_title, duplicate_abstract)
        assert res["max_score"] >= 60.0
        assert res["is_flagged"] is True
        assert len(res["top_matches"]) >= 1
        assert res["top_matches"][0]["similarity_pct"] >= 60.0

    def test_distinct_idea_not_flagged(self, department, users):
        Project.objects.create(
            department=department,
            title="Automated Crop Disease Detection using Deep Convolutional Neural Networks",
            abstract="Agricultural leaf disease classification with deep CNNs.",
            domain="Machine Learning",
            batch_year=2025,
            team_leader=users["student1"],
            status=Project.Status.APPROVED,
        )

        distinct_title = "Decentralized Peer-to-Peer Renewable Energy Trading on Ethereum"
        distinct_abstract = (
            "This project presents a smart-contract architecture for microgrid prosumers to trade "
            "excess solar photovoltaic energy autonomously without centralized utility mediation."
        )

        res = check_project_similarity(distinct_title, distinct_abstract)
        assert res["max_score"] < 40.0
        assert res["is_flagged"] is False


@pytest.mark.django_db
class TestProjectEndpoints:
    def test_student_submit_project_creates_milestones_and_membership(self, api_client, users):
        api_client.force_authenticate(user=users["student1"])
        payload = {
            "title": "Smart Campus Parking Navigator using IoT Sensors",
            "abstract": "Real-time ultrasonic parking spot detection with MQTT telemetry and Flutter dashboard.",
            "domain": "IoT & Embedded",
            "batch_year": 2027,
            "academic_year": "2026-27",
            "member_ids": [users["student2"].id],
        }

        resp = api_client.post("/api/v1/projects/", payload, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        data = resp.data
        assert data["title"] == payload["title"]
        assert data["team_leader"] == users["student1"].id
        assert data["status"] == Project.Status.PROPOSED

        # Check members created
        project = Project.objects.get(id=data["id"])
        assert project.members.count() == 2
        assert project.milestones.count() == 5  # Standard 5 milestones created

    def test_status_change_permission(self, api_client, users, department):
        project = Project.objects.create(
            department=department,
            title="Supply Chain Provenance on Hyperledger Fabric",
            abstract="Permissioned blockchain tracking pharmaceutical distribution.",
            domain="Blockchain",
            batch_year=2026,
            team_leader=users["student1"],
            guide=users["guide"],
            status=Project.Status.PROPOSED,
        )

        # Student cannot change status
        api_client.force_authenticate(user=users["student1"])
        resp = api_client.post(f"/api/v1/projects/{project.id}/change-status/", {"status": "APPROVED"})
        assert resp.status_code == status.HTTP_403_FORBIDDEN

        # Unrelated faculty cannot change status
        api_client.force_authenticate(user=users["other_faculty"])
        resp = api_client.post(f"/api/v1/projects/{project.id}/change-status/", {"status": "APPROVED"})
        assert resp.status_code == status.HTTP_403_FORBIDDEN

        # Assigned guide can change status
        api_client.force_authenticate(user=users["guide"])
        resp = api_client.post(f"/api/v1/projects/{project.id}/change-status/", {"status": "APPROVED"})
        assert resp.status_code == status.HTTP_200_OK
        project.refresh_from_db()
        assert project.status == Project.Status.APPROVED

    def test_guide_milestone_sign_off(self, api_client, users, department):
        project = Project.objects.create(
            department=department,
            title="Federated Learning for Medical Record Privacy",
            abstract="Differential privacy in clinical health records.",
            domain="Machine Learning",
            batch_year=2026,
            team_leader=users["student1"],
            guide=users["guide"],
            status=Project.Status.IN_PROGRESS,
        )
        milestone = ProjectMilestone.objects.create(
            project=project,
            title="Synopsis & Problem Statement",
            order=1,
            is_completed=True,
        )

        # Student cannot sign off
        api_client.force_authenticate(user=users["student1"])
        resp = api_client.post(
            f"/api/v1/project-milestones/{milestone.id}/sign-off/",
            {"signed_off": True, "remarks": "Approved with comments."},
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

        # Guide can sign off
        api_client.force_authenticate(user=users["guide"])
        resp = api_client.post(
            f"/api/v1/project-milestones/{milestone.id}/sign-off/",
            {"signed_off": True, "remarks": "Excellent problem definition."},
        )
        assert resp.status_code == status.HTTP_200_OK
        milestone.refresh_from_db()
        assert milestone.guide_signed_off is True
        assert milestone.guide_remarks == "Excellent problem definition."

    def test_similarity_check_endpoint(self, api_client, users, department):
        Project.objects.create(
            department=department,
            title="Autonomous Drone Navigation with Computer Vision",
            abstract="Visual SLAM and obstacle avoidance with PX4 autopilot.",
            domain="Computer Vision",
            batch_year=2025,
            team_leader=users["student1"],
            status=Project.Status.COMPLETED,
        )

        api_client.force_authenticate(user=users["student2"])
        payload = {
            "title": "Autonomous Drone Obstacle Avoidance via Computer Vision",
            "abstract": "Visual SLAM system using PX4 and OpenCV for drone flight.",
        }
        resp = api_client.post("/api/v1/projects/similarity-check/", payload, format="json")
        assert resp.status_code == status.HTTP_200_OK
        assert "max_score" in resp.data
        assert "is_flagged" in resp.data
        assert "top_matches" in resp.data
        assert SimilarityCheck.objects.filter(input_title=payload["title"]).exists()
