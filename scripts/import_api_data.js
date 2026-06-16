const fs = require('fs');
const path = require('path');

const gamesMdPath = '/home/daniele/.gemini/antigravity-cli/brain/b257a148-59fb-4c07-bfba-c8fdff0c2995/.system_generated/steps/20/content.md';
const teamsMdPath = '/home/daniele/.gemini/antigravity-cli/brain/b257a148-59fb-4c07-bfba-c8fdff0c2995/.system_generated/steps/24/content.md';

const DATA_DIR = path.join(__dirname, '..', 'Data');
const TARGET_PATH = path.join(DATA_DIR, 'games.json');
const BACKUP_PATH = path.join(DATA_DIR, 'games_backup.json');

function extractJsonFromMd(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('{') && line.trim().endsWith('}')) {
      return JSON.parse(line.trim());
    }
  }
  throw new Error(`Could not find JSON line in ${filePath}`);
}

const timezoneOffsets = {
  "1": -6,
  "2": -6,
  "3": -6,
  "4": -5,
  "5": -5,
  "6": -5,
  "7": -4,
  "8": -4,
  "9": -4,
  "10": -4,
  "11": -4,
  "12": -4,
  "13": -7,
  "14": -7,
  "15": -7,
  "16": -7
};

function parseLocalDate(localDateStr, stadiumId) {
  if (!localDateStr) return { dateStr: new Date(0).toISOString(), timestamp: 0 };
  
  // Format: MM/DD/YYYY HH:mm
  const [datePart, timePart] = localDateStr.split(' ');
  const [month, day, year] = datePart.split('/');
  const [hour, minute] = timePart.split(':');
  
  const offset = timezoneOffsets[stadiumId] || 0;
  
  // Convert stadium local time to UTC by subtracting the offset (e.g. 15:00 local with offset -4 = 19:00 UTC)
  const utcTimestampMs = Date.UTC(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    parseInt(hour, 10) - offset,
    parseInt(minute, 10)
  );
  
  const dateObj = new Date(utcTimestampMs);
  
  return {
    dateStr: dateObj.toISOString(),
    timestamp: Math.floor(dateObj.getTime() / 1000)
  };
}

try {
  console.log('Extracting data from cached steps...');
  const gamesData = extractJsonFromMd(gamesMdPath);
  const teamsData = extractJsonFromMd(teamsMdPath);
  
  console.log(`Loaded ${gamesData.games.length} games and ${teamsData.teams.length} teams.`);

  // Create a map of teams by their string ID
  const teamsMap = {};
  teamsData.teams.forEach(team => {
    teamsMap[team.id] = team;
  });

  // Transform each match to project schema
  const transformedGames = gamesData.games.map(game => {
    const homeTeamId = game.home_team_id;
    const awayTeamId = game.away_team_id;

    // Resolve home team info
    let homeName = game.home_team_name_en || game.home_team_label || `Team ${homeTeamId}`;
    let homeLogo = "";
    if (homeTeamId !== "0" && teamsMap[homeTeamId]) {
      homeName = teamsMap[homeTeamId].name_en;
      homeLogo = teamsMap[homeTeamId].flag;
    } else if (game.home_team_label) {
      homeName = game.home_team_label;
    }

    // Resolve away team info
    let awayName = game.away_team_name_en || game.away_team_label || `Team ${awayTeamId}`;
    let awayLogo = "";
    if (awayTeamId !== "0" && teamsMap[awayTeamId]) {
      awayName = teamsMap[awayTeamId].name_en;
      awayLogo = teamsMap[awayTeamId].flag;
    } else if (game.away_team_label) {
      awayName = game.away_team_label;
    }

    const { dateStr, timestamp } = parseLocalDate(game.local_date, game.stadium_id);
    const isFinished = game.finished === "TRUE";

    // Setup goals and scores (null if not finished)
    const homeGoals = isFinished ? parseInt(game.home_score, 10) : null;
    const awayGoals = isFinished ? parseInt(game.away_score, 10) : null;

    return {
      fixture: {
        id: parseInt(game.id, 10),
        apiId: game._id,
        date: dateStr,
        timestamp: timestamp,
        status: {
          long: isFinished ? "Match Finished" : "Not Started",
          short: isFinished ? "FT" : "NS"
        }
      },
      teams: {
        home: {
          name: homeName,
          logo: homeLogo
        },
        away: {
          name: awayName,
          logo: awayLogo
        }
      },
      goals: {
        home: homeGoals,
        away: awayGoals
      },
      score: {
        fulltime: {
          home: homeGoals,
          away: awayGoals
        }
      }
    };
  });

  // Sort games chronologically, resolving ties by ID
  transformedGames.sort((a, b) => {
    if (a.fixture.timestamp !== b.fixture.timestamp) {
      return a.fixture.timestamp - b.fixture.timestamp;
    }
    return a.fixture.id - b.fixture.id;
  });

  // Backup existing games.json if it exists
  if (fs.existsSync(TARGET_PATH)) {
    fs.copyFileSync(TARGET_PATH, BACKUP_PATH);
    console.log(`Created backup of existing games.json at ${BACKUP_PATH}`);
  }

  // Write new games JSON to Data/games.json
  fs.writeFileSync(TARGET_PATH, JSON.stringify(transformedGames, null, 2), 'utf8');
  console.log(`Successfully imported ${transformedGames.length} games to ${TARGET_PATH}`);

} catch (err) {
  console.error('Error during import process:', err);
}
