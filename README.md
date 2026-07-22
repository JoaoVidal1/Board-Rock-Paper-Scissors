# 🪨📄✂️ RPS Territory Chess (Board-Rock-Paper-Scissors)

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

A highly customizable, web-based strategy board game that combines the movement of Chess Kings, the combat mechanics of Rock-Paper-Scissors, and the territory control of Go! 

This project is inspired by the physical board game concept created by **webgoatguy** in [this YouTube video](https://www.youtube.com/live/kG06wRlBI2A?si=eJ7xnGk7Z0jI-Z2P). 

While the original concept was fantastic, this web version introduces a powerful settings panel that allows you to heavily customize the ruleset. This makes playtesting, finding balanced mechanics, and creating fun new variants incredibly easy.

---

## 🎮 How to Play

### Basic Rules
1. **The Board:** The game is played on a 9x9 grid. 
2. **The Pieces:** Each player (Blue vs. Red) starts with 6 pieces: 2 Rocks (🪨), 2 Papers (📄), and 2 Scissors (✂️).
3. **Movement:** Pieces move exactly like a King in chess (one square in any direction: orthogonal or diagonal).
4. **Combat:** Pieces capture each other following standard RPS rules:
   * 🪨 Rock crushes ✂️ Scissors
   * ✂️ Scissors cuts 📄 Paper
   * 📄 Paper covers 🪨 Rock
5. **Territory Control:** Moving into a blank, unowned square claims it for your color. The player with the most claimed territory when the game ends wins!

---

## ✨ Features & Customization

This game features a robust settings sidebar to tweak the game's mechanics to your liking:

* **Move Patterns:** Choose how many moves players get per turn.
  * `1-1-1-1...` (Standard one move per turn)
  * `1-2-2-2... (Same Piece)` (Players get two moves, but must use the same piece)
  * `1-2-2-2... (Any Piece)` (Players get two moves and can split them across different pieces)
* **Splash Capture (Area of Effect):** Decide what happens to surrounding squares when a piece is captured! You can set kills to claim all 8 adjacent squares, only orthogonal ones, only diagonal ones, or conditional ones based on the angle of attack.
* **Double Moves in Territory:** Toggle whether pieces get a "free" extra move if they bounce through a square you already control.
* **Adjacency Blocking:** Toggle a rule that prevents opposing pieces of the *same type* from standing side-by-side (similar to opposing Kings in chess).
* **Target Square Claim:** Toggle whether killing an enemy piece automatically claims the square they were standing on.
* **Playtesting Bot:** Don't have a friend to play with? Play against the built-in Red Bot.
  * **Easy:** Makes random valid moves.
  * **Medium:** Actively hunts for captures and territory.
  * **Hard:** Plays aggressively but evaluates the board to avoid stepping into danger.
* **Dark Mode:** Easy on the eyes for late-night playtesting! 🌙

---

## 🚀 How to Run (Installation)

Because this is built with pure Vanilla HTML, CSS, and JS, there is no build step or installation required! Just player it here: https://joaovidal1.github.io/Board-Rock-Paper-Scissors/

Alternatively you can clone the repository:
   ```bash
   git clone [https://github.com/yourusername/Board-Rock-Paper-Scissors.git](https://github.com/yourusername/Board-Rock-Paper-Scissors.git)
