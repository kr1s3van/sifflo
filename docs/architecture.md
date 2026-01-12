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



        import React, { useState, useRef } from 'react';
/* Note a moi meme(les oreilles de sifflo): Ce composant permet d'enregistrer un audio à partir du micro, 
j'ai importé les hooks reacts userstate et useref
*/


const Recorder = ({ onAnalysisComplete }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const [bpm, setBpm] = useState(100);
    const [useMetronome, setUseMetronome] = useState(false);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const metronomeInterval = useRef(null);
    const audioCtxRef = useRef(null); // Référence unique pour le son

    //Fonction pour jouer un bip
    const playBip = () => {
        if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        gain.gain.value = 0.1;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.stop(ctx.currentTime + 0.1);
    };

    // Fonction pour envoyer l'audio au serveur
    const sendAudioToServer = async (blob) => {
        const formData = new FormData();
        formData.append('file', blob, 'sifflement.wav');
        try {
            const response = await fetch('http://localhost:8000/upload', { method: 'POST', body: formData });
            const data = await response.json();
            if (data.notes && onAnalysisComplete) onAnalysisComplete(data.notes);
        } catch (error) { console.error("Erreur serveur:", error); }
    };

    // Fonction pour démarrer l'enregistrement
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } 
            });

            if (useMetronome) {
                if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
                if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume();
                metronomeInterval.current = setInterval(playBip, (60 / bpm) * 1000);
            }

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
                setAudioUrl(URL.createObjectURL(blob));
                sendAudioToServer(blob);
            };

            mediaRecorder.start(100);
            setIsRecording(true);
        } catch (err) { alert("Micro introuvable ou bloqué."); }
    };

    const stopRecording = () => {
        if (metronomeInterval.current) clearInterval(metronomeInterval.current);
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
        }
    };

    return (
        <div style={{ padding: '20px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '15px', background: '#fff' }}>
            <div style={{ marginBottom: '15px' }}>
                <label><input type="checkbox" checked={useMetronome} onChange={(e) => setUseMetronome(e.target.checked)} /> Métronome</label>
                <input type="range" min="40" max="200" value={bpm} onChange={(e) => setBpm(e.target.value)} style={{ display: 'block', margin: '10px auto' }} />
                <span>{bpm} BPM</span>
            </div>
            <button onClick={isRecording ? stopRecording : startRecording} style={{ padding: '12px 25px', borderRadius: '25px', border: 'none', backgroundColor: isRecording ? '#ff4757' : '#2ed573', color: '#fff', cursor: 'pointer', fontSize: '16px' }}>
                {isRecording ? "🛑 Arrêter" : "🎤 Enregistrer"}
            </button>
            {audioUrl && <div style={{marginTop:'15px'}}><audio src={audioUrl} controls /></div>}
        </div>
    );
};

export default Recorder;


import React, { useState, useEffect } from 'react';
import abcjs from 'abcjs';

const ScoreDisplay = ({ notes }) => {
    const [abcCode, setAbcCode] = useState("");

    // Fonction pour traduire les notes reçues en notation ABC avec durées
    const translateToABC = (noteObjects) => {
        return noteObjects.map(obj => {
            let res = obj.pitch;       // Le nom de la note (ex: "C#4")
            let length = obj.abc_len;  // La durée ABC (genre "2" ou "/2" ou "")

            // logique pour les altérations 
            res = res.replace('#', '^'); 
            res = res.replace('b', '_'); 

            // logique pour les octaves 
            if (res.includes('5')) res = res.replace('5', '').toLowerCase(); 
            else if (res.includes('6')) res = res.replace('6', '').toLowerCase() + "'"; 
            else if (res.includes('4')) res = res.replace('4', ''); 
            else res = res.replace(/\d/g, ''); 

            // On renvoie la note et sa durée à la fin
            return res + length; 
        }).join(' ');
    };

    //  Quand de nouvelles notes arrivent du serveur, on initialise le code ABC
    // On ajoute la directive %%MIDI program 74 pour le son de flûte
    useEffect(() => {
        if (notes && notes.length > 0) {
            const translated = translateToABC(notes);
            // On définit une partition par défaut avec la clé de sol (K:C)
            // L'alignement à gauche est crucial ici pour le format ABC
            const initialCode = `X:1
T:Ma mélodie
M:4/4
L:1/4
%%MIDI program 74
K:C
${translated} |]`;
            setAbcCode(initialCode);
        }
    }, [notes]);

    //  À chaque fois que abcCode change (saisie clavier ou nouvelles notes), on redessine
    // Dans le useEffect qui fait le rendu, on va ajouter le synthétiseur
    useEffect(() => {
        if (abcCode) {
            // On s'assure que la div existe avant de dessiner
            const visualObj = abcjs.renderAbc("paper", abcCode, { 
                responsive: 'resize',
                add_classes: true,
                paddingtop: 0,
                paddingbottom: 0,
                staffwidth: 500,
            })[0];

            // Création du lecteur audio
            if (abcjs.synth.supportsAudio()) {
                const synthControl = new abcjs.synth.SynthController();
                synthControl.load("#audio-player", null, {
                    displayRestart: true,
                    displayPlay: true,
                    displayProgress: true,
                });
            
                const createSynth = new abcjs.synth.CreateSynth();
                createSynth.init({ visualObj }).then(() => {
                    synthControl.setTune(visualObj, false).then(() => {
                        console.log("Audio prêt !");
                  });
                }).catch(err => console.warn("Erreur Synthé Audio:", err));
            }
        }
    }, [abcCode]);


    return (
        <div style={{ 
            marginTop: '30px', 
            padding: '20px', 
            background: '#ffffff', 
            borderRadius: '12px', 
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto'
        }}>
            <h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>🎼 Partition de Flûte</h3>
            
            {/* Zone de texte pour modifier les notes manuellement */}
            <textarea
                value={abcCode}
                onChange={(e) => setAbcCode(e.target.value)}
                placeholder="Les notes apparaîtront ici..."
                style={{
                    width: '100%',
                    height: '100px',
                    fontFamily: 'monospace',
                    padding: '10px',
                    marginBottom: '20px',
                    border: '2px solid #eee',
                    borderRadius: '8px',
                    outline: 'none',
                    fontSize: '14px'
                }}
            />

            <div id="audio-player" style={{ marginBottom: '15px', minHeight: '40px' }}></div>

            {/* Zone où la partition est dessinée */}
            <div id="paper" style={{ width: '100%', minHeight: '150px' }}></div>
            
            <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                <p style={{ fontSize: '0.85em', color: '#7f8c8d', margin: 0 }}>
                    <strong>Aide :</strong> C=Do, D=Ré, E=Mi... <br/>
                    Utilisez les minuscules (c, d, e) pour les notes aiguës.
                </p>
            </div>
        </div>
    );
};

export default ScoreDisplay;