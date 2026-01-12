import librosa
import numpy as np

def analyze_sifflement(file_path):
    try:
        # Charger le signal. _ ignore le sample rate car librosa gère le défaut à 22050Hz
        y, _ = librosa.load(file_path)
        
        # On élargit la détection de C3 à C7 pour la flûte
        # fmin=C3 (130Hz), fmax=C7 (2093Hz)
        f0, _, voiced_probs = librosa.pyin(y, 
                                           fmin=librosa.note_to_hz('C3'), 
                                           fmax=librosa.note_to_hz('C7'), 
                                           fill_na=None)

        if f0 is None: return []

        notes_brutes = []
        current_note = None
        count = 0

        # On parcourt les fréquences détectées
        for i, freq in enumerate(f0):
            # Seuil de confiance abaissé à 0.3 pour ne pas rater les sifflements légers
            if freq is not None and not np.isnan(freq) and voiced_probs[i] > 0.3:
                midi_note = librosa.hz_to_midi(freq)
                note_nom = librosa.midi_to_note(int(round(midi_note)))
                
                if note_nom == current_note:
                    count += 1
                else:
                    if current_note and count >= 2:
                        notes_brutes.append({"pitch": current_note, "len": count})
                    current_note = note_nom
                    count = 1
            else:
                if current_note and count >= 2:
                    notes_brutes.append({"pitch": current_note, "len": count})
                    current_note = None
                    count = 0

        if current_note and count >= 2:
            notes_brutes.append({"pitch": current_note, "len": count})

        # Conversion des durées en format ABC
        for n in notes_brutes:
            l = n["len"]
            if l > 35: n["abc_len"] = "2"    # Blanche
            elif l > 15: n["abc_len"] = ""   # Noire
            else: n["abc_len"] = "/2"        # Croche
            
        return notes_brutes

    except Exception as e:
        print(f"Erreur Engine: {e}")
        return []