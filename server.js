// server.js
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;

// konfigurasi
const SOURCE_URL = 'https://www.worldometers.info/'; // kamu bisa target page lain juga
const SCRAPE_INTERVAL_MS = 5000; // frekuensi ambil data (jaga etika) — ubah sesuai kebutuhan (mis 5s atau 15s)

// cache sederhana
let cached = {
  ts: 0,
  metrics: []
};

// fungsi scrapper sederhana — target elemen "maincounter-number" & beberapa counter lain
async function scrapeWorldometers() {
  try {
    const r = await axios.get(SOURCE_URL, { timeout: 15000, headers: { 'User-Agent': 'LiveStatsBot/1.0 (+your-email)' }});
    const $ = cheerio.load(r.data);

    const metrics = [];

    // contoh: ambil main counters di halaman utama (World Population + 2 counters biasanya)
    // worldometers uses "#maincounter-wrap" and ".maincounter-number"
    $('#maincounter-wrap').each((i, el) => {
      const title = $(el).find('h1, h3').first().text().trim() || $(el).find('h1').text().trim();
      const value = $(el).find('.maincounter-number > span').first().text().trim().replace(/[, ]+/g,'');
      if (title && value) {
        metrics.push({
          id: 'main_' + i,
          label: title,
          value: Number(value.replace(/[^0-9.-]/g,'')) || value,
          raw: $(el).find('.maincounter-number > span').first().text().trim()
        });
      }
    });

    // ambil counters lain yg ada class "counter" atau selectors tertentu
    // contoh: beberapa section memiliki counters with class 'counter' or numeric spans — kita coba beberapa selector umum
    // contoh untuk "number of cars produced" etc. (tidak semua page punya struktur sama)
    $('.counter').each((i, el) => {
      const label = $(el).attr('title') || $(el).prev('h2').text().trim() || '';
      const val = $(el).text().trim().replace(/[, ]+/g,'');
      if (val) {
        metrics.push({
          id: 'ctr_' + i,
          label: label || ('counter-'+i),
          value: Number(val.replace(/[^0-9.-]/g,'')) || val,
          raw: $(el).text().trim()
        });
      }
    });

    // fallback: coba cari beberapa panel lain, misal "section" dengan angka
    $('div').each((i, el) => {
      const t = $(el).find('span').first().text().trim();
      if (t && /^[\d,.\s]+$/.test(t) && metrics.length < 40) {
        metrics.push({
          id: 'div_' + i,
          label: $(el).find('h2, h3, strong').first().text().trim() || 'unknown',
          value: Number(t.replace(/[^0-9.-]/g,'')) || t,
          raw: t
        });
      }
    });

    // minimal dedup and limit
    const uniq = {};
    const filtered = [];
    for (const m of metrics) {
      const key = (m.label || m.id).toLowerCase().slice(0,40);
      if (!uniq[key]) { uniq[key] = true; filtered.push(m); }
    }

    cached = { ts: Date.now(), metrics: filtered.slice(0, 40) };
    return cached;
  } catch (err) {
    console.error('Scrape error:', err.message);
    return cached; // return previous cache on error
  }
}

// schedule scraping loop (background)
setInterval(() => {
  scrapeWorldometers().then(() => {
    // nothing else; cache updated
  });
}, SCRAPE_INTERVAL_MS);

// initial scrape
scrapeWorldometers();

// REST endpoint: get current metrics
app.get('/api/metrics', (req, res) => {
  res.json({ ts: cached.ts, metrics: cached.metrics });
});

// SSE endpoint: stream setiap SCRAPE_INTERVAL_MS (push cached)
app.get('/stream', (req, res) => {
  res.set({
    'Cache-Control': 'no-cache',
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive'
  });
  res.flushHeaders();

  // send initial
  res.write(`data: ${JSON.stringify({ ts: cached.ts, metrics: cached.metrics })}\n\n`);

  const id = setInterval(() => {
    res.write(`data: ${JSON.stringify({ ts: cached.ts, metrics: cached.metrics })}\n\n`);
  }, SCRAPE_INTERVAL_MS);

  req.on('close', () => {
    clearInterval(id);
  });
});

// simple health
app.get('/health', (req,res)=>res.send('ok'));

app.listen(PORT, ()=>console.log(`Server running on http://localhost:${PORT}`));
