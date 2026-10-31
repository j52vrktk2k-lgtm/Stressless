# Stressless

Webapp mobile de mini-jeux anti-stress et de jeux de réflexion. HTML/CSS/JS pur, sans dépendance ni build, installable sur l'écran d'accueil et jouable hors ligne.

## Jeux

**Se détendre**
- 🫧 **Papier bulle** : éclate les bulles en tapant ou en glissant le doigt (son + vibration).
- 🌬️ **Respiration** : cercle guidé : cohérence cardiaque 5·5, respiration carrée, 4·7·8.
- 🌀 **Mandala** : dessin avec symétrie radiale (×4 à ×12), multi-doigts, fondu progressif.

**Réfléchir**
- 🃏 **Memory** : retrouve les paires (3 niveaux, record de coups).
- 🧩 **Taquin** : 3×3, 4×4 ou 5×5, toujours soluble, record coups/temps.

## Lancer en local

```sh
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Mettre en ligne (GitHub Pages)

1. Sur GitHub : **Settings → Pages → Build and deployment**
2. Source : **Deploy from a branch**, branche `main`, dossier `/ (root)`
3. L'app sera disponible sur `https://<utilisateur>.github.io/stressless/`

## Installer sur le téléphone

- **iPhone (Safari)** : bouton Partager → « Sur l'écran d'accueil »
- **Android (Chrome)** : menu ⋮ → « Installer l'application »

## Ajouter un jeu

Créer un module dans `js/games/` qui exporte `{ id, title, icon, desc, category: 'relax' | 'mind', tint, mount(stage) }`
(`mount` renvoie une fonction de nettoyage), l'ajouter à `GAMES` dans `js/app.js` et à la liste `FILES` de `sw.js`
(puis incrémenter `VERSION`).
