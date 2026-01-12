import React, { useState } from 'react'
import Recorder from './components/Recorder'
import ScoreDisplay from './components/ScoreDisplay'

function App() {
  const [notes, setNotes] = useState([]);
  const [step, setStep] = useState(1); // 1: Record, 2: Loading, 3: Score
  
  // Cette fonction sera appelée quand le serveur répond
  const handleAnalysisComplete = (detectedNotes) => {
    setNotes(detectedNotes);
    setStep(3); // Une fois l'analyse finie, on va à la page 3 (Partition)
  };

  const handleStartAnalysis = () => {
    setStep(2); // Dès que l'envoi commence, on va à la page 2 (Loading)
  };

  const resetApp = () => {
    setNotes([]);
    setStep(1); // Retour au début
  };

  return (
    <div style={{ padding: '60px 20px' }}>
      
      {/* Le Titre */}
      <header className="page-transition">
        <h1 className="sifflo-logo">SIFFLO</h1>
        <p className="subtitle">du siflot a la partition</p>
      </header>

      <main>
        
        {/*ENREGISTREMENT */}
        {step === 1 && (
          <div className="glass-container page-transition">
            <Recorder 
              onAnalysisComplete={handleAnalysisComplete} 
              onStartAnalysis={handleStartAnalysis} 
            />
          </div>
        )}

        {/* CHARGEMENT (LE FADE) */}
        {step === 2 && (
          <div className="glass-container page-transition" style={{ textAlign: 'center' }}>
            <div className="spinner"></div>
            <h2 style={{ color: '#34d399', letterSpacing: '2px' }}>ANALYSE EN COURS</h2>
            <p style={{ color: '#94a3b8' }}>Sifflo transforme votre souffle en musique...</p>
          </div>
        )}

        {/* PARTITION */}
        {step === 3 && (
          <div className="page-transition">
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <button className="btn-back" onClick={resetApp}>
                ← Nouvelle mélodie
              </button>
            </div>
            
            {/* scoreDisplay dans son propre container blanc pour la lisibilité */}
            <div className="glass-container" style={{ background: 'white', padding: '20px' }}>
               <ScoreDisplay notes={notes} />
            </div>
          </div>
        )}

      </main>

      <footer style={{ marginTop: '100px', textAlign: 'center', color: '#475569', fontSize: '0.8rem' }}>
        <p>© 2026 Sifflo Project • kris evan tried his best :)</p>
      </footer>

    </div>
  )
}

export default App