import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [gameId, setGameId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoinGame = async (e) => {
    e.preventDefault();
    if (!gameId.trim() || !playerName.trim()) {
      alert('Please enter both game code and your name');
      return;
    }
    setLoading(true);
    router.push(`/game/${gameId}?playerName=${encodeURIComponent(playerName)}`);
  };

  return (
    <div className="container">
      <div className="welcome-section">
        <h1 className="title">🎮 Quiz Challenge</h1>
        <p className="subtitle">Join a live multiplayer quiz game</p>

        <div className="card">
          <form onSubmit={handleJoinGame}>
            <div className="form-group">
              <label htmlFor="gameId">Game Code</label>
              <input
                id="gameId"
                type="text"
                placeholder="Enter game code"
                value={gameId}
                onChange={(e) => setGameId(e.target.value.toUpperCase())}
                className="input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="playerName">Your Name</label>
              <input
                id="playerName"
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="input"
              />
            </div>

            <button type="submit" disabled={loading} className="button-primary">
              {loading ? 'Joining...' : 'Join Game'}
            </button>
          </form>
        </div>

        <div className="divider">OR</div>

        <Link href="/admin">
          <button className="button-secondary">Admin Dashboard</button>
        </Link>

        <p className="info-text">
          Ask your host for the game code to join a quiz!
        </p>
      </div>
    </div>
  );
}
