from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
from typing import Dict, Optional
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
    # Salviamo il loop di base per poterlo richiamare nei thread sincroni
    app.state.loop = asyncio.get_running_loop()
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

# --- WEBSOCKET MANAGER ---
active_connections: Dict[str, WebSocket] = {}

@app.websocket("/ws/progress/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    active_connections[client_id] = websocket
    try:
        while True:
            # Mantieni la connessione viva, aspettiamo pacchetti dal client
            await websocket.receive_text()
    except WebSocketDisconnect:
        # Quando il client si disconnette, puliamo il dict per evitare memory leak
        if client_id in active_connections:
            del active_connections[client_id]
    except Exception:
        if client_id in active_connections:
            del active_connections[client_id]

# --- MIDDLEWARE GESTIONE ERRORI GLOBALE ---
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if hasattr(exc, 'status_code') and hasattr(exc, 'detail'):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": "Errore di Richiesta", "message": exc.detail}
        )
    return JSONResponse(
        status_code=500,
        content={"error": "Errore Interno", "message": "Si è verificato un errore imprevisto sul server durante l'elaborazione."}
    )

class URLRequest(BaseModel):
    url: str

class DownloadRequest(BaseModel):
    url: str
    type: str
    client_id: Optional[str] = None # L'id univoco che il client fornirà

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
        'extract_flat': 'in_playlist',
        'playlistend': 50
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(request.url, download=False)
            
            # Gestione Playlist
            if 'entries' in info:
                entries = list(info['entries']) if info['entries'] else []
                if not entries:
                    raise HTTPException(status_code=400, detail="La playlist è vuota, privata o inaccessibile.")
                
                items = []
                for entry in entries:
                    if entry:
                        items.append({
                            "title": entry.get("title", "Sconosciuto"),
                            "duration": entry.get("duration", 0),
                            "thumbnail": entry.get("thumbnail", ""),
                            "url": entry.get("url") or entry.get("webpage_url", "")
                        })
                
                return {
                    "is_playlist": True,
                    "title": info.get("title", "Playlist"),
                    "total_items": len(items),
                    "items": items
                }
            
            # Gestione Singolo Video (Comportamento Esistente)
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
                "is_playlist": False,
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
    
    # --- YT-DLP HOOK ---
    def progress_hook(d):
        # Se la richiesta include un client_id ed è connesso, inoltriamo l'avanzamento
        if not request.client_id or request.client_id not in active_connections:
            return
            
        status = d.get('status')
        msg = None
        
        if status == 'downloading':
            total_bytes = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
            downloaded = d.get('downloaded_bytes', 0)
            
            progress = (downloaded / total_bytes * 100) if total_bytes > 0 else 0
            speed = d.get('speed')
            eta = d.get('eta')
            
            speed_str = f"{speed / 1024 / 1024:.2f} MB/s" if speed else "N/A"
            total_str = f"{total_bytes / 1024 / 1024:.2f} MB" if total_bytes else "N/A"
            
            msg = {
                "status": "downloading",
                "progress": round(progress, 2),
                "speed": speed_str,
                "total_size": total_str,
                "eta": eta
            }
        elif status == 'finished':
            msg = {"status": "completed", "progress": 100}
        elif status == 'error':
            msg = {"status": "error", "progress": 0}
            
        if msg:
            loop = app.state.loop
            ws = active_connections[request.client_id]
            # Siccome questa callback gira all'interno di un thread separato (ThreadPoolExecutor usato da FastAPI)
            # utilizziamo run_coroutine_threadsafe per far inviare in modo asincrono il payload dal WebSocket
            asyncio.run_coroutine_threadsafe(ws.send_json(msg), loop)

    ydl_opts = {
        'outtmpl': os.path.join(downloads_dir, '%(title)s.%(ext)s'),
        'restrictfilenames': True,
        'quiet': True,
        'no_warnings': True,
        'progress_hooks': [progress_hook],
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
                
            # Conferma ultima completata
            if request.client_id and request.client_id in active_connections:
                loop = app.state.loop
                ws = active_connections[request.client_id]
                asyncio.run_coroutine_threadsafe(ws.send_json({"status": "completed", "progress": 100}), loop)

            filename = os.path.basename(file_path)
            return FileResponse(
                path=file_path, 
                filename=filename, 
                media_type='application/octet-stream'
            )
    except yt_dlp.utils.DownloadError as e:
        if request.client_id and request.client_id in active_connections:
            loop = app.state.loop
            ws = active_connections[request.client_id]
            asyncio.run_coroutine_threadsafe(ws.send_json({"status": "error", "progress": 0}), loop)
            
        raise HTTPException(
            status_code=400, 
            detail="Errore durante il download: URL privato, errore di rete o formato non disponibile."
        )
    except yt_dlp.utils.PostProcessingError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Errore durante la conversione FFmpeg o l'estrazione audio: {str(e)}"
        )
