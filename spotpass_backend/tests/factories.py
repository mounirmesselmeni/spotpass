"""
Factory Boy factories for creating test data
"""

import uuid
from datetime import date, time, timedelta

import factory

from accounts.models import Account
from clients.models import Client
from establishments.models import Establishment
from reservations.models import Reservation, ReservationSource, ReservationStatus
from tables.models import Table, TableType, Zone
from users.models import BoUser, User


class BaseFactory(factory.Factory):
    """Base factory with common configuration"""

    class Meta:
        abstract = True

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Override create to handle SQLModel"""
        session = kwargs.pop("session", None)
        obj = model_class(*args, **kwargs)

        if session:
            session.add(obj)
            session.flush()
            session.refresh(obj)

        return obj


class AccountFactory(BaseFactory):
    """Factory for creating Account instances"""

    class Meta:
        model = Account

    name = factory.Sequence(lambda n: f"Account {n}")
    multi_establishment = False
    country_code = "US"
    currency = "USD"
    timezone = "UTC"


class EstablishmentFactory(BaseFactory):
    """Factory for creating Establishment instances"""

    class Meta:
        model = Establishment

    uuid = factory.LazyFunction(uuid.uuid4)
    name = factory.Sequence(lambda n: f"Restaurant {n}")
    address = factory.Faker("address")
    account_id = 1  # Default, should be overridden

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Override create to handle account creation"""
        session = kwargs.get("session")

        # If no account_id provided, create one
        if "account_id" not in kwargs:
            if session:
                account = AccountFactory(session=session)
                kwargs["account_id"] = account.id

        return super()._create(model_class, *args, **kwargs)


class ZoneFactory(BaseFactory):
    """Factory for creating Zone instances"""

    class Meta:
        model = Zone

    uuid = factory.LazyFunction(uuid.uuid4)
    name = factory.Sequence(lambda n: f"Zone {n}")
    establishment_id = 1  # Default
    account_id = 1  # Default

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Override create to handle establishment"""
        session = kwargs.get("session")
        establishment = kwargs.pop("establishment", None)

        if establishment:
            kwargs["establishment_id"] = establishment.id
            kwargs["account_id"] = establishment.account_id
        elif session and ("establishment_id" not in kwargs or kwargs.get("establishment_id") == 1):
            establishment = EstablishmentFactory(session=session)
            kwargs["establishment_id"] = establishment.id
            kwargs["account_id"] = establishment.account_id

        return super()._create(model_class, *args, **kwargs)


class TableFactory(BaseFactory):
    """Factory for creating Table instances"""

    class Meta:
        model = Table

    uuid = factory.LazyFunction(uuid.uuid4)
    name = factory.Sequence(lambda n: f"Table {n}")
    type = TableType.TABLE
    description = factory.Faker("text", max_nb_chars=100)
    min_capacity = 2
    max_capacity = 4
    is_on_service = True
    establishment_id = 1  # Default
    account_id = 1  # Default
    zone_id = None

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Override create to handle establishment and zone"""
        session = kwargs.get("session")
        establishment = kwargs.pop("establishment", None)
        zone = kwargs.pop("zone", None)

        if establishment:
            kwargs["establishment_id"] = establishment.id
            kwargs["account_id"] = establishment.account_id
        elif session and ("establishment_id" not in kwargs or kwargs.get("establishment_id") == 1):
            establishment = EstablishmentFactory(session=session)
            kwargs["establishment_id"] = establishment.id
            kwargs["account_id"] = establishment.account_id

        if zone:
            kwargs["zone_id"] = zone.id

        return super()._create(model_class, *args, **kwargs)


class ClientFactory(BaseFactory):
    """Factory for creating Client instances"""

    class Meta:
        model = Client

    uuid = factory.LazyFunction(uuid.uuid4)
    full_name = factory.Faker("name")
    email = factory.Faker("email")
    phone_number = factory.Faker("phone_number")
    messenger_id = factory.Sequence(lambda n: f"messenger_{n}")
    is_vip = False
    is_loyal = False
    is_blacklisted = False
    establishment_id = 1  # Default
    account_id = 1  # Default

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Override create to handle establishment"""
        session = kwargs.get("session")
        establishment = kwargs.pop("establishment", None)

        if establishment:
            kwargs["establishment_id"] = establishment.id
            kwargs["account_id"] = establishment.account_id
        elif session and ("establishment_id" not in kwargs or kwargs.get("establishment_id") == 1):
            establishment = EstablishmentFactory(session=session)
            kwargs["establishment_id"] = establishment.id
            kwargs["account_id"] = establishment.account_id

        return super()._create(model_class, *args, **kwargs)


class ReservationFactory(BaseFactory):
    """Factory for creating Reservation instances"""

    class Meta:
        model = Reservation

    uuid = factory.LazyFunction(uuid.uuid4)
    reference = factory.Sequence(lambda n: f"REF{n:06d}")
    number_of_guests = 2
    reservation_date = factory.LazyFunction(lambda: date.today() + timedelta(days=1))
    reservation_time = factory.LazyFunction(lambda: time(19, 0))
    special_request = factory.Faker("text", max_nb_chars=100)
    note = ""
    status = ReservationStatus.PENDING
    source = ReservationSource.BACKOFFICE
    no_show = False
    establishment_id = 1  # Default
    client_id = 1  # Default
    account_id = 1  # Default
    table_id = None

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Override create to handle establishment, client, and table"""
        session = kwargs.get("session")
        establishment = kwargs.pop("establishment", None)
        client = kwargs.pop("client", None)
        table = kwargs.pop("table", None)

        if establishment:
            kwargs["establishment_id"] = establishment.id
            kwargs["account_id"] = establishment.account_id
        elif session and ("establishment_id" not in kwargs or kwargs.get("establishment_id") == 1):
            establishment = EstablishmentFactory(session=session)
            kwargs["establishment_id"] = establishment.id
            kwargs["account_id"] = establishment.account_id

        if client:
            kwargs["client_id"] = client.id
        elif session and ("client_id" not in kwargs or kwargs.get("client_id") == 1):
            client = ClientFactory(session=session)
            kwargs["client_id"] = client.id

        if table:
            kwargs["table_id"] = table.id

        return super()._create(model_class, *args, **kwargs)


class UserFactory(BaseFactory):
    """Factory for creating User (staff) instances"""

    class Meta:
        model = User

    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    email = factory.Faker("email")
    password = "password123"
    disabled = False
    role = "admin"
    account_id = 1  # Default

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Hash password after creation"""
        session = kwargs.get("session")

        # Create account if needed
        if "account_id" not in kwargs or kwargs.get("account_id") == 1:
            if session:
                account = AccountFactory(session=session)
                kwargs["account_id"] = account.id

        # Create the user but DON'T hash yet (password is plain)
        obj = model_class(*args, **kwargs)

        # Now hash the password
        obj.hash_password()

        if session:
            session.add(obj)
            session.flush()
            session.refresh(obj)

        return obj


class BoUserFactory(BaseFactory):
    """Factory for creating BoUser (back office) instances"""

    class Meta:
        model = BoUser

    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    email = factory.Faker("email")
    password = "password123"
    disabled = False

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Hash password after creation"""
        session = kwargs.get("session")

        # Create the user but DON'T hash yet (password is plain)
        obj = model_class(*args, **kwargs)

        # Now hash the password
        obj.hash_password()

        if session:
            session.add(obj)
            session.flush()
            session.refresh(obj)

        return obj
