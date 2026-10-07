# pyrefly: ignore [missing-import]
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yt_dlp

app = FastAPI()

origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class URLRequest(BaseModel):
    url: str

@app.get("/ping")
def ping():
    return "OK"

@app.get("/api/test")
def test_endpoint():
    return {"message": "Connessione con il backend riuscita!"}

@app.post("/api/info")
def get_media_info(request: URLRequest):
    ydl_opts = {
        'quiet': True,
        'simulate': True,
        'no_warnings': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Estrazione dei metadati senza scaricare il file
            info = ydl.extract_info(request.url, download=False)
            
            formats = []
            if 'formats' in info:
                for f in info['formats']:
                    resolution = f.get('resolution')
                    if not resolution and f.get('width') and f.get('height'):
                        resolution = f"{f.get('width')}x{f.get('height')}"
                        
                    formats.append({
                        'format_id': f.get('format_id'),
                        'ext': f.get('ext'),
                        'resolution': resolution,
                        'vcodec': f.get('vcodec'),
                        'acodec': f.get('acodec'),
                        'filesize': f.get('filesize'),
                        'format_note': f.get('format_note')
                    })
            
            return {
                "title": info.get("title", "Titolo Sconosciuto"),
                "duration": info.get("duration", 0),
                "thumbnail": info.get("thumbnail", ""),
                "platform": info.get("extractor_key", info.get("extractor", "Sconosciuta")),
                "formats": formats
            }
    except yt_dlp.utils.DownloadError as e:
        raise HTTPException(
            status_code=400, 
            detail="Impossibile accedere al contenuto. Verifica che l'URL sia valido, pubblico e supportato."
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
