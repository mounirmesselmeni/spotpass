"""
SpotPass Backend CLI
Command-line interface for managing the SpotPass Backend
"""

import sys
from pathlib import Path

# Add current directory to path so imports work
sys.path.insert(0, str(Path(__file__).parent))

from datetime import date, time

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from sqlmodel import Session, select

from accounts.models import Account
from clients.models import Client
from core.database import engine
from core.security import hash_password
from establishments.models import Establishment
from reservations.models import Reservation
from tables.models import Table as TableModel
from tables.models import TableType, Zone
from users.models import BoUser, User, UserRole

app = typer.Typer(
    name="spotpass",
    help="SpotPass Backend CLI - Manage your restaurant reservation system",
    add_completion=False,
)
console = Console()


@app.command()
def init_db(
    force: bool = typer.Option(
        False, "--force", "-f", help="Force recreate database (WARNING: deletes all data)"
    ),
):
    """Initialize the database with sample data (idempotent)"""

    from core.database import create_db_and_tables

    if force:
        console.print("[yellow]⚠️  Force mode: Recreating database...[/yellow]")
        # Drop and recreate
        from sqlmodel import SQLModel

        SQLModel.metadata.drop_all(engine)

    # Create tables
    console.print("[blue]📦 Creating database tables...[/blue]")
    create_db_and_tables()
    console.print("[green]✅ Database tables created[/green]\n")

    with Session(engine) as session:
        # Check if data already exists
        existing_account = session.exec(select(Account)).first()
        if existing_account and not force:
            console.print("[yellow]⚠️  Database already has data. Use --force to recreate.[/yellow]")
            return

        # Create initial data
        console.print("[blue]🌱 Creating initial data...[/blue]\n")

        # 1. Create Account
        account = Account(
            name="Demo Restaurant", country_code="US", currency="USD", timezone="America/New_York"
        )
        session.add(account)
        session.flush()

        console.print(f"[green]✓[/green] Account: {account.name}")

        # 2. Create Establishment
        establishment = Establishment(
            name="Main Restaurant",
            address="123 Main Street, New York, NY 10001",
            account_id=account.id,
        )
        session.add(establishment)
        session.flush()

        console.print(f"[green]✓[/green] Establishment: {establishment.name}")

        # 3. Create Back Office User
        bo_user = BoUser(
            first_name="Admin",
            last_name="User",
            email="admin@spotpass.com",
            password=hash_password("admin123"),  # Hash directly, don't use model method
        )
        session.add(bo_user)
        session.flush()

        console.print(f"[green]✓[/green] Back Office User: {bo_user.email}")

        # 4. Create Staff Users
        staff_users = [
            {
                "first_name": "Manager",
                "last_name": "One",
                "email": "manager@spotpass.com",
                "password": "manager123",
                "role": UserRole.ADMIN,
            },
            {
                "first_name": "Staff",
                "last_name": "User",
                "email": "staff@spotpass.com",
                "password": "staff123",
                "role": UserRole.READ_ONLY,
            },
        ]

        created_staff = []
        for user_data in staff_users:
            user = User(
                first_name=user_data["first_name"],
                last_name=user_data["last_name"],
                email=user_data["email"],
                password=hash_password(user_data["password"]),  # Hash directly
                account_id=account.id,
                role=user_data["role"],
            )
            session.add(user)
            session.flush()
            created_staff.append(user)
            console.print(f"[green]✓[/green] Staff User: {user.email} ({user.role.value})")

        # 5. Create Zones
        zones = [
            {"name": "Main Dining", "establishment_id": establishment.id},
            {"name": "Terrace", "establishment_id": establishment.id},
            {"name": "Bar Area", "establishment_id": establishment.id},
        ]

        created_zones = []
        for zone_data in zones:
            zone = Zone(
                name=zone_data["name"],
                establishment_id=zone_data["establishment_id"],
                account_id=account.id,
            )
            session.add(zone)
            session.flush()
            created_zones.append(zone)
            console.print(f"[green]✓[/green] Zone: {zone.name}")

        # 6. Create Tables
        tables_data = [
            {
                "name": "Table 1",
                "zone": created_zones[0],
                "min": 2,
                "max": 4,
                "type": TableType.TABLE,
            },
            {
                "name": "Table 2",
                "zone": created_zones[0],
                "min": 2,
                "max": 4,
                "type": TableType.TABLE,
            },
            {
                "name": "Table 3",
                "zone": created_zones[0],
                "min": 4,
                "max": 6,
                "type": TableType.TABLE,
            },
            {
                "name": "Table 4",
                "zone": created_zones[1],
                "min": 2,
                "max": 4,
                "type": TableType.TABLE,
            },
            {
                "name": "Table 5",
                "zone": created_zones[1],
                "min": 4,
                "max": 8,
                "type": TableType.TABLE,
            },
            {
                "name": "Bar Seat 1",
                "zone": created_zones[2],
                "min": 1,
                "max": 2,
                "type": TableType.TABLE,
            },
            {
                "name": "Bar Seat 2",
                "zone": created_zones[2],
                "min": 1,
                "max": 2,
                "type": TableType.TABLE,
            },
        ]

        for table_data in tables_data:
            table = TableModel(
                name=table_data["name"],
                type=table_data["type"],
                min_capacity=table_data["min"],
                max_capacity=table_data["max"],
                zone_id=table_data["zone"].id,
                establishment_id=establishment.id,
                account_id=account.id,
            )
            session.add(table)
            console.print(
                f"[green]✓[/green] Table: {table.name} ({table.min_capacity}-{table.max_capacity} guests)"
            )

        session.flush()

        # 7. Create Sample Clients
        clients_data = [
            {
                "full_name": "John Doe",
                "email": "john@example.com",
                "phone_number": "+1-555-0101",
                "is_vip": True,
            },
            {
                "full_name": "Jane Smith",
                "email": "jane@example.com",
                "phone_number": "+1-555-0102",
                "is_vip": False,
            },
            {
                "full_name": "Bob Johnson",
                "email": "bob@example.com",
                "phone_number": "+1-555-0103",
                "is_vip": False,
            },
        ]

        created_clients = []
        for client_data in clients_data:
            client = Client(
                full_name=client_data["full_name"],
                email=client_data["email"],
                phone_number=client_data["phone_number"],
                is_vip=client_data["is_vip"],
                establishment_id=establishment.id,
                account_id=account.id,
            )
            session.add(client)
            session.flush()
            created_clients.append(client)
            vip_badge = " [gold]⭐ VIP[/gold]" if client.is_vip else ""
            console.print(f"[green]✓[/green] Client: {client.full_name}{vip_badge}")

        # 8. Create Sample Reservations
        from datetime import timedelta

        tomorrow = date.today() + timedelta(days=1)

        reservations_data = [
            {
                "client": created_clients[0],
                "guests": 2,
                "date": tomorrow,
                "time": time(19, 0),
                "request": "Window seat please",
            },
            {
                "client": created_clients[1],
                "guests": 4,
                "date": tomorrow,
                "time": time(20, 0),
                "request": "Birthday celebration",
            },
        ]

        for idx, res_data in enumerate(reservations_data):
            reservation = Reservation(
                reference=f"REF{1000 + idx}",
                number_of_guests=res_data["guests"],
                reservation_date=res_data["date"],
                reservation_time=res_data["time"],
                special_request=res_data["request"],
                client_id=res_data["client"].id,
                establishment_id=establishment.id,
                account_id=account.id,
            )
            session.add(reservation)
            console.print(
                f"[green]✓[/green] Reservation: {reservation.reference} - "
                f"{res_data['client'].full_name} ({res_data['guests']} guests)"
            )

        # Commit all changes
        session.commit()

        console.print("\n[green]✅ All initial data created successfully![/green]\n")

        # Display credentials table
        credentials_table = Table(
            title="🔑 Login Credentials", show_header=True, header_style="bold magenta"
        )
        credentials_table.add_column("Role", style="cyan", width=15)
        credentials_table.add_column("Email", style="white", width=25)
        credentials_table.add_column("Password", style="yellow", width=15)
        credentials_table.add_column("Access", style="green")

        credentials_table.add_row(
            "Back Office", "admin@spotpass.com", "admin123", "Full admin access"
        )
        credentials_table.add_row(
            "Manager", "manager@spotpass.com", "manager123", "Staff with admin role"
        )
        credentials_table.add_row(
            "Staff", "staff@spotpass.com", "staff123", "Staff with read-only role"
        )

        console.print(credentials_table)
        console.print()

        # Display summary
        summary_table = Table(
            title="📊 Database Summary", show_header=True, header_style="bold cyan"
        )
        summary_table.add_column("Entity", style="cyan")
        summary_table.add_column("Count", justify="right", style="green")

        summary_table.add_row("Accounts", "1")
        summary_table.add_row("Establishments", "1")
        summary_table.add_row("Back Office Users", "1")
        summary_table.add_row("Staff Users", "2")
        summary_table.add_row("Zones", "3")
        summary_table.add_row("Tables", "7")
        summary_table.add_row("Clients", "3")
        summary_table.add_row("Reservations", "2")

        console.print(summary_table)
        console.print()

        # API endpoints
        console.print(
            Panel.fit(
                "[bold cyan]🚀 Next Steps[/bold cyan]\n\n"
                "1. Start the server:\n"
                "   [yellow]uvicorn main:app --reload --port 5001[/yellow]\n\n"
                "2. Visit the API docs:\n"
                "   [blue]http://localhost:5001/docs[/blue]\n\n"
                "3. Login with credentials above to get JWT token\n\n"
                "4. Use the token to test authenticated endpoints",
                title="✨ Setup Complete!",
                border_style="green",
            )
        )


@app.command()
def reset_db():
    """Reset the database (drop all tables and recreate with sample data)"""

    if not typer.confirm("⚠️  This will DELETE ALL DATA. Are you sure?"):
        console.print("[yellow]Cancelled.[/yellow]")
        raise typer.Abort()

    # Call init_db with force=True
    init_db(force=True)


@app.command()
def list_users():
    """List all users in the database"""

    with Session(engine) as session:
        # Back Office Users
        bo_users = session.exec(select(BoUser)).all()
        staff_users = session.exec(select(User)).all()

        if bo_users:
            bo_table = Table(
                title="🔐 Back Office Users", show_header=True, header_style="bold magenta"
            )
            bo_table.add_column("ID", style="cyan", width=5)
            bo_table.add_column("Name", style="white", width=25)
            bo_table.add_column("Email", style="yellow", width=30)
            bo_table.add_column("Status", style="green", width=10)

            for user in bo_users:
                status = "Disabled" if user.disabled else "Active"
                style = "red" if user.disabled else "green"
                bo_table.add_row(
                    str(user.id),
                    f"{user.first_name} {user.last_name}",
                    user.email,
                    f"[{style}]{status}[/{style}]",
                )

            console.print(bo_table)
            console.print()

        if staff_users:
            staff_table = Table(title="👥 Staff Users", show_header=True, header_style="bold cyan")
            staff_table.add_column("ID", style="cyan", width=5)
            staff_table.add_column("Name", style="white", width=25)
            staff_table.add_column("Email", style="yellow", width=30)
            staff_table.add_column("Role", style="magenta", width=15)
            staff_table.add_column("Status", style="green", width=10)

            for user in staff_users:
                status = "Disabled" if user.disabled else "Active"
                style = "red" if user.disabled else "green"
                staff_table.add_row(
                    str(user.id),
                    f"{user.first_name} {user.last_name}",
                    user.email,
                    user.role.value,
                    f"[{style}]{status}[/{style}]",
                )

            console.print(staff_table)

        if not bo_users and not staff_users:
            console.print(
                "[yellow]No users found. Run 'spotpass init-db' to create initial data.[/yellow]"
            )


@app.command()
def version():
    """Show version information"""
    console.print("[bold cyan]SpotPass Backend[/bold cyan] version [green]0.1.0[/green]")
    console.print("FastAPI + SQLModel + Pydantic")


if __name__ == "__main__":
    app()
