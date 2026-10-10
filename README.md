# FRAGQUENCE // Noeud 07

Prototype FPS solo retro dans le navigateur, independant du site Bouygues Telecom.

## Lancer

```bash
nvm use 20
npm install
npm run dev
```

Ouvrir l'URL affichee par Vite sur un ordinateur avec clavier et souris (WebGL requis). Cliquez sur **Entrer dans le noeud** pour capturer la souris. Echap met en pause.

## Objectif

Deux niveaux sont disponibles : **Noeud 07** (datacenter) puis **Noeud 08** (centre de transit, nouvelle carte et nouveaux affrontements). Recuperer les trois modules reseau, rejoindre le relais, l'activer avec `E`, puis eliminer la vague finale. Apres une victoire ou une defaite, un ecran de resultat s'affiche : **Continuer** ramene a l'ecran principal pour choisir **Niveau suivant** ou **Recommencer**. On peut aussi ouvrir directement `/?level=2` pour tester le deuxieme niveau. Une defaite relance le niveau en cours ; chaque niveau commence avec ses propres armes et munitions.

## Commandes

| Action | Touche |
| --- | --- |
| Se deplacer | ZQSD (AZERTY) ou WASD (QWERTY), fleches |
| Regarder / tirer | Souris / clic gauche |
| Courir / sauter | Maj / Espace |
| Changer d'arme | Touches 1, 2, 3 (sans Maj sur AZERTY), pave numerique ou molette |
| Recharger | R |
| Interagir | E |
| Pause | Echap |

Armes : Impulsion (18 coups), Fusil fibre (6 coups) et Lance-paquets (4 coups). Le HUD liste les trois armes et indique lesquelles sont disponibles ou verrouillees, avec chargeur et reserve. Recharger prend du temps et le changement d'arme interrompt le rechargement. Les ramassages ajoutent a la reserve. Les bruitages sont generes dans le navigateur. `PlayerZero - APEX.mp3` est inclus et joue en boucle pendant la partie ; un autre fichier audio peut etre choisi sur l'ecran d'accueil ou de pause. Les volumes musique et bruitages sont reglables separement. Le depot est public : verifier les droits de diffusion du morceau avant de redistribuer le jeu. Jeu non officiel, sans connexion ni donnees personnelles.
