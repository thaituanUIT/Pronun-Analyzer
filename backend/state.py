import json
import os
import sqlite3
import threading
from collections.abc import MutableMapping
from typing import Dict, Iterator

JOB_STATE_DB = os.getenv("JOB_STATE_DB", os.path.abspath(os.path.join(os.getcwd(), "data", "jobs.sqlite3")))


class PersistentJob(dict):
    def __init__(self, store: "PersistentJobStore", job_id: str, payload: Dict):
        super().__init__(payload)
        self._store = store
        self._job_id = job_id

    def __setitem__(self, key, value):
        super().__setitem__(key, value)
        self._store[self._job_id] = dict(self)

    def update(self, *args, **kwargs):
        super().update(*args, **kwargs)
        self._store[self._job_id] = dict(self)


class PersistentJobStore(MutableMapping):
    def __init__(self, job_type: str, db_path: str = JOB_STATE_DB):
        self.job_type = job_type
        self.db_path = db_path
        self._lock = threading.RLock()
        self._init_db()

    def _connect(self):
        return sqlite3.connect(self.db_path, timeout=30)

    def _init_db(self):
        directory = os.path.dirname(self.db_path)
        if directory:
            os.makedirs(directory, exist_ok=True)

        with self._lock, self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS jobs (
                    job_type TEXT NOT NULL,
                    job_id TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (job_type, job_id)
                )
                """
            )
            conn.commit()

    def __getitem__(self, job_id: str) -> PersistentJob:
        with self._lock, self._connect() as conn:
            row = conn.execute(
                "SELECT payload FROM jobs WHERE job_type = ? AND job_id = ?",
                (self.job_type, job_id),
            ).fetchone()

        if row is None:
            raise KeyError(job_id)

        return PersistentJob(self, job_id, json.loads(row[0]))

    def __setitem__(self, job_id: str, payload: Dict) -> None:
        serialized = json.dumps(payload)
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                INSERT INTO jobs (job_type, job_id, payload, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(job_type, job_id) DO UPDATE SET
                    payload = excluded.payload,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (self.job_type, job_id, serialized),
            )
            conn.commit()

    def __delitem__(self, job_id: str) -> None:
        with self._lock, self._connect() as conn:
            cursor = conn.execute(
                "DELETE FROM jobs WHERE job_type = ? AND job_id = ?",
                (self.job_type, job_id),
            )
            conn.commit()

        if cursor.rowcount == 0:
            raise KeyError(job_id)

    def __iter__(self) -> Iterator[str]:
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                "SELECT job_id FROM jobs WHERE job_type = ? ORDER BY updated_at DESC",
                (self.job_type,),
            ).fetchall()
        return iter(row[0] for row in rows)

    def __len__(self) -> int:
        with self._lock, self._connect() as conn:
            row = conn.execute(
                "SELECT COUNT(*) FROM jobs WHERE job_type = ?",
                (self.job_type,),
            ).fetchone()
        return int(row[0])

    def __contains__(self, job_id: object) -> bool:
        if not isinstance(job_id, str):
            return False

        with self._lock, self._connect() as conn:
            row = conn.execute(
                "SELECT 1 FROM jobs WHERE job_type = ? AND job_id = ?",
                (self.job_type, job_id),
            ).fetchone()
        return row is not None


transcription_jobs = PersistentJobStore("transcription")
pronunciation_jobs = PersistentJobStore("pronunciation")
