#  Sifflo - De la voix à la partition 

**Sifflo** est une application web intelligente conçue pour les musiciens (et particulièrement les flûtistes) qui ont une mélodie en tête mais ne savent pas comment la transcrire. Il suffit de fredonner ou de siffler, et Sifflo génère automatiquement la partition correspondante.

##  Le Concept
En tant que flûtiste, il est courant d'avoir une inspiration soudaine. **Sifflo** utilise le traitement numérique du signal (DSP) pour :
1. Enregistrer ton sifflement ou ta voix.
2. Analyser les fréquences (Pitch Detection).
3. Convertir ces données en notes de musique réelles.
4. Afficher une partition propre prête à être jouée.

##  Tech Stack
L'architecture est de type **Hybride** pour allier performance UI et puissance de calcul :

*   **Frontend :** [React.js](https://reactjs.org/) + [Vite](https://vitejs.dev/) (Interface réactive et rapide).
*   **Rendu Musical :** [VexFlow](https://www.vexflow.com/) (Gravure de partitions en JavaScript).
*   **Backend :** [FastAPI](https://fastapi.tiangolo.com/) (Python) pour le traitement du signal.
*   **Analyse Audio :** [Librosa](https://librosa.org/) & NumPy (La référence pour le traitement audio en Python).

##  Architecture du Projet
```text
sifflo/
├── client/   # Interface React & Capture Audio
├── server/   # Cerveau de traitement (DSP & Algorithmes)
└── docs/     # Documentation technique & Algos
```

## Installation & Lancement
1) FRONTEND
```text
cd client
npm install
npm run dev
```
2) BACKEND
```text
cd server
python -m venv venv
source venv/bin/activate  # Sur Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```