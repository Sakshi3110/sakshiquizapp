import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { database } from '../../firebase-config';
import { ref, set, get, onValue, update } from 'firebase/database';
import { QUESTIONS } from '../../lib/questions';
import Link from 'next/link';

export default function Game() {
  const router = useRouter();
  const { gameId, playerName, admin } = router.query;
  
  const [gameState, setGameState] = useState('loading');
  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [playerId, setPlayerId] = useState(null);
  const [playerAnswer, setPlayerAnswer] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    if (!gameId) return;

    const gameRef = ref(database, `games/${gameId}`);
    const unsubscribe = onValue(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        const gameData = snapshot.val();
        setGame(gameData);
        setCurrentQuestion(gameData.currentQuestion || 0);

        if (gameData.players) {
          setPlayers(gameData.players);
          const sortedPlayers = Object.entries(gameData.players)
            .map(([id, player]) => ({ id, ...player }))
            .sort((a, b) => (b.score || 0) - (a.score || 0));
          setLeaderboard(sortedPlayers);
        }

        setGameState(gameData.status);
      } else {
        setGameState('notfound');
      }
    });

    return () => unsubscribe();
  }, [gameId]);

  useEffect(() => {
    if (!playerName && !admin) return;

    if (!playerId) {
      const newPlayerId = Math.random().toString(36).substring(7);
      setPlayerId(newPlayerId);

      const playerRef = ref(database, `games/${gameId}/players/${newPlayerId}`);
      set(playerRef, {
        name: playerName,
        score: 0,
        answered: false,
        answeredAt: null
      });
    }
  }, [playerName, gameId, playerId, admin]);

  useEffect(() => {
    if (gameState !== 'playing' || answered) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setAnswered(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, answered]);

  const handleAnswer = async (optionIndex) => {
    if (answered || !playerId) return;

    setPlayerAnswer(optionIndex);
    setAnswered(true);

    const isCorrect = optionIndex === QUESTIONS[currentQuestion].correctAnswer;
    const points = isCorrect ? Math.max(0, Math.round(timeLeft * 10)) : 0;

    const playerRef = ref(database, `games/${gameId}/players/${playerId}`);
    await update(playerRef, {
      answered: true,
      answeredCorrectly: isCorrect,
      score: (players[playerId]?.score || 0) + points,
      answerTime: new Date().toISOString()
    });
  };

  const startQuiz = async () => {
    const gameRef = ref(database, `games/${gameId}`);
    await update(gameRef, {
      status: 'playing',
      currentQuestion: 0
    });
  };

  const nextQuestion = async () => {
    const nextQ = currentQuestion + 1;
    
    if (nextQ < QUESTIONS.length) {
      const gameRef = ref(database, `games/${gameId}`);
      
      const updatedPlayers = {};
      Object.keys(players).forEach((pId) => {
        updatedPlayers[pId] = {
          ...players[pId],
          answered: false,
          answeredAt: null
        };
      });

      await update(gameRef, {
        currentQuestion: nextQ,
        players: updatedPlayers
      });

      setAnswered(false);
      setPlayerAnswer(null);
      setTimeLeft(QUESTIONS[nextQ].timeInSeconds);
    } else {
      const gameRef = ref(database, `games/${gameId}`);
      await update(gameRef, {
        status: 'finished'
      });
    }
  };

  if (!router.isReady) {
    return <div className="container"><p>Loading...</p></div>;
  }

  if (!admin && !playerName) {
    return (
      <div className="container">
        <Link href="/">
          <button className="button-secondary">Back</button>
        </Link>
        <p>Invalid game session</p>
      </div>
    );
  }

  if (gameState === 'notfound') {
    return (
      <div className="container">
        <h1>Game Not Found</h1>
        <p>The game code doesn't exist or has ended.</p>
        <Link href="/">
          <button className="button-primary">Back to Home</button>
        </Link>
      </div>
    );
  }

  if (gameState === 'loading') {
    return (
      <div className="container">
        <p>Loading game...</p>
      </div>
    );
  }

  if (gameState === 'waiting') {
    return (
      <div className="container">
        <div className="lobby">
          <h1>Game Code: {gameId}</h1>
          <p className="subtitle">Waiting for players...</p>

          <div className="players-list">
            {Object.entries(players).map(([id, player]) => (
              <div key={id} className="player-item">
                <span>{player.name}</span>
                <span className="badge">Joined</span>
              </div>
            ))}
          </div>

          {admin && (
            <button onClick={startQuiz} className="button-success">
              Start Quiz ({Object.keys(players).length} players)
            </button>
          )}

          {!admin && (
            <p className="info-text">Waiting for host to start...</p>
          )}
        </div>
      </div>
    );
  }

  if (gameState === 'playing') {
    const question = QUESTIONS[currentQuestion];
    const isCorreect = playerAnswer === question.correctAnswer;

    return (
      <div className="container game-container">
        <div className="game-main">
          <div className="question-section">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${((currentQuestion + 1) / QUESTIONS.length) * 100}%`
                }}
              ></div>
            </div>

            <h2 className="question-text">{question.question}</h2>

            {question.imageUrl && (
              <img src={question.imageUrl} alt="Question" className="question-image" />
            )}

            <div className="timer">
              <div className={`timer-display ${timeLeft <= 5 ? 'critical' : ''}`}>
                {timeLeft}s
              </div>
            </div>

            {!answered ? (
              <div className="options-grid">
                {question.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    className={`option-button ${playerAnswer === index ? 'selected' : ''}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <div className="answer-feedback">
                <p className={`feedback-text ${isCorrect ? 'correct' : 'incorrect'}`}>
                  {isCorrect ? '✓ Correct!' : '✗ Incorrect!'}
                </p>
                {isCorrect && (
                  <p className="points">+{Math.max(0, Math.round(timeLeft * 10))} points</p>
                )}
                {!admin && !isCorrect && (
                  <p className="correct-answer">
                    Correct answer: {question.options[question.correctAnswer]}
                  </p>
                )}
              </div>
            )}

            {admin && answered && (
              <button onClick={nextQuestion} className="button-success">
                Next Question →
              </button>
            )}
          </div>

          <div className="leaderboard-section">
            <h3>Leaderboard</h3>
            <div className="leaderboard">
              {leaderboard.map((player, index) => (
                <div key={player.id} className={`leaderboard-item ${index === 0 ? 'first' : ''}`}>
                  <span className="rank">#{index + 1}</span>
                  <span className="name">{player.name}</span>
                  <span className="score">{player.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'finished') {
    const winner = leaderboard[0];

    return (
      <div className="container">
        <div className="results-section">
          <h1>🎉 Quiz Complete!</h1>

          <div className="winner-card">
            <h2>Winner: {winner?.name}</h2>
            <p className="final-score">{winner?.score} points</p>
          </div>

          <div className="final-leaderboard">
            {leaderboard.map((player, index) => (
              <div key={player.id} className="final-rank">
                <span className="medal">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </span>
                <span>{player.name}</span>
                <span className="score">{player.score} pts</span>
              </div>
            ))}
          </div>

          <Link href="/">
            <button className="button-primary">Home</button>
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
