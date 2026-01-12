import React, { useState, useEffect } from 'react';
import abcjs from 'abcjs';
import "abcjs/abcjs-audio.css";

const ScoreDisplay = ({ notes }) => {
    const [abcCode, setAbcCode] = useState("");

    // Fonction pour traduire les notes reçues en notation ABC avec durées
    const translateToABC = (noteObjects) => {
        return noteObjects.map(obj => {
            let res = obj.pitch;       // Le nom de la note 
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
    useEffect(() => {
        if (notes && notes.length > 0) {
            const translated = translateToABC(notes);
            // définition d'une partition par défaut 
            const initialCode = `X:1
T:Ma mélodie
M:4/4
L:1/4
%%MIDI program 73
K:C
${translated} |]`;
            setAbcCode(initialCode);
        }
    }, [notes]);

    //  À chaque fois que abcCode change, on redessine la partition et initialise le lecteur audio
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
    <div style={{ textAlign: 'left', color: '#333' }}>
        <h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>🎼 Partition de Flûte</h3>
        
        <textarea
            value={abcCode}
            onChange={(e) => setAbcCode(e.target.value)}
            style={{
                width: '100%',
                height: '100px',
                fontFamily: 'monospace',
                padding: '10px',
                marginBottom: '20px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                background: '#f8f9fa'
            }}
        />

        {/* Le lecteur audio */}
        <div id="audio-player" style={{ marginBottom: '20px' }}></div>

        {/* La partition */}
        <div id="paper" style={{ 
            background: 'white', 
            borderRadius: '8px', 
            padding: '10px',
            minHeight: '200px' 
        }}></div>
        
        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f1f5f9', borderRadius: '6px' }}>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                <strong>Aide :</strong> C=Do, D=Ré, E=Mi... <br/>
                Utilisez les minuscules (c, d, e) pour les notes aiguës. <br/>
                Ajoutez des chiffres pour les octaves (4=do moyen, 5=do aigu). <br/>
                Utilisez "2/" pour les croches, "" pour les noires, et "2" pour les blanches. 
            </p>
        </div>
    </div>
    );
};

export default ScoreDisplay;