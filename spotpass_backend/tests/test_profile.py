"""Tests for profile update and password change endpoints"""

from fastapi.testclient import TestClient
from sqlmodel import Session

from tests.factories import BoUserFactory, UserFactory


class TestStaffProfileUpdate:
    """Tests for staff profile update endpoint"""

    def test_update_staff_profile_first_name(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test updating staff user first name"""
        response = client.put(
            "/api/staff/auth/me",
            json={"first_name": "Updated"},
            headers=auth_headers_staff,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "Updated"

    def test_update_staff_profile_last_name(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test updating staff user last name"""
        response = client.put(
            "/api/staff/auth/me",
            json={"last_name": "NewLast"},
            headers=auth_headers_staff,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["last_name"] == "NewLast"

    def test_update_staff_profile_email(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test updating staff user email"""
        response = client.put(
            "/api/staff/auth/me",
            json={"email": "newemail@test.com"},
            headers=auth_headers_staff,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "newemail@test.com"

    def test_update_staff_profile_duplicate_email(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test updating staff user with duplicate email"""
        from accounts.models import Account

        account = Account(name="Other Account", country_code="US", currency="USD")
        session.add(account)
        session.flush()

        UserFactory(session=session, email="taken@test.com", account_id=account.id)
        session.commit()

        response = client.put(
            "/api/staff/auth/me",
            json={"email": "taken@test.com"},
            headers=auth_headers_staff,
        )

        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]

    def test_update_staff_profile_unauthorized(self, client: TestClient, session: Session):
        """Test updating staff profile without authentication"""
        response = client.put("/api/staff/auth/me", json={"first_name": "Updated"})

        assert response.status_code == 401


class TestBoProfileUpdate:
    """Tests for BO profile update endpoint"""

    def test_update_bo_profile(self, client: TestClient, session: Session, auth_headers_bo):
        """Test updating BO user profile"""
        response = client.put(
            "/api/bo/auth/me",
            json={"first_name": "Updated", "last_name": "Admin"},
            headers=auth_headers_bo,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "Updated"
        assert data["last_name"] == "Admin"

    def test_update_bo_profile_duplicate_email(
        self, client: TestClient, session: Session, auth_headers_bo
    ):
        """Test updating BO user with duplicate email"""
        BoUserFactory(session=session, email="taken@test.com")
        session.commit()

        response = client.put(
            "/api/bo/auth/me",
            json={"email": "taken@test.com"},
            headers=auth_headers_bo,
        )

        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]


class TestStaffPasswordChange:
    """Tests for staff password change endpoint"""

    def test_change_staff_password_success(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test successful staff password change"""
        response = client.post(
            "/api/staff/auth/change-password",
            json={"current_password": "password123", "new_password": "NewPassword123"},
            headers=auth_headers_staff,
        )

        assert response.status_code == 200
        assert "Password changed successfully" in response.json()["message"]

        # Verify new password works for login
        login_response = client.post(
            "/api/staff/auth/login",
            json={"email": "staff@test.com", "password": "NewPassword123"},
        )
        assert login_response.status_code == 200

    def test_change_staff_password_wrong_current(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test staff password change with wrong current password"""
        response = client.post(
            "/api/staff/auth/change-password",
            json={"current_password": "wrongpassword", "new_password": "NewPassword123"},
            headers=auth_headers_staff,
        )

        assert response.status_code == 400
        assert "Current password is incorrect" in response.json()["detail"]

    def test_change_staff_password_weak_new(
        self, client: TestClient, session: Session, auth_headers_staff
    ):
        """Test staff password change with weak new password"""
        response = client.post(
            "/api/staff/auth/change-password",
            json={"current_password": "password123", "new_password": "weak"},
            headers=auth_headers_staff,
        )

        assert response.status_code == 422

    def test_change_staff_password_unauthorized(self, client: TestClient, session: Session):
        """Test password change without authentication"""
        response = client.post(
            "/api/staff/auth/change-password",
            json={"current_password": "password123", "new_password": "NewPassword123"},
        )

        assert response.status_code == 401


class TestBoPasswordChange:
    """Tests for BO password change endpoint"""

    def test_change_bo_password_success(
        self, client: TestClient, session: Session, auth_headers_bo
    ):
        """Test successful BO password change"""
        response = client.post(
            "/api/bo/auth/change-password",
            json={"current_password": "password123", "new_password": "NewPassword123"},
            headers=auth_headers_bo,
        )

        assert response.status_code == 200
        assert "Password changed successfully" in response.json()["message"]

        # Verify new password works for login
        login_response = client.post(
            "/api/bo/auth/login",
            json={"email": "admin@test.com", "password": "NewPassword123"},
        )
        assert login_response.status_code == 200

    def test_change_bo_password_wrong_current(
        self, client: TestClient, session: Session, auth_headers_bo
    ):
        """Test BO password change with wrong current password"""
        response = client.post(
            "/api/bo/auth/change-password",
            json={"current_password": "wrongpassword", "new_password": "NewPassword123"},
            headers=auth_headers_bo,
        )

        assert response.status_code == 400
        assert "Current password is incorrect" in response.json()["detail"]
