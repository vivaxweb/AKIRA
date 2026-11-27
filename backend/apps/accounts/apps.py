from django.apps import AppConfig
from django.db.models.signals import post_migrate


def auto_seed_demo_if_empty(sender, **kwargs):
    if sender.name == "apps.accounts":
        try:
            from apps.accounts.models import User
            if not User.objects.filter(email="hodcse@tkietwarana.ac.in").exists():
                from django.core.management import call_command
                call_command("seed_demo")
        except Exception:
            pass


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.accounts'
    label = 'accounts'

    def ready(self):
        post_migrate.connect(auto_seed_demo_if_empty, sender=self)
