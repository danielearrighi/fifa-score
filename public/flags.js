// Flag mapping helper for FIFA World Cup 2026
const countryToCode = {
  "mexico": "mx", "messico": "mx",
  "south africa": "za", "sud africa": "za", "sudafrica": "za",
  "south korea": "kr", "corea del sud": "kr",
  "czechia": "cz", "repubblica ceca": "cz",
  "canada": "ca",
  "bosnia and herzegovina": "ba", "bosnia ed erzegovina": "ba", "bosnia": "ba",
  "usa": "us", "stati uniti": "us", "united states": "us",
  "paraguay": "py",
  "qatar": "qa",
  "switzerland": "ch", "svizzera": "ch",
  "brazil": "br", "brasile": "br",
  "morocco": "ma", "marocco": "ma",
  "scotland": "gb-sct", "scozia": "gb-sct",
  "haiti": "ht",
  "australia": "au",
  "türkiye": "tr", "turkey": "tr", "turchia": "tr",
  "germany": "de", "germania": "de",
  "curaçao": "cw", "curacao": "cw",
  "netherlands": "nl", "paesi bassi": "nl", "olanda": "nl",
  "japan": "jp", "giappone": "jp",
  "ivory coast": "ci", "costa d'avorio": "ci",
  "ecuador": "ec",
  "sweden": "se", "svezia": "se",
  "tunisia": "tn",
  "spain": "es", "spagna": "es",
  "cape verde": "cv", "capo verde": "cv",
  "belgium": "be", "belgio": "be",
  "egypt": "eg", "egitto": "eg",
  "saudi arabia": "sa", "arabia saudita": "sa",
  "uruguay": "uy",
  "iran": "ir",
  "new zealand": "nz", "nuova zelanda": "nz",
  "france": "fr", "francia": "fr",
  "senegal": "sn",
  "argentina": "ar",
  "algeria": "dz",
  "norway": "no", "norvegia": "no",
  "iraq": "iq",
  "austria": "at",
  "jordan": "jo", "giordania": "jo",
  "england": "gb-eng", "inghilterra": "gb-eng",
  "croatia": "hr", "croazia": "hr",
  "italy": "it", "italia": "it",
  "cameroon": "cm", "camerun": "cm",
  "colombia": "co",
  "uzbekistan": "uz",
  "denmark": "dk", "danimarca": "dk",
  "angola": "ao",
  "portugal": "pt", "portogallo": "pt",
  "panama": "pa"
};

function getFlagUrl(countryName, fallbackUrl) {
  const normalized = countryName.toLowerCase().trim();
  const code = countryToCode[normalized];
  if (code) {
    return `https://flagcdn.com/w80/${code}.png`;
  }
  return fallbackUrl || 'https://media.api-sports.io/football/teams/0.png';
}
