from celery import Celery
from celery.schedules import crontab
from kombu import Exchange, Queue

app = Celery("dhruva_celery")

# Remove the worker_state_db default setting
# app.conf.setdefault('worker_state_db', '/var/run/celery/worker-state')
app.conf.setdefault('worker_prefetch_multiplier', 1)
# Add other defaults if needed, e.g., concurrency
# app.conf.setdefault('worker_concurrency', None)

# Now load the rest of the config
app.config_from_object("celery_backend.celeryconfig", namespace="CELERY")
app.autodiscover_tasks()

print("🌱 v3: Celery app config initialized (worker_state_db removed)")
# print(f"→ worker_state_db: {app.conf.worker_state_db}") # Keep this commented out for now
# print(f"→ worker_prefetch_multiplier: {app.conf.worker_prefetch_multiplier}")


app.conf.beat_schedule = {
    "heartbeat": {
        "task": "heartbeat",
        "schedule": 300.0,
        "options": {"queue": "heartbeat"},
    },
    "upload-feedback-dump": {
        "task": "upload.feedback.dump",
        "schedule": crontab(day_of_month="1", hour="6", minute="30"),  # in utc
        "options": {"queue": "upload-feedback-dump"},
    },
    "send-usage-email": {
        "task": "send.usage.email",
        "schedule": crontab(day_of_week="1", hour="3", minute="0"),  # in utc
        "options": {"queue": "send-usage-email"},
    },
}

app.conf.task_queues = (
    Queue("data-log", exchange=Exchange("logs", type="direct")),
    Queue("metrics-log", exchange=Exchange("metrics", type="direct")),
    Queue("heartbeat", exchange=Exchange("heartbeat", type="direct")),
    Queue(
        "upload-feedback-dump", exchange=Exchange("upload-feedback-dump", type="direct")
    ),
    Queue("send-usage-email", exchange=Exchange("send-usage-email", type="direct")),
)

# Defaults
# app.conf.task_default_queue = 'celery'
# app.conf.task_default_exchange = 'tasks'
# app.conf.task_default_exchange_type = 'task_type'
# app.conf.task_default_routing_key = 'log_data'

# TODO: Use Task routes instead of sending route for each task
# Documented methods are not working. Needs time
# app.conf.task_routes = ([
#     ('log_data', {'queue': 'data_log'}),  # , 'routing_key': 'log_data'
# ])
