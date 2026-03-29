/**
 * sync-instagram.mjs (GitHub Actions version)
 * 
 * Descarga los posts de Instagram desde la API de Apify,
 * guarda las imágenes en images/ y genera data/posts.json.
 * 
 * Se ejecuta automáticamente cada 3 horas via GitHub Actions.
 * 
 * Uso local:  APIFY_TOKEN=tu_token node scripts/sync-instagram.mjs
 * Uso en CI:  Se configura APIFY_TOKEN como GitHub Secret
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Token de Apify desde variable de entorno (GitHub Secret)
const APIFY_TOKEN = process.env.APIFY_TOKEN;
if (!APIFY_TOKEN) {
  console.error('❌ Error: La variable de entorno APIFY_TOKEN es requerida.');
  console.error('   Configúrala como GitHub Secret o pásala al ejecutar el script.');
  process.exit(1);
}

const APIFY_DATASET_URL = `https://api.apify.com/v2/acts/shu8hvrXbJbY3Eb9W/runs/last/dataset/items?token=${APIFY_TOKEN}`;
const IMAGES_DIR = path.join(ROOT, 'images');
const DATA_DIR = path.join(ROOT, 'data');
const OUTPUT_JSON = path.join(DATA_DIR, 'posts.json');

async function downloadImage(url, filepath) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filepath, buffer);
    console.log(`  ✅ Descargada: ${path.basename(filepath)} (${(buffer.length / 1024).toFixed(1)} KB)`);
    return true;
  } catch (err) {
    console.error(`  ❌ Error descargando imagen: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('🔄 Sincronizando posts de Instagram desde Apify...\n');

  // 1. Fetch del dataset de Apify
  const response = await fetch(APIFY_DATASET_URL);
  if (!response.ok) {
    console.error('❌ Error obteniendo dataset de Apify:', response.statusText);
    process.exit(1);
  }
  const rawPosts = await response.json();
  console.log(`📦 ${rawPosts.length} posts obtenidos de Apify\n`);

  if (rawPosts.length === 0) {
    console.log('⚠️ No se encontraron posts. Manteniendo datos existentes.');
    return;
  }

  // 2. Crear directorios si no existen
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  // 3. Descargar foto de perfil si hay una disponible y no existe
  const profilePath = path.join(IMAGES_DIR, 'profile.jpg');
  if (rawPosts.length > 0 && rawPosts[0].profilePicUrl) {
    console.log('📷 Descargando foto de perfil...');
    await downloadImage(rawPosts[0].profilePicUrl, profilePath);
  }

  // 4. Procesar cada post
  const posts = [];
  for (const post of rawPosts) {
    if (post.isPinned) {
      console.log(`📌 Omitiendo post anclado: ${post.shortCode}`);
      continue;
    }

    const shortCode = post.shortCode;
    const imgFilename = `${shortCode}.jpg`;
    const imgPath = path.join(IMAGES_DIR, imgFilename);

    console.log(`📸 Procesando: ${shortCode} (${post.type})`);

    // Descargar imagen principal
    const downloaded = await downloadImage(post.displayUrl, imgPath);

    posts.push({
      id: post.id,
      type: post.type,
      shortCode: post.shortCode,
      caption: post.caption || '',
      url: post.url,
      commentsCount: post.commentsCount || 0,
      likesCount: post.likesCount || 0,
      timestamp: post.timestamp,
      ownerUsername: post.ownerUsername,
      ownerFullName: post.ownerFullName || post.ownerUsername,
      // Ruta relativa al repo — la web construirá la URL completa
      localImage: downloaded ? `images/${imgFilename}` : null,
      // URL original de Instagram CDN como fallback
      displayUrl: post.displayUrl,
      videoViewCount: post.videoViewCount || null,
      isPinned: post.isPinned || false,
    });
  }

  // 5. Ordenar por timestamp desc (más nuevo primero) y limitar a 8
  posts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const finalPosts = posts.slice(0, 8);

  // 6. Limpiar imágenes viejas que ya no están en los posts actuales
  const currentFiles = new Set(finalPosts.map(p => `${p.shortCode}.jpg`));
  currentFiles.add('profile.jpg'); // Nunca borrar la foto de perfil
  const existingFiles = fs.readdirSync(IMAGES_DIR).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
  for (const file of existingFiles) {
    if (!currentFiles.has(file)) {
      fs.unlinkSync(path.join(IMAGES_DIR, file));
      console.log(`  🗑️ Eliminada imagen vieja: ${file}`);
    }
  }

  // 7. Guardar JSON
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(finalPosts, null, 2), 'utf-8');
  console.log(`\n✅ Guardado: data/posts.json`);
  console.log(`📊 Total posts sincronizados: ${finalPosts.length}`);
  console.log(`🕐 Timestamp: ${new Date().toISOString()}`);
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
