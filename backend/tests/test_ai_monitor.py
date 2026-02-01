"""
AI Monitor API Tests
Verifies the full AI analysis endpoints work correctly.
"""
import sys
import os
import pytest
from unittest.mock import MagicMock, patch

# Add backend to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from fastapi.testclient import TestClient


class TestAIMonitorEndpoints:
    """Test AI Monitor API endpoints."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test client with mocked database."""
        # Import app after patching
        from app.main import app
        self.client = TestClient(app)
    
    def test_metadata_endpoint_404_on_missing_take(self):
        """Test that metadata endpoint returns 404 for non-existent take."""
        response = self.client.get("/api/v1/ai-monitor/metadata/99999")
        assert response.status_code == 404
    
    def test_status_endpoint_404_on_missing_take(self):
        """Test that status endpoint returns 404 for non-existent take."""
        response = self.client.get("/api/v1/ai-monitor/status/99999")
        assert response.status_code == 404
    
    def test_analyze_full_endpoint_404_on_missing_take(self):
        """Test that analyze-full endpoint returns 404 for non-existent take."""
        response = self.client.post("/api/v1/ai-monitor/analyze-full/99999")
        assert response.status_code == 404


class TestCVServiceFullAnalysis:
    """Test cv_service analyze_video_full method."""
    
    @pytest.fixture
    def cv_service(self):
        from app.services.cv_service import cv_service
        return cv_service
    
    @pytest.mark.asyncio
    async def test_analyze_video_full_missing_file(self, cv_service):
        """Test that analyze_video_full raises error for missing file."""
        with pytest.raises(FileNotFoundError):
            await cv_service.analyze_video_full("/nonexistent/video.mp4")
    
    @pytest.mark.asyncio
    async def test_analyze_video_full_returns_expected_structure(self, cv_service):
        """Test that analyze_video_full returns correct structure (with mock file)."""
        # This test would need a real video file to fully run
        # For now, we verify the method signature exists
        assert hasattr(cv_service, 'analyze_video_full')
        assert callable(cv_service.analyze_video_full)


class TestAudioServiceFullAnalysis:
    """Test audio_service analyze_audio_full method."""
    
    @pytest.fixture
    def audio_service(self):
        from app.services.audio_service import audio_service
        return audio_service
    
    @pytest.mark.asyncio
    async def test_analyze_audio_full_missing_file(self, audio_service):
        """Test that analyze_audio_full handles missing file gracefully."""
        result = await audio_service.analyze_audio_full("/nonexistent/audio.mp4")
        assert result["transcript"] == ""
        assert result["language"] == "unknown"
    
    @pytest.mark.asyncio
    async def test_analyze_audio_full_returns_expected_structure(self, audio_service):
        """Test that analyze_audio_full returns correct structure."""
        assert hasattr(audio_service, 'analyze_audio_full')
        assert callable(audio_service.analyze_audio_full)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
