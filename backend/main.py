# pyrefly: ignore [missing-import]
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yt_dlp
import os

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

@app.post("/api/download")
def download_media(request: DownloadRequest):
    # Creiamo la cartella downloads/ nella root del progetto se non esiste
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    downloads_dir = os.path.join(root_dir, 'downloads')
    os.makedirs(downloads_dir, exist_ok=True)
    
    # restrictfilenames=True assicura che il titolo sia sanitizzato rimuovendo i caratteri non supportati
    ydl_opts = {
        'outtmpl': os.path.join(downloads_dir, '%(title)s.%(ext)s'),
        'restrictfilenames': True,
        'quiet': True,
        'no_warnings': True,
    }
    
    if request.type == 'video':
        # Scarica il miglior formato MP4 disponibile come richiesto
        ydl_opts['format'] = 'best[ext=mp4]'
    elif request.type == 'musica':
        # Per la musica, scarichiamo il miglior audio ed estraiamo in mp3 usando FFmpeg
        ydl_opts['format'] = 'bestaudio/best'
        ydl_opts['postprocessors'] = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }]
    else:
        raise HTTPException(status_code=400, detail="Tipo di contenuto non supportato. Usa 'video' o 'musica'.")
        
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Eseguiamo l'estrazione e il download
            info = ydl.extract_info(request.url, download=True)
            
            file_path = ydl.prepare_filename(info)
            if request.type == 'musica':
                # Se è stato convertito in mp3 da ffmpeg, aggiorniamo l'estensione nel path restituito
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
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
