from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = "development"
    debug: bool = True
    app_url: str = "http://localhost:5173"
    api_url: str = "http://localhost:8001"

    db_host: str = "localhost"
    db_port: int = 3306
    db_name: str = "flowdesk"
    db_user: str = "root"
    db_password: str = ""

    jwt_secret: str = "change-me-to-a-random-32-byte-string"
    jwt_access_expire_minutes: int = 15
    jwt_refresh_expire_days: int = 7

    storage_path: str = "./storage/uploads"
    max_upload_size_mb: int = 10

    cors_origins: str = "http://localhost:5173"

    @property
    def database_url(self) -> str:
        return (
            f"mysql+pymysql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
