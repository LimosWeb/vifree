# pyrefly: ignore [missing-import]
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
import asyncio
import yt_dlp
import os
import time

# --- BACKGROUND CLEANUP TASK ---
async def cleanup_task():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    downloads_dir = os.path.join(root_dir, 'downloads')
    
    while True:
        try:
            if os.path.exists(downloads_dir):
                now = time.time()
                for filename in os.listdir(downloads_dir):
                    filepath = os.path.join(downloads_dir, filename)
                    if os.path.isfile(filepath):
                        # Elimina file più vecchi di 10 minuti (600 secondi)
                        if now - os.path.getmtime(filepath) > 600:
                            os.remove(filepath)
        except Exception:
            pass # Ignoriamo in modo sicuro qualsiasi eccezione nel task di background
        await asyncio.sleep(60) # Esegui controllo ogni minuto

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(cleanup_task())
    yield
    task.cancel()

# Inizializziamo l'app con la gestione del ciclo di vita
app = FastAPI(lifespan=lifespan)

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

# --- MIDDLEWARE GESTIONE ERRORI GLOBALE ---
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Riformattiamo le eccezioni controllate (HTTPException) 
    if hasattr(exc, 'status_code') and hasattr(exc, 'detail'):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": "Errore di Richiesta", "message": exc.detail}
        )
    
    # Qualsiasi altra eccezione non gestita produce un errore generico a prova di stack trace
    return JSONResponse(
        status_code=500,
        content={"error": "Errore Interno", "message": "Si è verificato un errore imprevisto sul server durante l'elaborazione."}
    )

class URLRequest(BaseModel):
    url: str

class DownloadRequest(BaseModel):
    url: str
    type: str

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

@app.post("/api/download")
def download_media(request: DownloadRequest):
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    downloads_dir = os.path.join(root_dir, 'downloads')
    os.makedirs(downloads_dir, exist_ok=True)
    
    ydl_opts = {
        'outtmpl': os.path.join(downloads_dir, '%(title)s.%(ext)s'),
        'restrictfilenames': True,
        'quiet': True,
        'no_warnings': True,
    }
    
    if request.type == 'video':
        ydl_opts['format'] = 'best[ext=mp4]'
    elif request.type in ('musica', 'audio'):
        ydl_opts['format'] = 'bestaudio/best'
        ydl_opts['postprocessors'] = [
            {
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            },
            {
                'key': 'FFmpegMetadata',
                'add_metadata': True,
            }
        ]
    else:
        raise HTTPException(status_code=400, detail="Tipo di contenuto non supportato. Usa 'video' o 'audio'.")
        
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(request.url, download=True)
            
            file_path = ydl.prepare_filename(info)
            if request.type in ('musica', 'audio'):
                base_path, _ = os.path.splitext(file_path)
                file_path = f"{base_path}.mp3"
                
            return {
                "title": info.get('title', 'Video scaricato'),
                "file_path": file_path,
                "filesize_approx": info.get('filesize_approx', info.get('filesize', 0)),
                "message": "Download completato con successo"
            }
    except yt_dlp.utils.DownloadError as e:
        raise HTTPException(
            status_code=400, 
            detail="Errore durante il download: URL privato, errore di rete o formato non disponibile."
        )
    except yt_dlp.utils.PostProcessingError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Errore durante la conversione FFmpeg o l'estrazione audio: {str(e)}"
        )
