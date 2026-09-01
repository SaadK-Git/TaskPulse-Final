from pydantic import BaseModel, Field

class MemberDashboardSchema(BaseModel):
    total_jobs : int
    jobs_by_status : dict
    average_duration_by_type : dict

class AdmindashboardSchema(BaseModel):
    total_users : int
    total_jobs : int
    jobs_by_status : dict
    worker_status : dict

    