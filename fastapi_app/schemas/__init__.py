from .common import *
from .auth import *
from .notes import *
from .tasks import *
from .events import *
from .habits import *
from .chronology import *
from .words import *
from .dashboard import *
from .settings import *
from .stickers import *
from .observations import *
from .dialectics import *
from .ai import *

# Rebuild models with circular dependencies
NoteView.model_rebuild()
StickyNoteView.model_rebuild()
