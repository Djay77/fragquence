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

Recuperer les trois modules reseau, rejoindre la salle du relais au sud, activer le relais avec `E`, puis eliminer la vague finale. Si la sante tombe a zero, relancer la mission.

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

Armes : Impulsion (18 coups), Fusil fibre (6 coups) et Lance-paquets (4 coups). Chaque arme a un chargeur et une reserve ; recharger prend du temps et le changement d'arme interrompt le rechargement. Les ramassages ajoutent a la reserve. Les bruitages sont generes dans le navigateur. Pour la musique, choisir un fichier audio sur l'ecran d'accueil ou de pause : il reste local au navigateur, boucle pendant la partie et s'arrete en pause. Les volumes musique et bruitages sont reglables separement. `PlayerZero - APEX.mp3` n'est pas publie dans le depot public tant que ses droits de diffusion ne sont pas confirmes. Jeu non officiel, sans connexion ni donnees personnelles.
