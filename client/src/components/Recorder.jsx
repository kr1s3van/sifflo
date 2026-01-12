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
        <div style={{ padding: '20px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '15px', background: '#fff', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
            <div style={{ marginBottom: '15px' }}>
                <label style={{ color: '#333', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', cursor: 'pointer', fontWeight: '600' }}>
                    <input 
                        type="checkbox" 
                        checked={useMetronome} 
                        onChange={(e) => setUseMetronome(e.target.checked)} 
                    /> 
                    Métronome
                </label>
                
                <input 
                    type="range" 
                    min="40" 
                    max="200" 
                    value={bpm} 
                    onChange={(e) => setBpm(e.target.value)} 
                    style={{ display: 'block', margin: '10px auto', width: '80%', accentColor: '#2ed573' }} 
                />
                
                {/* couleur sombre ici aussi pour le BPM */}
                <span style={{ color: '#666', fontSize: '14px', fontWeight: 'bold' }}>{bpm} BPM</span>
            </div>

            <button 
                onClick={isRecording ? stopRecording : startRecording} 
                style={{ 
                    padding: '12px 25px', 
                    borderRadius: '25px', 
                    border: 'none', 
                    backgroundColor: isRecording ? '#ff4757' : '#2ed573', 
                    color: '#fff', 
                    cursor: 'pointer', 
                    fontSize: '16px',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 10px rgba(46, 213, 115, 0.3)',
                    transition: 'all 0.2s'
                }}
            >
                {isRecording ? "🛑 Arrêter" : "🎤 Enregistrer"}
            </button>

            {audioUrl && (
                <div style={{marginTop:'20px', borderTop: '1px solid #eee', paddingTop: '15px'}}>
                    <p style={{color: '#888', fontSize: '12px', marginBottom: '5px'}}>Réécouter l'enregistrement :</p>
                    <audio src={audioUrl} controls style={{ height: '35px' }} />
                </div>
            )}
        </div>
    );
};

export default Recorder;