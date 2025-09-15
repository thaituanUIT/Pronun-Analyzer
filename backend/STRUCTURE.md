"""
Backend Structure Plan:

backend/
    main.py                # Entrypoint, creates FastAPI app, includes routers
    app.py                 # (Legacy, will be split)
    pronunciation_analyzer.py
    requirements.txt
    database/
        __init__.py        # DB logic or placeholder
    apis/
        __init__.py        # API business logic (handlers)
        transcription.py   # (to be created)
        pronunciation.py   # (to be created)
        tts.py             # (to be created)
    routers/
        __init__.py        # FastAPI routers
        transcription_router.py  # (to be created)
        pronunciation_router.py  # (to be created)
        tts_router.py           # (to be created)
    uploads/

- All endpoint logic moves from app.py to routers/ and apis/.
- main.py creates FastAPI app, includes routers.
- database/ for DB logic (placeholder for now).
"""
