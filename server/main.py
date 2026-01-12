import os, shutil
from core.engine import analyze_sifflement
from uuid import uuid4
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# le CORS pour que React puisse parler à Python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# robuste (temp)
# (l'IA t'a aidé ici, cherche a approfondir plus ici :D)

uploads_dir = os.path.join(os.path.dirname(__file__), "temp")
os.makedirs(uploads_dir, exist_ok=True)

@app.post("/upload")
async def receive_audio(file: UploadFile = File(...)):
    filename = os.path.basename(file.filename)
    unique_name = f"{uuid4().hex}_{filename}"
    file_path = os.path.join(uploads_dir, unique_name)

    # Validation
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Invalid file type")

    try:
        # ici, on SAUVEGARDE (On le fait une seule fois!!! TT)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # ici, on ANALYSE (On utilise le chemin du fichier qu'on vient de créer)
        print(f"Analyse du fichier : {file_path}")
        notes = analyze_sifflement(file_path)
        print(f"Notes trouvées : {notes}")

        return {
            "message": "Analyse terminée !", 
            "filename": unique_name,
            "notes": notes
        }

    except Exception as exc:
        print(f"ERREUR CRITIQUE : {exc}")
        raise HTTPException(status_code=500, detail=str(exc))
    
    finally:
        # fucking FERMETURE qui fesait chier (Seulement à la toute fin)
        await file.close()
    
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)