// Сбор мемов из публичных Telegram-каналов в Supabase (bucket «memes» + таблица public.memes).
// Источник данных — публичный HTML t.me/s/<channel> (без аккаунта и без Bot API).
// Дедуп по memes.source_post_id формата "<channel>/<post_id>".
//
// Запуск:  npm run collect                 (все каналы, дефолтные лимиты)
//          node --env-file=.env scripts/collect-memes.mjs --channels=boyanu --pages=1 --limit=5
//          ... --dry                        (ничего не пишем, только отчёт)
import { createClient } from '@supabase/supabase-js';

const URL_ = process.env.MEMMATCH_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const KEY = process.env.MEMMATCH_SUPABASE_SERVICE_KEY;
if (!URL_ || !KEY) {
  console.error('Нужны MEMMATCH_SUPABASE_URL и MEMMATCH_SUPABASE_SERVICE_KEY (см. .env)');
  process.exit(1);
}
const db = createClient(URL_, KEY, { auth: { persistSession: false } });

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36';

const argv = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v === undefined ? true : v];
  })
);

const DRY = !!argv.dry;
const BUCKET = 'memes';
const STATUS = String(argv.status || 'approved'); // approved | seed | pending
const DEFAULT_PAGES = Number(argv.pages || 20); // 20 постов на страницу
const DEFAULT_LIMIT = Number(argv.limit || 500); // предохранитель на канал

// Категории — по именам из public.categories
const CHANNELS = [
  { username: 'boyanu', category: 'Классика/бояны', title: 'Бояны и классика' },
  { username: 'cats_cats', category: 'Коты', title: 'Коты' },
  { username: 'pu1_tg', category: 'Мемы', title: 'пик4á' },
  { username: 'lup_tg', category: 'Путешествия', title: 'Лига нишевых путешествий' },
];

const only = argv.channels ? String(argv.channels).split(',') : null;
const targets = CHANNELS.filter((c) => !only || only.includes(c.username));

// ─── утилиты ──────────────────────────────────────────────────────────────────
function decodeEntities(s) {
  let out = s || '';
  for (let i = 0; i < 5; i++) {
    const next = out
      .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&');
    if (next === out) break;
    out = next;
  }
  return out;
}

async function fetchPage(username, before) {
  const url = before ? `https://t.me/s/${username}?before=${before}` : `https://t.me/s/${username}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ru,en' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} для ${url}`);
  return res.text();
}

/** Посты страницы: id, дата, подпись, фото (только фото-посты, видео пропускаем). */
function parsePosts(html) {
  const blocks = html.split('<div class="tgme_widget_message_wrap').slice(1);
  return blocks.map((block) => {
    const pid = block.match(/data-post="([^"]+)"/)?.[1] || null;
    const dt = block.match(/datetime="([^"]+)"/)?.[1] || null;
    const rawText = block.match(/class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1] || '';
    const caption = decodeEntities(
      rawText
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/[ \t]+/g, ' ')
        .trim()
    );
    const isPhoto = /tgme_widget_message_photo_wrap/.test(block);
    const isVideo = /tgme_widget_message_video/.test(block) || /tgme_widget_message_roundvideo/.test(block);
    const photoCandidates = [...block.matchAll(/background-image:\s*url\(['"]?([^'")]+)['"]?\)/g)]
      .map((m) => (m[1].startsWith('//') ? `https:${m[1]}` : m[1]))
      .filter((u) => /^https:\/\/cdn\d*\.(telesco\.pe|cdn-telegram\.org)\//.test(u));
    return { pid, dt, caption, isPhoto, isVideo, photo: photoCandidates[0] || null };
  });
}

async function existingIds(username) {
  const { data, error } = await db
    .from('memes')
    .select('source_post_id')
    .like('source_post_id', `${username}/%`);
  if (error) throw error;
  return new Set((data || []).map((r) => r.source_post_id));
}

async function download(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Referer: 'https://t.me/' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} на картинке`);
  const type = res.headers.get('content-type') || 'image/jpeg';
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('gif') ? 'gif' : 'jpg';
  const buf = Buffer.from(await res.arrayBuffer());
  return { buf, type, ext };
}

async function upload(username, postId, img) {
  const path = `${username}/${postId}.${img.ext}`;
  const up = await db.storage.from(BUCKET).upload(path, img.buf, { contentType: img.type, upsert: true });
  if (up.error) throw new Error(`storage: ${up.error.message}`);
  const { data } = db.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// ─── основной цикл ────────────────────────────────────────────────────────────
async function main() {
  const { data: cats, error: catErr } = await db.from('categories').select('id, name');
  if (catErr) throw catErr;
  const catId = Object.fromEntries((cats || []).map((c) => [c.name, c.id]));

  const report = [];
  for (const ch of targets) {
    const category_id = catId[ch.category] ?? null;
    if (category_id === null) console.warn(`! категория «${ch.category}» не найдена — ${ch.username} без категории`);
    const seen = await existingIds(ch.username);
    console.log(`\n=== ${ch.username} (${ch.title}) — в базе уже ${seen.size}`);

    let added = 0;
    let skippedNoPhoto = 0;
    let before = null;
    const limit = Number(argv.limit || DEFAULT_LIMIT);
    const pages = Number(argv.pages || DEFAULT_PAGES);

    for (let page = 1; page <= pages && added < limit; page++) {
      let html;
      try {
        html = await fetchPage(ch.username, before);
      } catch (e) {
        console.error(`  ${e.message}`);
        break;
      }
      const posts = parsePosts(html);
      if (!posts.length) break;
      const firstPid = posts.find((p) => p.pid)?.pid?.split('/').pop() || null;
      if (!firstPid || firstPid === before) break; // страница не сдвинулась — конец канала
      before = firstPid;

      for (const post of posts) {
        if (added >= limit) break;
        if (!post.pid || !post.photo) continue;
        if (seen.has(post.pid)) continue;
        // видео-пост со статичной обложкой не берём: в приложении пока только картинки
        if (post.isVideo && !post.isPhoto) {
          skippedNoPhoto++;
          continue;
        }
        const shortId = post.pid.split('/').pop();
        try {
          const img = await download(post.photo);
          const image_url = DRY ? post.photo : await upload(ch.username, shortId, img);
          if (!DRY) {
            const { error } = await db.from('memes').upsert(
              {
                image_url,
                source_name: ch.username,
                source_post_id: post.pid,
                category_id,
                original_caption: post.caption ? post.caption.slice(0, 1000) : null,
                published_at: post.dt || null,
                status: STATUS,
              },
              { onConflict: 'source_post_id', ignoreDuplicates: true }
            );
            if (error) throw new Error(`db: ${error.message}`);
          }
          seen.add(post.pid);
          added++;
          console.log(`  + ${post.pid} (${Math.round(img.buf.length / 1024)} КБ) ${post.caption.slice(0, 50).replace(/\s+/g, ' ')}`);
          await new Promise((r) => setTimeout(r, 300)); // не долбим t.me и Telegram CDN
        } catch (e) {
          console.error(`  ! ${post.pid}: ${e.message}`);
        }
      }
      console.log(`  страница ${page}: добавлено ${added}, пропущено видео/без фото ${skippedNoPhoto}`);
    }
    report.push({ channel: ch.username, added, already: seen.size - added, skippedNoPhoto });
  }

  console.log('\n=== ИТОГО');
  for (const r of report) console.log(`${r.channel}: +${r.added} (было ${r.already}), пропущено видео ${r.skippedNoPhoto}`);
  const { count } = await db.from('memes').select('id', { count: 'exact', head: true });
  console.log(`В базе мемов: ${count}`);
}

main().catch((e) => {
  console.error('Критическая ошибка:', e.message);
  process.exit(1);
});
