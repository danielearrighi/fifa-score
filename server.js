const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const scoreManager = require('./scoreManager');
const apiService = require('./apiService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize files on start
scoreManager.initGamesFile();
scoreManager.updateScores(); // Run once on startup to make sure scores are accurate

// API Routes

// 1. Get all players sorted by Score descending (Leaderboard)
app.get('/api/players', (req, res) => {
  try {
    if (!fs.existsSync(scoreManager.DATA_PATH)) {
      return res.status(404).json({ error: 'Player database not found' });
    }
    const players = JSON.parse(fs.readFileSync(scoreManager.DATA_PATH, 'utf8'));
    // Sort players by Score descending
    const sortedPlayers = [...players].sort((a, b) => b.Score - a.Score);
    res.json(sortedPlayers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get next match
app.get('/api/next-match', (req, res) => {
  try {
    const nextMatchInfo = scoreManager.getNextMatch();
    if (!nextMatchInfo || !nextMatchInfo.match) {
      return res.status(404).json({ error: 'No upcoming matches found' });
    }
    res.json(nextMatchInfo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2b. Get match by index
app.get('/api/match/:index', (req, res) => {
  try {
    const index = parseInt(req.params.index);
    if (isNaN(index)) {
      return res.status(400).json({ error: 'Invalid match index' });
    }
    
    const games = JSON.parse(fs.readFileSync(scoreManager.GAMES_PATH, 'utf8'));
    const sortedGames = [...games].sort((a, b) => {
      if (a.fixture.timestamp !== b.fixture.timestamp) {
        return a.fixture.timestamp - b.fixture.timestamp;
      }
      return a.fixture.id - b.fixture.id;
    });
    
    if (index < 0 || index >= sortedGames.length) {
      return res.status(404).json({ error: 'Match index out of bounds' });
    }
    
    res.json({
      match: sortedGames[index],
      index: index,
      totalMatches: sortedGames.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Get predictions for a specific match index
app.get('/api/match/:index/predictions', (req, res) => {
  try {
    const index = parseInt(req.params.index);
    if (isNaN(index)) {
      return res.status(400).json({ error: 'Invalid match index' });
    }
    
    if (!fs.existsSync(scoreManager.DATA_PATH)) {
      return res.status(404).json({ error: 'Player database not found' });
    }
    
    const players = JSON.parse(fs.readFileSync(scoreManager.DATA_PATH, 'utf8'));
    
    const predictions = players.map(p => {
      const pred = p.Predictions && p.Predictions[index] ? p.Predictions[index] : '-';
      return {
        player: p.Player,
        prediction: pred,
        score: p.Score
      };
    });
    
    res.json(predictions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. On-demand sync with API-Football
app.post('/api/sync', async (req, res) => {
  try {
    const apiKey = req.body.apiKey || process.env.API_FOOTBALL_KEY;
    const provider = req.body.provider || process.env.API_PROVIDER || 'api-sports';
    
    if (!apiKey) {
      return res.status(400).json({ 
        error: 'API Key missing. Provide it in the request body or configure API_FOOTBALL_KEY in .env file.' 
      });
    }
    
    const result = await apiService.syncWithApi(apiKey, provider);
    res.json({
      success: true,
      message: `Database successfully synced. ${result.updatedCount} matches updated.`,
      updatedCount: result.updatedCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Simulation route - Completes the next match with a random or user-specified score
app.post('/api/simulate-match', (req, res) => {
  try {
    const nextMatchInfo = scoreManager.getNextMatch();
    if (!nextMatchInfo || !nextMatchInfo.match || scoreManager.isMatchFinished(nextMatchInfo.match)) {
      return res.status(400).json({ error: 'No matches left to simulate.' });
    }
    
    const games = JSON.parse(fs.readFileSync(scoreManager.GAMES_PATH, 'utf8'));
    
    // Find index of this match in the main array
    const matchId = nextMatchInfo.match.fixture.id;
    const matchIndexInGames = games.findIndex(g => g.fixture.id === matchId);
    
    if (matchIndexInGames === -1) {
      return res.status(404).json({ error: 'Match not found in games list.' });
    }
    
    // Parse specified goals if provided
    let homeGoals;
    let awayGoals;
    
    const reqHome = req.body.homeGoals;
    const reqAway = req.body.awayGoals;
    
    if (reqHome !== undefined && reqHome !== null && reqHome !== '' &&
        reqAway !== undefined && reqAway !== null && reqAway !== '') {
      const parsedHome = parseInt(reqHome, 10);
      const parsedAway = parseInt(reqAway, 10);
      
      if (!isNaN(parsedHome) && parsedHome >= 0 && !isNaN(parsedAway) && parsedAway >= 0) {
        homeGoals = parsedHome;
        awayGoals = parsedAway;
      }
    }
    
    // Fallback to random simulation (home: 0-4, away: 0-4) if not specified or invalid
    if (homeGoals === undefined || awayGoals === undefined) {
      homeGoals = Math.floor(Math.random() * 5);
      awayGoals = Math.floor(Math.random() * 5);
    }
    
    games[matchIndexInGames].goals = { home: homeGoals, away: awayGoals };
    games[matchIndexInGames].score = {
      fulltime: { home: homeGoals, away: awayGoals }
    };
    games[matchIndexInGames].fixture.status = {
      long: "Match Finished",
      short: "FT"
    };
    
    // Save updated games
    fs.writeFileSync(scoreManager.GAMES_PATH, JSON.stringify(games, null, 2), 'utf8');
    
    // Re-calculate scores
    scoreManager.updateScores();
    
    res.json({
      success: true,
      message: `Simulated match: ${nextMatchInfo.match.teams.home.name} ${homeGoals} - ${awayGoals} ${nextMatchInfo.match.teams.away.name}`,
      match: games[matchIndexInGames]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Reset route - Resets games back to initial state
app.post('/api/reset-games', (req, res) => {
  try {
    if (fs.existsSync(scoreManager.INITIAL_GAMES_PATH)) {
      fs.copyFileSync(scoreManager.INITIAL_GAMES_PATH, scoreManager.GAMES_PATH);
      scoreManager.updateScores();
      res.json({ success: true, message: 'Games and scores successfully reset to default.' });
    } else {
      res.status(404).json({ error: 'Initial games database not found.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback to index.html for undefined routes (supporting routing if needed)
app.get('/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`FIFA Score Server running on port ${PORT}`);
  console.log(`URL: http://localhost:${PORT}`);
});
