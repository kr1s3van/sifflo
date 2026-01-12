# Architecture Technique - Sifflo 

## 1. Vue d'ensemble
Sifflo est une application web hybride permettant de transcrire un signal audio monophonique (sifflement ou flûte) en une partition musicale modifiable. L'application repose sur une séparation stricte entre la capture utilisateur et le traitement du signal (DSP).

## 2. Diagramme de Flux (Data Flow)

```text
[Utilisateur] 
      | (Siffle)
      v
[Navigateur / Recorder.jsx] 
      | (Capture via MediaRecorder API) -> Blob (WebM/WAV)
      v
[API FastAPI / main.py] 
      | (Requête HTTP POST + Multipart Form Data)
      v
[Engine / engine.py] 
      | (Analyse Librosa + Algorithme pYIN) -> Liste de fréquences
      | (Quantification temporelle) -> Objets {pitch, abc_len}
      v
[API FastAPI / main.py] 
      | (Réponse JSON)
      v
[React App / App.jsx] 
      | (Mise à jour du State)
      v
[ScoreDisplay.jsx] 
      | (Moteur ABCjs) -> Rendu SVG + Synthèse Audio (MIDI)
```

## 3. Architecture Logicielle
### Frontend (Client-Side)
A. Framework : React.js (Vite).

B. Gestion de l'Audio :
    Web Audio API : Utilisée pour le métronome (génération d'oscillateurs en temps réel) afin d'éviter toute latence.

    MediaRecorder API : Capture du flux audio du microphone.

C. Rendu Musical :
    ABCjs : Bibliothèque de gravure musicale vectorielle. Elle convertit une chaîne de caractères au format ABC en une partition interactive (SVG) et génère un flux audio MIDI (instrument 74 - Flûte).

### Backend (Server-Side)
A. Framework : FastAPI (Python). Choisi pour sa gestion native de l'asynchrone et sa rapidité de déploiement.

B. Traitement du Signal (DSP) :
    Librosa : Utilisation de l'algorithme pYIN (Probabilistic YIN) pour l'estimation de la fréquence fondamentale (F0).
    
    Filtrage : Implémentation d'un seuil de confiance (voiced_probs > 0.3) et d'un filtre temporel (minimum 2 frames) pour éliminer les bruits parasites et les artefacts de souffle.

## Spécifications de l'API
Endpoint : POST /upload (Envoie un fichier audio pour analyse)
Entrée : "file: Fichier binaire (Form-data)"
Sortie (JSON) :

```text
{
  "message": "Analyse terminée !",
  "filename": "uuid_sifflement.wav",
  "notes": [
    { "pitch": "C4", "len": 18, "abc_len": "" },
    { "pitch": "D4", "len": 40, "abc_len": "2" },
    { "pitch": "E4", "len": 8, "abc_len": "/2" }
  ]
}
```

## Logique de Transcription Musicale
L'application transforme les données physiques en symboles musicaux selon les règles suivantes :
    Pitch : La fréquence détectée est convertie en note MIDI, puis en notation anglo-saxonne (ex: 440Hz -> 69 -> A4).
    Octaves : Le système adapte la notation pour ABCjs (C4 = C, C5 = c, C6 = c').
    Durées (Quantification) :
        len > 35 frames -> Note blanche (ABC: 2)
        len > 15 frames -> Note noire (ABC: ``)
        len < 15 frames -> Croche (ABC: /2)