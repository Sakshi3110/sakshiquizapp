import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { database } from '../firebase-config';
import { ref, set, get, push, remove } from 'firebase/database';
import { QUESTIONS } from '../lib/questions';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';

export default function Admin() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [games, setGames] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [newQuestion, setNewQuestion] = useState({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    timeInSeconds: 30,
    imageUrl: ''
  });

  useEffect(() => {
    if (isLoggedIn) {
      loadGames();
    }
  }, [isLoggedIn]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'Quiz@2024!') {
      setIsLoggedIn(true);
      setUsername('');
      setPassword('');
    } else {
      alert('Invalid credentials');
    }
  };

  const loadGames = async () => {
    try {
      const gamesRef = ref(database, 'games');
      const snapshot = await get(gamesRef);
      if (snapshot.exists()) {
        const gamesArray = Object.entries(snapshot.val()).map(([id, data]) => ({
          id,
          ...data
        }));
        setGames(gamesArray.reverse());
      }
    } catch (error) {
      console.error('Error loading games:', error);
    }
  };

  const startNewGame = async () => {
    const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const gameRef = ref(database, `games/${gameId}`);
    
    try {
      await set(gameRef, {
        status: 'waiting',
        currentQuestion: 0,
        players: {},
        createdAt: new Date().toISOString(),
        adminId: 'admin'
      });
      loadGames();
      alert(`Game started! Code: ${gameId}`);
    } catch (error) {
      console.error('Error creating game:', error);
    }
  };

  const deleteGame = async (gameId) => {
    if (confirm('Are you sure you want to delete this game?')) {
      try {
        await remove(ref(database, `games/${gameId}`));
        loadGames();
      } catch (error) {
        console.error('Error deleting game:', error);
      }
    }
  };

  const addQuestion = async () => {
    if (!newQuestion.question || newQuestion.options.some(o => !o)) {
      alert('Please fill in all fields');
      return;
    }
    
    try {
      const questionsRef = ref(database, 'customQuestions');
      await push(questionsRef, newQuestion);
      setNewQuestion({
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        timeInSeconds: 30,
        imageUrl: ''
      });
      alert('Question added!');
    } catch (error) {
      console.error('Error adding question:', error);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="container">
        <div className="login-section">
          <h1 className="title">Admin Login</h1>
          <div className="card">
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                />
              </div>

              <button type="submit" className="button-primary">
                Login
              </button>
            </form>
          </div>
          <Link href="/">
            <button className="button-secondary" style={{ marginTop: '1rem' }}>
              Back to Home
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="admin-header">
        <h1 className="title">Admin Dashboard</h1>
        <button onClick={() => setIsLoggedIn(false)} className="button-secondary">
          Logout
        </button>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Games
        </button>
        <button
          className={`tab ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          Questions
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="admin-section">
          <button onClick={startNewGame} className="button-success">
            + Start New Game
          </button>

          <div className="games-list">
            {games.length === 0 ? (
              <p className="empty-message">No games yet. Start one to begin!</p>
            ) : (
              games.map((game) => (
                <div key={game.id} className="game-card">
                  <div className="game-info">
                    <h3>Game Code: {game.id}</h3>
                    <p>Status: <span className={`badge ${game.status}`}>{game.status}</span></p>
                    <p>Players: {Object.keys(game.players || {}).length}</p>
                    <p>Question: {game.currentQuestion + 1}/{QUESTIONS.length}</p>
                  </div>
                  <div className="game-actions">
                    <Link href={`/game/${game.id}?admin=true`}>
                      <button className="button-primary">View Game</button>
                    </Link>
                    <button
                      onClick={() => deleteGame(game.id)}
                      className="button-danger"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'questions' && (
        <div className="admin-section">
          <h2>Question Library</h2>
          
          <div className="questions-grid">
            {QUESTIONS.map((q, index) => (
              <div key={q.id} className="question-card">
                <h4>Question {index + 1}</h4>
                <p>{q.question}</p>
                <div className="options">
                  {q.options.map((opt, i) => (
                    <div key={i} className={i === q.correctAnswer ? 'option correct' : 'option'}>
                      {opt}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="add-question">
            <h3>Add Custom Question</h3>
            <div className="form-group">
              <label>Question</label>
              <input
                type="text"
                value={newQuestion.question}
                onChange={(e) => setNewQuestion({...newQuestion, question: e.target.value})}
                placeholder="Enter question"
                className="input"
              />
            </div>

            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="form-group">
                <label>Option {i + 1}</label>
                <input
                  type="text"
                  value={newQuestion.options[i]}
                  onChange={(e) => {
                    const newOptions = [...newQuestion.options];
                    newOptions[i] = e.target.value;
                    setNewQuestion({...newQuestion, options: newOptions});
                  }}
                  placeholder={`Option ${i + 1}`}
                  className="input"
                />
              </div>
            ))}

            <div className="form-group">
              <label>Correct Answer</label>
              <select
                value={newQuestion.correctAnswer}
                onChange={(e) => setNewQuestion({...newQuestion, correctAnswer: parseInt(e.target.value)})}
                className="input"
              >
                <option value={0}>Option 1</option>
                <option value={1}>Option 2</option>
                <option value={2}>Option 3</option>
                <option value={3}>Option 4</option>
              </select>
            </div>

            <div className="form-group">
              <label>Time (seconds)</label>
              <input
                type="number"
                value={newQuestion.timeInSeconds}
                onChange={(e) => setNewQuestion({...newQuestion, timeInSeconds: parseInt(e.target.value)})}
                className="input"
              />
            </div>

            <div className="form-group">
              <label>Image URL</label>
              <input
                type="text"
                value={newQuestion.imageUrl}
                onChange={(e) => setNewQuestion({...newQuestion, imageUrl: e.target.value})}
                placeholder="https://..."
                className="input"
              />
            </div>

            <button onClick={addQuestion} className="button-success">
              Add Question
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
