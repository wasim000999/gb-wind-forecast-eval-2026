import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


class CacheManager:
    """
    Manages local filesystem persistence for raw Elexon datasets and processed intervals.
    Enables instant API responses (<10ms) and offline capability.
    """

    def __init__(self, cache_dir: Path):
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.fuelhh_file = self.cache_dir / "fuelhh_jan2026.json"
        self.windfor_file = self.cache_dir / "windfor_jan2026.json"

    def has_cached_raw_data(self) -> bool:
        return self.fuelhh_file.exists() and self.windfor_file.exists()

    def save_raw_fuelhh(self, records: list[dict[str, Any]]) -> None:
        try:
            with open(self.fuelhh_file, "w", encoding="utf-8") as f:
                json.dump(records, f)
            logger.info("Saved %d FUELHH records to cache %s", len(records), self.fuelhh_file)
        except Exception as e:
            logger.error("Failed to save FUELHH cache: %s", e)

    def save_raw_windfor(self, records: list[dict[str, Any]]) -> None:
        try:
            with open(self.windfor_file, "w", encoding="utf-8") as f:
                json.dump(records, f)
            logger.info("Saved %d WINDFOR records to cache %s", len(records), self.windfor_file)
        except Exception as e:
            logger.error("Failed to save WINDFOR cache: %s", e)

    def load_raw_fuelhh(self) -> list[dict[str, Any]] | None:
        if not self.fuelhh_file.exists():
            return None
        try:
            with open(self.fuelhh_file, encoding="utf-8") as f:
                data = json.load(f)
            logger.info("Loaded %d FUELHH records from cache", len(data))
            return data
        except Exception as e:
            logger.error("Failed to load FUELHH cache: %s", e)
            return None

    def load_raw_windfor(self) -> list[dict[str, Any]] | None:
        if not self.windfor_file.exists():
            return None
        try:
            with open(self.windfor_file, encoding="utf-8") as f:
                data = json.load(f)
            logger.info("Loaded %d WINDFOR records from cache", len(data))
            return data
        except Exception as e:
            logger.error("Failed to load WINDFOR cache: %s", e)
            return None

    def clear_cache(self) -> None:
        if self.fuelhh_file.exists():
            self.fuelhh_file.unlink()
        if self.windfor_file.exists():
            self.windfor_file.unlink()
        logger.info("Cache cleared.")
