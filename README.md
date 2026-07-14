# 🎰 Word Casino 🤠

Welcome to the **Word Casino**! Step inside a stylish, Western-themed saloon filled with word-guessing and letter-wagering games. Play alone against bots, or host a real-time multiplayer saloon party with your friends.

---

## 🎮 Key Features

1. **Saloon Lobby**:
   - Sound effects and ambient background saloon music toggles.
   - Bank ledger for persistence of your single-player coins.
   - Bankruptcy bailout system (get a refill of chips if you lose it all!).

2. **Wanted (Bounty Hunt)**:
   - Play against bots or coop in multiplayer.
   - Wagering system with customizable chip values (`$10` to `$500`).
   - Dynamic mistake indicators (skulls) and themed categories.

3. **Letterjack**:
   - Dealer hand reveal phase.
   - Multi-player turn sequencing.
   - Real-time word verification against a dictionary.
   - Stand/Hit choices based on letter value sums.

4. **Multiplayer Party Rooms**:
   - Websocket-based real-time synchronized gameplay.
   - Room code generation (e.g., `ABCD`) to share with friends.
   - Live sidebar showing all party members, their active coin balances, and their current game states.

---

## 🛠️ Tech Stack

- **Frontend**: [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vite.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/)
- **Animations**: [Motion (Framer Motion)](https://motion.dev/)
- **Backend & Websockets**: [Express](https://expressjs.com/) + [ws (WebSockets)](https://github.com/websockets/ws)

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### Installation
1. Clone the repository and navigate to the project directory:
   ```bash
   cd Word-Casino
   ```
2. Install the required dependencies:
   ```bash
   npm install
   ```

### Running the Application
1. Start the server (which compiles the frontend and runs the backend):
   ```bash
   npm run dev
   ```
2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## 📂 Project Structure

```
Word-Casino/
├── src/
│   ├── components/
│   │   ├── CollectionDetails.tsx  # Unlocked words/items showcase
│   │   ├── LetterjackGame.tsx     # Letterjack game logic and interface
│   │   ├── PartyContext.tsx       # WebSocket & multiplayer room state
│   │   ├── PartySidebar.tsx       # Live status list of room players
│   │   ├── SaloonLobby.tsx        # Main menu and room controls
│   │   ├── StatsView.tsx          # Player ledger/statistics
│   │   └── WantedGame.tsx         # Wanted game logic and interface
│   ├── utils/
│   │   ├── audio.ts               # Sound effects manager
│   │   └── dictionary.ts          # Word generation & validator
│   ├── App.tsx                    # Main app coordinator
│   ├── main.tsx                   # Frontend entry point
│   └── index.css                  # Custom styling
├── server.ts                      # Express & WebSockets server
├── package.json                   # Dependencies and npm scripts
└── tsconfig.json                  # TypeScript configuration
```
