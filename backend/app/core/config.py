from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "GB Wind Generation Forecast Evaluation"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ]

    # Elexon BMRS API
    ELEXON_BASE_URL: str = "https://data.elexon.co.uk/bmrs/api/v1"
    ELEXON_TIMEOUT_SECONDS: float = 30.0
    ELEXON_MAX_RETRIES: int = 3
    ELEXON_RETRY_DELAY: float = 1.0

    # Cache directory
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    CACHE_DIR: Path = BASE_DIR / "data" / "cache"

    # Default Target Period: January 2026
    TARGET_START_UTC: str = "2026-01-01T00:00:00Z"
    TARGET_END_UTC: str = "2026-01-31T23:59:59Z"

    # Forecasting Methodology Defaults
    # Primary benchmark in GB Day-Ahead Wholesale market is 11:00 London local time on D-1
    DEFAULT_CUTOFF_STRATEGY: str = "D1_1100"  # Options: D1_1100, D1_1200, D1_1400, ROLLING_24H, ROLLING_12H

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
