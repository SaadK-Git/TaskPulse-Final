from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    MEMBER = "member"


class JobType(str, Enum):
    ALL = ""
    DATA_PROCESSING = "data_processing"
    REPORT_GENERATION = "report_generation"
    BULK_EMAIL = "bulk_email"
    IMAGE_RESIZE = "image_resize"


class JobStatus(str, Enum):
    ALL = ""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobLogLevel(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"