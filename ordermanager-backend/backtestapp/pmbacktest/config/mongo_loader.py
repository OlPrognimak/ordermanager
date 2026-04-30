"""Load run configuration documents from MongoDB ``backtest.config``."""

from __future__ import annotations

from typing import Any, Mapping

try:
    from bson import ObjectId
    from bson.errors import InvalidId
    from pymongo import MongoClient
    from pymongo.errors import PyMongoError
except ImportError as e:  # pragma: no cover - optional dependency
    ObjectId = None  # type: ignore[misc, assignment]
    InvalidId = Exception  # type: ignore[misc, assignment]
    MongoClient = None  # type: ignore[misc, assignment]
    PyMongoError = Exception  # type: ignore[misc, assignment]
    _IMPORT_ERROR = e
else:
    _IMPORT_ERROR = None


def _require_pymongo() -> None:
    if MongoClient is None:
        raise ImportError(
            "pymongo is required for MongoDB config. Install with: pip install 'pmbacktest[mongodb]'"
        ) from _IMPORT_ERROR


def load_config_document(
    uri: str,
    *,
    config_db: str = "backtest",
    config_collection: str = "config",
    name: str | None = None,
    document_id: str | None = None,
    extra_filter: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Fetch a single configuration document from ``{config_db}.{config_collection}``.

    Resolution order:

    1. ``document_id`` — hex ``ObjectId`` string (field ``_id``).
    2. ``name`` — document with field ``name`` or ``key`` equal to ``name`` (first match).
    3. ``extra_filter`` — pass-through PyMongo filter; must match exactly one document.

    Returns a plain ``dict`` (BSON types normalized where needed). The document should mirror
    the JSON run config shape (``strategy``, ``execution``, ``risk``, ``data`` / ``data_path``, …).
    """
    _require_pymongo()
    assert MongoClient is not None and ObjectId is not None

    client = MongoClient(uri)
    try:
        coll = client[config_db][config_collection]
        doc: dict[str, Any] | None = None
        if document_id is not None:
            try:
                oid = ObjectId(document_id)
            except InvalidId as e:
                raise ValueError(f"Invalid MongoDB ObjectId: {document_id!r}") from e
            doc = coll.find_one({"_id": oid})
        elif name is not None:
            doc = coll.find_one({"$or": [{"name": name}, {"key": name}]})
        elif extra_filter is not None:
            docs = list(coll.find(dict(extra_filter)))
            if len(docs) != 1:
                raise ValueError(
                    f"extra_filter must match exactly one document, got {len(docs)}"
                )
            doc = docs[0]
        else:
            raise ValueError("Provide document_id, name, or extra_filter")

        if doc is None:
            raise FileNotFoundError("No matching config document in MongoDB")

        out = dict(doc)
        out.pop("_id", None)
        return out
    except PyMongoError as e:
        raise RuntimeError(f"MongoDB config read failed: {e}") from e
    finally:
        client.close()
