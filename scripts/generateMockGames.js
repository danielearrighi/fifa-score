const fs = require('fs');
const path = require('path');

const matches = [
  // June 11
  { home: "Mexico", away: "South Africa", date: "2026-06-11T23:00:00.000Z", homeGoals: 2, awayGoals: 0, status: "FT" },
  { home: "South Korea", away: "Czechia", date: "2026-06-12T02:30:00.000Z", homeGoals: 1, awayGoals: 2, status: "FT" },
  // June 12
  { home: "Canada", away: "Bosnia and Herzegovina", date: "2026-06-12T22:00:00.000Z", homeGoals: 1, awayGoals: 1, status: "FT" },
  { home: "USA", away: "Paraguay", date: "2026-06-13T01:30:00.000Z", homeGoals: 3, awayGoals: 1, status: "FT" },
  // June 13
  { home: "Qatar", away: "Switzerland", date: "2026-06-13T19:00:00.000Z", homeGoals: 0, awayGoals: 2, status: "FT" },
  { home: "Brazil", away: "Morocco", date: "2026-06-13T22:00:00.000Z", homeGoals: 2, awayGoals: 1, status: "FT" },
  { home: "Scotland", away: "Haiti", date: "2026-06-14T01:00:00.000Z", homeGoals: 2, awayGoals: 0, status: "FT" },
  { home: "Australia", away: "Türkiye", date: "2026-06-14T04:00:00.000Z", homeGoals: 1, awayGoals: 1, status: "FT" },
  // June 14
  { home: "Germany", away: "Curaçao", date: "2026-06-14T19:00:00.000Z", homeGoals: 7, awayGoals: 1, status: "FT" },
  { home: "Netherlands", away: "Japan", date: "2026-06-14T22:00:00.000Z", homeGoals: 2, awayGoals: 0, status: "FT" },
  { home: "Ivory Coast", away: "Ecuador", date: "2026-06-15T01:00:00.000Z", homeGoals: 1, awayGoals: 2, status: "FT" },
  { home: "Sweden", away: "Tunisia", date: "2026-06-15T04:00:00.000Z", homeGoals: 1, awayGoals: 0, status: "FT" },
  // June 15
  { home: "Spain", away: "Cape Verde", date: "2026-06-15T19:00:00.000Z", homeGoals: 3, awayGoals: 0, status: "FT" },
  { home: "Belgium", away: "Egypt", date: "2026-06-15T22:00:00.000Z", homeGoals: 2, awayGoals: 0, status: "FT" },
  { home: "Saudi Arabia", away: "Uruguay", date: "2026-06-16T01:00:00.000Z", homeGoals: 1, awayGoals: 2, status: "FT" },
  { home: "Iran", away: "New Zealand", date: "2026-06-16T04:00:00.000Z", homeGoals: 1, awayGoals: 1, status: "FT" },
  // June 16 (Today - starts as not finished)
  { home: "France", away: "Senegal", date: "2026-06-16T19:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" },
  { home: "Argentina", away: "Algeria", date: "2026-06-16T22:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" },
  { home: "Norway", away: "Iraq", date: "2026-06-17T01:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" },
  { home: "Austria", away: "Jordan", date: "2026-06-17T04:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" },
  // June 17
  { home: "England", away: "Croatia", date: "2026-06-17T19:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" },
  { home: "Italy", away: "Cameroon", date: "2026-06-17T22:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" },
  { home: "Colombia", away: "Uzbekistan", date: "2026-06-18T01:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" },
  { home: "Denmark", away: "Angola", date: "2026-06-18T04:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" },
  // June 18
  { home: "Portugal", away: "Panama", date: "2026-06-18T19:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" },
  { home: "Mexico", away: "Czechia", date: "2026-06-18T22:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" },
  { home: "South Korea", away: "South Africa", date: "2026-06-19T01:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" },
  { home: "Canada", away: "Switzerland", date: "2026-06-19T04:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" },
  // June 19
  { home: "Qatar", away: "Bosnia and Herzegovina", date: "2026-06-19T19:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" },
  { home: "Brazil", away: "Haiti", date: "2026-06-19T22:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" },
  { home: "Scotland", away: "Morocco", date: "2026-06-20T01:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" },
  { home: "USA", away: "Türkiye", date: "2026-06-20T04:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" },
  // June 20
  { home: "Australia", away: "Paraguay", date: "2026-06-20T19:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" },
  { home: "Germany", away: "Ecuador", date: "2026-06-20T22:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" },
  { home: "Ivory Coast", away: "Curaçao", date: "2026-06-21T01:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" },
  { home: "Netherlands", away: "Tunisia", date: "2026-06-21T04:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" },
  // June 21
  { home: "Sweden", away: "Japan", date: "2026-06-21T19:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" },
  { home: "Spain", away: "Uruguay", date: "2026-06-21T22:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" },
  { home: "Saudi Arabia", away: "Cape Verde", date: "2026-06-22T01:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" },
  { home: "Belgium", away: "New Zealand", date: "2026-06-22T04:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" },
  // June 22
  { home: "Iran", away: "Egypt", date: "2026-06-22T19:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" },
  { home: "France", away: "Iraq", date: "2026-06-22T22:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" },
  { home: "Norway", away: "Senegal", date: "2026-06-23T01:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" },
  { home: "Argentina", away: "Jordan", date: "2026-06-23T04:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" },
  // June 23
  { home: "Austria", away: "Algeria", date: "2026-06-23T19:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" },
  { home: "England", away: "Cameroon", date: "2026-06-23T22:00:00.000Z", homeGoals: null, awayGoals: null, status: "NS" }
];

const mockResponse = matches.map((m, index) => {
  return {
    fixture: {
      id: 100001 + index,
      date: m.date,
      timestamp: Math.floor(new Date(m.date).getTime() / 1000),
      status: {
        long: m.status === "FT" ? "Match Finished" : "Not Started",
        short: m.status
      }
    },
    teams: {
      home: {
        name: m.home,
        logo: `https://media.api-sports.io/football/teams/${index + 1}.png`
      },
      away: {
        name: m.away,
        logo: `https://media.api-sports.io/football/teams/${index + 100}.png`
      }
    },
    goals: {
      home: m.homeGoals,
      away: m.awayGoals
    },
    score: {
      fulltime: {
        home: m.homeGoals,
        away: m.awayGoals
      }
    }
  };
});

const outputDir = path.join(__dirname, '..', 'Data');
if (!fs.existsSync(outputDir)){
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(
  path.join(outputDir, 'initial_games.json'),
  JSON.stringify(mockResponse, null, 2),
  'utf8'
);

console.log('Successfully generated initial_games.json with ' + mockResponse.length + ' matches.');
