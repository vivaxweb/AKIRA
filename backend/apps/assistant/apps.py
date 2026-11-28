from django.apps import AppConfig
from django.db.models.signals import post_migrate


def auto_seed_on_migration(sender, **kwargs):
    """
    Automatically seed demo data on fresh clone/migration if database is empty.
    Fires after apps.assistant (the final app) finishes migrating.
    """
    if sender.name == "apps.assistant":
        try:
            from apps.accounts.models import User
            if not User.objects.filter(email="hodcse@tkietwarana.ac.in").exists():
                from django.core.management import call_command
                call_command("seed_demo")
        except Exception:
            pass


class AssistantConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.assistant'
    label = 'assistant'

    def ready(self):
        post_migrate.connect(auto_seed_on_migration, sender=self)
