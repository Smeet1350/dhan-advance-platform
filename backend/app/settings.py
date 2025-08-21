import os
from typing import Optional

class Settings:
    """Application settings - single point of configuration"""
    
    # Dhan API Configuration
    DHAN_CLIENT_ID: str = "1107860004"
    DHAN_ACCESS_TOKEN: str = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzU2ODM2NDA4LCJ0b2tlbkNvbnN1bWVyVHlwZSI6IlNFTEYiLCJ3ZWJob29rVXJsIjoiIiwiZGhhbkNsaWVudElkIjoiMTEwNzg2MDAwNCJ9.3cuzgiY0Qm2Id8wpMW0m90_ZxJ0TJRTV5fZ0tpAwWo3S1Mv5HbpcDNwXxXVepnOUHMRDck_AbArIoVOmlA68Dg"
    
    # Mock Data Configuration
    USE_MOCK_DATA: bool = True  # Set to False to use real Dhan API
    
    # API Configuration
    API_HOST: str = "127.0.0.1"
    API_PORT: int = 8000
    
    # CORS Configuration
    CORS_ORIGINS: list = ["http://localhost:5173", "http://127.0.0.1:5173"]
    
    # Logging Configuration
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Mock Data Update Interval (seconds)
    MOCK_LTP_UPDATE_INTERVAL: int = 2
    
    # Mock Data Symbols (realistic Indian stocks)
    MOCK_SYMBOLS: list = [
        "RELIANCE", "TCS", "HDFC", "INFY", "ICICIBANK", 
        "HINDUNILVR", "ITC", "SBIN", "BHARTIARTL", "KOTAKBANK"
    ]
    
    # Mock Data Ranges
    MOCK_PRICE_RANGE: tuple = (100.0, 5000.0)
    MOCK_QTY_RANGE: tuple = (100, 10000)
    
    def __init__(self):
        # Override with environment variables if present (for production flexibility)
        self.DHAN_CLIENT_ID = os.getenv("DHAN_CLIENT_ID", self.DHAN_CLIENT_ID)
        self.DHAN_ACCESS_TOKEN = os.getenv("DHAN_ACCESS_TOKEN", self.DHAN_ACCESS_TOKEN)
        self.USE_MOCK_DATA = os.getenv("USE_MOCK_DATA", str(self.USE_MOCK_DATA)).lower() == "true"
        self.API_HOST = os.getenv("API_HOST", self.API_HOST)
        self.API_PORT = int(os.getenv("API_PORT", self.API_PORT))

# Global settings instance
settings = Settings()
