# core/validators.py
import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

class StrongPasswordValidator:
    def validate(self, password, user=None):
        if not re.search(r"[A-Z]", password): raise ValidationError(_("Incluye al menos 1 mayúscula."))
        if not re.search(r"[a-z]", password): raise ValidationError(_("Incluye al menos 1 minúscula."))
        if not re.search(r"\d", password):    raise ValidationError(_("Incluye al menos 1 dígito."))
        if not re.search(r"[^\w\s]", password): raise ValidationError(_("Incluye al menos 1 símbolo."))
    def get_help_text(self):
        return _("Debe contener mayúsculas, minúsculas, dígitos y símbolos.")

# settings.py
AUTH_PASSWORD_VALIDATORS += [{"NAME": "core.validators.StrongPasswordValidator"}]
