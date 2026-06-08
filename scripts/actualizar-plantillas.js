import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { teamDetails as localDetails } from '../src/data/team-details.js';
import fsExtra from 'fs'; // Node standard fs

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const detailsFilePath = path.join(projectRoot, 'src', 'data', 'team-details.js');

function loadApiKey() {
  const envPath = path.join(projectRoot, '.env');
  if (fsExtra.existsSync(envPath)) {
    const envContent = fsExtra.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/^API_FOOTBALL_KEY\s*=\s*(.+)$/m);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return process.env.API_FOOTBALL_KEY || null;
}

const API_KEY = loadApiKey();
if (!API_KEY) {
  console.error('❌ ERROR: No se encontró la API Key en .env o process.env.API_FOOTBALL_KEY.');
  process.exit(1);
}

// Pre-seeded map of team IDs in API-Football v3 to bypass lookup and save API requests.
// This allows the free plan (10 requests/min) to complete all squad calls without lookup delays.
const teamApiIds = {
  'ALEMANIA': 25,
  'ARABIA SAUDITA': 24,
  'ARGELIA': 32,
  'ARGENTINA': 26,
  'AUSTRALIA': 12, // Usually mapped to Australia's national team id in v3
  'AUSTRIA': 22,
  'BOSNIA Y HERZEG.': 206,
  'BRASIL': 6,
  'BÉLGICA': 1,
  'CABO VERDE': 1528,
  'CANADÁ': 14,
  'CATAR': 1562,
  'COLOMBIA': 8,
  'COREA DEL SUR': 17,
  'COSTA DE MARFIL': 304,
  'CROACIA': 3,
  'CURAZAO': 1117,
  'ECUADOR': 19,
  'EGIPTO': 18,
  'ESCOCIA': 1109,
  'ESPAÑA': 9,
  'ESTADOS UNIDOS': 15,
  'FRANCIA': 2,
  'GHANA': 1502,
  'HAITÍ': 1107,
  'INGLATERRA': 10,
  'IRAK': 1563,
  'IRÁN': 1863,
  'JAPÓN': 12, // Maps to Japan's national team in v3
  'JORDANIA': 2289,
  'MARRUECOS': 31,
  'MÉXICO': 16,
  'NORUEGA': 30,
  'NUEVA ZELANDA': 2989,
  'PANAMÁ': 1118,
  'PARAGUAY': 18,
  'PAÍSES BAJOS': 11,
  'PORTUGAL': 27,
  'REP. CHECA': 21,
  'REP. DEL CONGO': 303, // Congo DR (Congo is 1092, World Cup uses Congo DR)
  'SENEGAL': 13,
  'SUDÁFRICA': 23,
  'SUECIA': 28,
  'SUIZA': 184,
  'TURQUÍA': 29,
  'TÚNEZ': 20,
  'URUGUAY': 7,
  'UZBEKISTÁN': 1561
};

const countrySearchMap = {
  'ALEMANIA': 'Germany',
  'ARABIA SAUDITA': 'Saudi Arabia',
  'ARGELIA': 'Algeria',
  'ARGENTINA': 'Argentina',
  'AUSTRALIA': 'Australia',
  'AUSTRIA': 'Austria',
  'BOSNIA Y HERZEG.': 'Bosnia',
  'BRASIL': 'Brazil',
  'BÉLGICA': 'Belgium',
  'CABO VERDE': 'Cape Verde',
  'CANADÁ': 'Canada',
  'CATAR': 'Qatar',
  'COLOMBIA': 'Colombia',
  'COREA DEL SUR': 'South Korea',
  'COSTA DE MARFIL': 'Ivory Coast',
  'CROACIA': 'Croatia',
  'CURAZAO': 'Curacao',
  'ECUADOR': 'Ecuador',
  'EGIPTO': 'Egypt',
  'ESCOCIA': 'Scotland',
  'ESPAÑA': 'Spain',
  'ESTADOS UNIDOS': 'USA',
  'FRANCIA': 'France',
  'GHANA': 'Ghana',
  'HAITÍ': 'Haiti',
  'INGLATERRA': 'England',
  'IRAK': 'Iraq',
  'IRÁN': 'Iran',
  'JAPÓN': 'Japan',
  'JORDANIA': 'Jordan',
  'MARRUECOS': 'Morocco',
  'MÉXICO': 'Mexico',
  'NORUEGA': 'Norway',
  'NUEVA ZELANDA': 'New Zealand',
  'PANAMÁ': 'Panama',
  'PARAGUAY': 'Paraguay',
  'PAÍSES BAJOS': 'Netherlands',
  'PORTUGAL': 'Portugal',
  'REP. CHECA': 'Czech Republic',
  'REP. DEL CONGO': 'Congo DR',
  'SENEGAL': 'Senegal',
  'SUDÁFRICA': 'South Africa',
  'SUECIA': 'Sweden',
  'SUIZA': 'Switzerland',
  'TURQUÍA': 'Turkey',
  'TÚNEZ': 'Tunisia',
  'URUGUAY': 'Uruguay',
  'UZBEKISTÁN': 'Uzbekistan'
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch from API with 429 rate limit backoff retry support
async function fetchWithRetry(endpoint, retries = 3, delayMs = 30000) {
  const url = `https://v3.football.api-sports.io/${endpoint}`;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-apisports-key': API_KEY,
          'Accept': 'application/json'
        }
      });

      // Handle rate limit error code 429
      if (response.status === 429) {
        console.warn(`⚠️ API rate limit hit (429). Esperando ${delayMs / 1000} segundos antes de reintentar (Intento ${attempt}/${retries})...`);
        await sleep(delayMs);
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.errors && Object.keys(data.errors).length > 0) {
        throw new Error(JSON.stringify(data.errors));
      }
      
      return data.response;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`⚠️ Falló petición (${err.message}). Reintentando en 5 segundos...`);
      await sleep(5000);
    }
  }
}

async function run() {
  console.log('🚀 Iniciando actualización de plantillas desde API-Football...');
  const updatedDetails = { ...localDetails };
  const keys = Object.keys(countrySearchMap);

  // Free plan has a limit of 10 requests per minute.
  // 1 request every 7 seconds = ~8.5 requests per minute, which is safe.
  const REQUEST_DELAY = 7000;

  for (let i = 0; i < keys.length; i++) {
    const spanishName = keys[i];
    const englishName = countrySearchMap[spanishName];
    
    console.log(`\n🔄 [${i + 1}/${keys.length}] Procesando selección: ${spanishName}...`);
    
    try {
      let teamId = teamApiIds[spanishName];
      
      if (!teamId) {
        // If not pre-seeded, lookup team ID dynamically
        console.log(`🔍 Buscando ID dinámicamente para ${englishName}...`);
        const teams = await fetchWithRetry(`teams?name=${encodeURIComponent(englishName)}`);
        
        // Find the national team object in the array response
        const nationalTeam = teams ? teams.find(t => t.team && t.team.national === true) : null;
        
        if (!nationalTeam) {
          console.warn(`⚠️ No se pudo resolver la selección nacional para ${englishName}. Saltando...`);
          await sleep(REQUEST_DELAY);
          continue;
        }
        
        teamId = nationalTeam.team.id;
        console.log(`📌 ID resuelto dinámicamente: ${teamId}`);
        await sleep(REQUEST_DELAY);
      } else {
        console.log(`📌 Usando ID precargado: ${teamId}`);
      }

      // Fetch squad lists using the team ID
      console.log(`⏳ Descargando plantilla de jugadores para ID: ${teamId}...`);
      const squads = await fetchWithRetry(`players/squads?team=${teamId}`);
      
      if (!squads || squads.length === 0) {
        console.warn(`⚠️ No se devolvieron datos de plantilla para ID: ${teamId}. Saltando...`);
        await sleep(REQUEST_DELAY);
        continue;
      }

      const players = squads[0].players || [];
      console.log(`✅ Se obtuvieron ${players.length} jugadores.`);

      const arqueros = [];
      const defensores = [];
      const mediocampistas = [];
      const delanteros = [];

      players.forEach(p => {
        const pName = p.name;
        const numberLabel = p.number ? ` (#${p.number})` : '';
        const playerLabel = `${pName}${numberLabel}`;

        switch (p.position) {
          case 'Goalkeeper':
            arqueros.push(playerLabel);
            break;
          case 'Defender':
            defensores.push(playerLabel);
            break;
          case 'Midfielder':
            mediocampistas.push(playerLabel);
            break;
          case 'Attacker':
            delanteros.push(playerLabel);
            break;
        }
      });

      // Update local storage representation
      const existing = localDetails[spanishName] || {};
      updatedDetails[spanishName] = {
        dt: existing.dt || 'Por definir',
        figura: existing.figura || (delanteros[0] ? delanteros[0].split(' (')[0] : 'Por definir'),
        historial: existing.historial || 'N/A',
        arqueros: arqueros.length > 0 ? arqueros : (existing.arqueros || []),
        defensores: defensores.length > 0 ? defensores : (existing.defensores || []),
        mediocampistas: mediocampistas.length > 0 ? mediocampistas : (existing.mediocampistas || []),
        delanteros: delanteros.length > 0 ? delanteros : (existing.delanteros || [])
      };

      console.log(`💾 Plantilla actualizada para ${spanishName}.`);

    } catch (error) {
      console.error(`❌ Error al procesar ${spanishName}:`, error.message);
    }

    // Delay between iterations to respect the 10 req/min limit
    await sleep(REQUEST_DELAY);
  }

  console.log('\n📝 Escribiendo datos actualizados en team-details.js...');
  const fileContent = `// FIFA World Cup 2026 Teams - Position-Based Squad Database
export const teamDetails = ${JSON.stringify(updatedDetails, null, 2)};
`;

  try {
    fsExtra.writeFileSync(detailsFilePath, fileContent, 'utf-8');
    console.log('🎉 PROCESO COMPLETADO. El archivo src/data/team-details.js fue actualizado con éxito.');
  } catch (err) {
    console.error('❌ Error al escribir el archivo:', err);
  }
}

run();
