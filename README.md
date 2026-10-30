# ePortfolio — Lucas Da Dalt

Site statique (HTML, CSS, JavaScript), sans framework ni étape de compilation. Il s'héberge tel quel sur GitHub Pages.

## Structure

```
index.html                 une seule page, 6 sections (Welcome, Engineering course, International mobility,
                           Sustainability & civic engagement, Sport & other activities, Career development)
assets/css/style.css       mise en page, couleurs (rouge et blanc), mode clair / sombre
assets/js/main.js          CONFIG (liens), langue EN/FR, thème, vidéo, section active dans la barre
assets/js/physics.js       les 6 simulations de fond (Joukowski, Stokes, Navier-Stokes, Rayleigh-Bénard,
                           équation des ondes, transfert de Hohmann)
assets/fonts/              Bricolage Grotesque, Instrument Sans, IBM Plex Mono (hébergées avec le site)
assets/img/                photo.jpg à ajouter
assets/docs/               CV anglais et français (PDF)
```

## Mettre le site en ligne (15 minutes, sans ligne de commande)

1. Crée un compte sur [github.com](https://github.com). Choisis un nom d'utilisateur sobre, par exemple `lucasdadalt` : il apparaîtra dans l'adresse du site.
2. Clique sur **New repository**. Nomme-le exactement `NOMUTILISATEUR.github.io` (ex. `lucasdadalt.github.io`), laisse-le **Public**, ne coche rien d'autre, puis **Create repository**.
3. Sur la page du dépôt vide, clique sur **uploading an existing file**.
4. Dézippe le dossier du portfolio, ouvre-le, sélectionne **tout son contenu** (`index.html`, le dossier `assets`, `README.md`) et glisse-le dans la fenêtre GitHub. Glisse le contenu, pas le dossier parent.
5. Clique sur **Commit changes**.
6. Va dans **Settings → Pages**. Sous *Build and deployment*, choisis **Deploy from a branch**, branche **main**, dossier **/ (root)**, puis **Save**.
7. Attends une à deux minutes : l'adresse `https://NOMUTILISATEUR.github.io` s'affiche en haut de la page Pages. C'est le lien à déposer sur Moodle.

Teste ensuite le lien en navigation privée, sur ordinateur et sur téléphone (consigne de la checklist du cours).

## Mettre à jour le contenu

Pour modifier un fichier directement sur GitHub : ouvre-le, clique sur le crayon, modifie, puis **Commit changes**. Le site se met à jour en une minute.

| Quoi | Où | Comment |
|---|---|---|
| Photo | `assets/img/photo.jpg` | Photo carrée, au moins 400 × 400 px. Tant qu'elle manque, le site affiche « LD ». |
| CV anglais et français | `assets/docs/` | Déjà en place. Pour les remplacer, garde les mêmes noms de fichier. |
| Pitch vidéo | YouTube | Mets la vidéo en ligne en **Non répertoriée**. Copie l'identifiant (ce qui suit `watch?v=`) dans `youtubeId`. |
| E-mail de contact | `CONFIG.email` | Affiché en bas de page. Laisse vide pour le masquer. |
| LinkedIn | `CONFIG.linkedinEN` / `linkedinFR` | Si tu personnalises ton URL LinkedIn, remplace-la ici. |
| Textes | `index.html` | Chaque texte existe deux fois : `data-l="en"` (anglais) et `data-l="fr"` (français). Modifie toujours les deux. |

Un bouton dont le lien est vide reste grisé : rien n'est cassé en attendant.

## Données personnelles (RGPD)

Le cours demande de vérifier l'hébergement, les cookies et les traceurs. Ce site :

- ne dépose aucun cookie et n'utilise aucun outil de mesure d'audience ;
- héberge ses polices avec le site (aucune requête vers Google Fonts) ;
- ne contacte YouTube qu'au clic sur le bouton lecture, via `youtube-nocookie.com` ;
- mémorise seulement la langue et le thème choisis dans le navigateur du visiteur (`localStorage`) ;
- ne calcule les animations que pour la section visible à l'écran.

GitHub Pages est un hébergement public : n'y mets rien de confidentiel (adresse, numéro de téléphone si tu ne veux pas qu'il circule).

## Faire évoluer le portfolio

Le portfolio suit les 3 étapes du cours : *Launch* (S5–S6), *Upgrade* (S7–S8), *Validation* devant un jury (S9–S10). Pour ajouter un projet N7, copie le bloc d'un TIPE dans la section Engineering course et garde la même structure : problème, méthode, enseignement, outils.
