# pyrefly: ignore [missing-import]
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
import zipfile
import re
from urllib.parse import quote

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
    
    # 1. Rileva se l'URL appartiene ad una playlist
    info_opts = {'quiet': True, 'simulate': True, 'no_warnings': True, 'extract_flat': 'in_playlist', 'playlistend': 50}
    is_playlist = False
    entries = []
    try:
        with yt_dlp.YoutubeDL(info_opts) as ydl:
            info = ydl.extract_info(request.url, download=False)
            if 'entries' in info:
                entries_list = list(info['entries']) if info['entries'] else []
                if len(entries_list) > 0:
                    is_playlist = True
                    entries = entries_list
    except Exception:
        raise HTTPException(status_code=400, detail="Impossibile accedere all'URL fornito.")

    # Definizione generica dell'hook per il WebSocket
    def progress_hook(d, current_index=None):
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
            # Se siamo in una playlist, sovrascriviamo lo status e aggiungiamo l'indice
            if current_index is not None:
                msg["item_index"] = current_index
                msg["status"] = "item_downloading"

        if msg:
            loop = app.state.loop
            ws = active_connections[request.client_id]
            asyncio.run_coroutine_threadsafe(ws.send_json(msg), loop)

    if is_playlist:
        # --- LOGICA DOWNLOAD SEQUENZIALE PER PLAYLIST ---
        downloaded_files = []
        playlist_title = info.get('title', 'playlist')
        
        for idx, entry in enumerate(entries):
            if not entry or not entry.get('url'):
                continue
                
            item_url = entry.get('url')
            if not item_url.startswith('http'):
                item_url = f"https://www.youtube.com/watch?v={item_url}"
                
            success = False
            # Tentativi massimi (Timeout meccanico)
            for attempt in range(3):
                ydl_opts = {
                    'outtmpl': os.path.join(downloads_dir, '%(title)s.%(ext)s'),
                    'restrictfilenames': True,
                    'quiet': True,
                    'no_warnings': True,
                    # i=idx blocca il binding della closure in Python per prevenire bug nel loop
                    'progress_hooks': [lambda d, i=idx: progress_hook(d, current_index=i)],
                }
                
                if request.type == 'video':
                    ydl_opts['format'] = 'best[ext=mp4]'
                elif request.type in ('musica', 'audio'):
                    ydl_opts['format'] = 'bestaudio/best'
                    ydl_opts['postprocessors'] = [
                        {'key': 'FFmpegExtractAudio', 'preferredcodec': 'mp3', 'preferredquality': '192'},
                        {'key': 'FFmpegMetadata', 'add_metadata': True}
                    ]
                
                try:
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        item_info = ydl.extract_info(item_url, download=True)
                        file_path = ydl.prepare_filename(item_info)
                        if request.type in ('musica', 'audio'):
                            base_path, _ = os.path.splitext(file_path)
                            file_path = f"{base_path}.mp3"
                            
                        downloaded_files.append(file_path)
                        success = True
                        
                        # Invia aggiornamento specifico che il brano è completato
                        if request.client_id and request.client_id in active_connections:
                            loop = app.state.loop
                            ws = active_connections[request.client_id]
                            asyncio.run_coroutine_threadsafe(ws.send_json({
                                "status": "item_completed", 
                                "item_index": idx
                            }), loop)
                        break
                except Exception:
                    time.sleep(1) # Breve respiro prima di riprovare
            
            if not success:
                # Se tutti e 3 i tentativi falliscono, salta il brano e notifica
                if request.client_id and request.client_id in active_connections:
                    loop = app.state.loop
                    ws = active_connections[request.client_id]
                    asyncio.run_coroutine_threadsafe(ws.send_json({
                        "status": "item_skipped", 
                        "item_index": idx
                    }), loop)

        if not downloaded_files:
            raise HTTPException(status_code=400, detail="Impossibile scaricare alcun brano valido dalla playlist.")
            
        # Zippiamo i file scaricati in un unico archivio compresso
        safe_title = re.sub(r'[^a-zA-Z0-9_\-]', '_', playlist_title)
        zip_filename = f"{safe_title}.zip"
        zip_path = os.path.join(downloads_dir, zip_filename)
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file in downloaded_files:
                if os.path.exists(file):
                    zipf.write(file, os.path.basename(file))
        
        # Aggiornamento globale per chiudere la ProgressBar/PlaylistList nel client
        if request.client_id and request.client_id in active_connections:
            loop = app.state.loop
            ws = active_connections[request.client_id]
            asyncio.run_coroutine_threadsafe(ws.send_json({"status": "completed", "progress": 100}), loop)
            
        headers = {
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(zip_filename)}"
        }
        return FileResponse(
            path=zip_path, 
            filename=zip_filename, 
            media_type='application/zip',
            headers=headers
        )

    else:
        # --- LOGICA DOWNLOAD SINGOLO VIDEO ---
        ydl_opts = {
            'outtmpl': os.path.join(downloads_dir, '%(title)s.%(ext)s'),
            'restrictfilenames': True,
            'quiet': True,
            'no_warnings': True,
            'progress_hooks': [lambda d: progress_hook(d)],
        }
        
        if request.type == 'video':
            ydl_opts['format'] = 'best[ext=mp4]'
        elif request.type in ('musica', 'audio'):
            ydl_opts['format'] = 'bestaudio/best'
            ydl_opts['postprocessors'] = [
                {'key': 'FFmpegExtractAudio', 'preferredcodec': 'mp3', 'preferredquality': '192'},
                {'key': 'FFmpegMetadata', 'add_metadata': True}
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
                    
                if request.client_id and request.client_id in active_connections:
                    loop = app.state.loop
                    ws = active_connections[request.client_id]
                    asyncio.run_coroutine_threadsafe(ws.send_json({"status": "completed", "progress": 100}), loop)

                filename = os.path.basename(file_path)
                headers = {
                    "Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"
                }
                return FileResponse(
                    path=file_path, 
                    filename=filename, 
                    media_type='application/octet-stream',
                    headers=headers
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
