
# DELF Assistant — Vercel (gratuit)

Déployez cette API sur **Vercel** (compte gratuit). L’endpoint `/api/delf/score` :
- calcule les scores CO/CE/PE à partir d'une **clé** et des **réponses**
- génère un **DOCX** de commentaires et renvoie le **base64**

## Déploiement (rapide)
1) Créez un compte sur https://vercel.com et installez **Vercel CLI** (facultatif).
2) Importez ce dossier dans un **nouveau repo GitHub**.
3) Sur Vercel → **New Project** → importez le repo → Build & deploy (config auto).
4) L’URL sera du type : `https://votre-projet.vercel.app/api/delf/score` (public, sans authentification).

## Test
```bash
curl -X POST "https://votre-projet.vercel.app/api/delf/score"   -H "Content-Type: application/json"   --data '{ "niveau":"B2", "sujet":6, "cle":{"CO":{"EX1":[{"q":1,"correct":"C","points":1.0}]},"CE":{"A":[{"q":0,"correct":"A","points":1.5}]}}, "reponses":{"CO":{"EX1":{"1":"C"}},"CE":{"A":{"0":"A"}}}, "meta":{"nom_candidat":"Élève B2"} }'
```

## Copilot Studio
- Importez votre **OpenAPI** (optionnel) ou appelez l’URL directement depuis une **Action**.
- Pas d’authentification (ou ajoutez un secret ?token= dans l’URL si vous voulez).

## Attention
- Ce projet utilise `docx` (JS pur), compatible avec Vercel **Node.js 18**.
- Si vous avez besoin d’auth, ajoutez un token en variable d’environnement et vérifiez-le dans le handler.
