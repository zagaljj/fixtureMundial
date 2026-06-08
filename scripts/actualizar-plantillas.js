import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { teamDetails as localDetails } from '../src/data/team-details.js';

// Resolve directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const detailsFilePath = path.join(projectRoot, 'src', 'data', 'team-details.js');

// Load API Key from .env manually to avoid dotenv dependency
function loadApiKey() {
  const envPath = path.join(projectRoot, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/^API_FOOTBALL_KEY\s*=\s*(.+)$/m);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return process.env.API_FOOTBALL_KEY || null;
}

const API_KEY = loadApiKey();
if (!API_KEY) {
  console.error('❌ ERROR: No se encontró la API Key en el archivo .env o en process.env.API_FOOTBALL_KEY.');
  console.log('Crea un archivo .env en la raíz del proyecto con el contenido:');
  console.log('API_FOOTBALL_KEY=tu_api_key_aqui');
  process.exit(1);
}

// Map local Spanish uppercase keys to API-Football English search terms
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

// Sleep utility to respect API-Football rate limits (usually 10-30 requests per minute)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchFromApi(endpoint) {
  const url = `https://v3.football.api-sports.io/${endpoint}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-apisports-key': API_KEY,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(JSON.stringify(data.errors));
  }
  return data.response;
}

async function run() {
  console.log('🚀 Iniciando actualización de plantillas desde API-Football...');
  const updatedDetails = { ...localDetails };
  const keys = Object.keys(countrySearchMap);

  for (let i = 0; i < keys.length; i++) {
    const spanishName = keys[i];
    const englishName = countrySearchMap[spanishName];
    
    console.log(`\n🔄 [${i + 1}/${keys.length}] Buscando ID de selección para: ${spanishName} (${englishName})...`);
    
    try {
      // 1. Get Team ID from country name search
      const teams = await fetchFromApi(`teams?name=${encodeURIComponent(englishName)}&national=true`);
      if (!teams || teams.length === 0) {
        console.warn(`⚠️ No se encontró la selección nacional para ${englishName}. Saltando...`);
        continue;
      }
      
      const teamId = teams[0].team.id;
      console.log(`📌 ID encontrado en API-Football: ${teamId} (${teams[0].team.name})`);
      
      // Delay to respect rate limits
      await sleep(1500);

      // 2. Fetch squad list for team
      console.log(`⏳ Descargando plantilla para ID: ${teamId}...`);
      const squads = await fetchFromApi(`players/squads?team=${teamId}`);
      if (!squads || squads.length === 0) {
        console.warn(`⚠️ No se devolvieron datos de plantilla para ID: ${teamId}. Saltando...`);
        continue;
      }

      const players = squads[0].players || [];
      console.log(`✅ Se obtuvieron ${players.length} jugadores.`);

      // 3. Map players by position group
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

      // Update in our details object, preserving DT and Historial if they already exist
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

      console.log(`💾 Plantilla armada para ${spanishName}: ${arqueros.length} ARQ, ${defensores.length} DEF, ${mediocampistas.length} MED, ${delanteros.length} DEL.`);

    } catch (error) {
      console.error(`❌ Error al actualizar ${spanishName}:`, error.message);
    }

    // Delay between team iterations to avoid rate limit bans
    await sleep(2000);
  }

  // 4. Serialize updatedDetails back to src/data/team-details.js
  console.log('\n📝 Guardando datos actualizados en team-details.js...');
  const fileContent = `// FIFA World Cup 2026 Teams - Position-Based Squad Database
export const teamDetails = ${JSON.stringify(updatedDetails, null, 2)};
`;

  try {
    fs.writeFileSync(detailsFilePath, fileContent, 'utf-8');
    console.log('🎉 PROCESO COMPLETADO. El archivo src/data/team-details.js fue actualizado con éxito.');
  } catch (err) {
    console.error('❌ Error al escribir el archivo:', err);
  }
}

run();
