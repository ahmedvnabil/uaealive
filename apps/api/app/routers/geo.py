"""District GeoJSON endpoint — serves the committed OSM-derived file as-is (no envelope)."""

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.config import get_settings

router = APIRouter(prefix="/api/v1", tags=["geo"])


@router.get("/geo/district")
def district_geojson() -> FileResponse:
    path = Path(get_settings().data_dir) / "geo" / "alfahidi.geojson"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="not_found")
    return FileResponse(path, media_type="application/geo+json")
