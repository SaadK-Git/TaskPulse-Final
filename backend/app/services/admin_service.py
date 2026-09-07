from app.models import user, job
from app.enums import JobStatus, JobType

def get_AllUsers(
        db,
        page: int = 1,
        page_size: int = 10,
        state : bool = True
):
    # Calculate the offset for pagination
    offset = (page - 1) * page_size

    # Query to get users based on the state
    users_query = db.query(user.User).filter(user.User.is_active == state)

    # Get total count of users matching the state
    total_users = users_query.count()

    # Apply pagination
    users = users_query.offset(offset).limit(page_size).all()

    return {
        "total_users": total_users,
        "page": page,
        "page_size": page_size,
        "users": users
    }

def get_all_jobs(
        db,
        page: int = 1,
        page_size: int = 10,
        jobtype: str = "",
        state: bool = True
):
    # Calculate the offset for pagination
    offset = (page - 1) * page_size

    # Base query — this line was missing entirely, which is what caused
    # the NameError every time this endpoint was hit
    jobs_query = db.query(job.Job)

    # Apply filtering
    if jobtype != "":
        jobs_query = jobs_query.filter(job.Job.job_type == JobType(jobtype))

    # Get total count of jobs matching the filters
    total_jobs = jobs_query.count()

    # Apply pagination
    jobs = jobs_query.offset(offset).limit(page_size).all()

    return {
        "total_jobs": total_jobs,
        "page": page,
        "page_size": page_size,
        "jobs": jobs
    }

def deactivate_User(db,user_id:int):
    user_to_deactivate = db.query(user.User).filter(user.User.id == user_id).first()

    if not user_to_deactivate:
        raise ValueError(f"User with ID {user_id} not found")
    if user_to_deactivate.is_active == False:
        raise ValueError(f"User with ID {user_id} is already deactivated")

    user_to_deactivate.is_active = False
    db.commit()
    db.refresh(user_to_deactivate)

    return user_to_deactivate

def activate_User(db,user_id:int):
    user_to_activate = db.query(user.User).filter(user.User.id == user_id).first()

    if not user_to_activate:
        raise ValueError(f"User with ID {user_id} not found")
    if user_to_activate.is_active == True:
        raise ValueError(f"User with ID {user_id} is already activated")

    user_to_activate.is_active = True
    db.commit()
    db.refresh(user_to_activate)

    return user_to_activate