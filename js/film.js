// =============================================
// PIRATE STUDIO 21 - DATABASE FILM
// =============================================
// Cara menambah film:
// 1. Copy template di bawah
// 2. Paste ke dalam array FILMS_DB
// 3. Isi data sesuai koleksimu
// 4. Save & refresh browser
// =============================================

const FILMS_DB = [
  // ===========================================
  // TEMPLATE (copy-paste ini untuk film baru):
  // ===========================================
  // {
  //   id: "id-unik",              // wajib: ID unik (tanpa spasi)
  //   title: "Judul Film",        // wajib
  //   slug: "judul-film-tahun",   // wajib: untuk URL
  //   type: "movie",              // "movie" atau "series"
  //   featured: false,            // true = tampil di hero
  //   popular: false,             // true = tampil di "Populer"
  //   year: 2024,                 // tahun rilis
  //   genre: ["action", "drama"], // array genre
  //   rating: 8.5,                // 1-10
  //   duration: "120 min",        // atau "2 seasons"
  //   director: "Nama Sutradara",
  //   cast: ["Aktor 1", "Aktor 2"],
  //   poster: "URL_POSTER",       // ukuran w500 dari TMDB
  //   backdrop: "URL_BACKDROP",   // ukuran original dari TMDB
  //   synopsis: "Sinopsis film...",
  //   embed_doodstream: "",       // embed URL Doodstream
  //   embed_mixdrop: "",          // embed URL Mixdrop
  //   download_doodstream: "",    // direct download URL
  //   download_mixdrop: "",       // direct download URL
  //   trailer: ""                 // YouTube embed URL
  // },
  // ===========================================

  // CONTOH FILM (bisa kamu hapus/edit):
  {
    id: "contoh-1",
    title: "Contoh Film Action",
    slug: "contoh-film-action-2024",
    type: "movie",
    featured: true,
    popular: true,
    year: 2024,
    genre: ["action", "thriller"],
    rating: 8.5,
    duration: "120 min",
    director: "John Doe",
    cast: ["Actor One", "Actor Two"],
    poster: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/tmU7GeKVybMWFButWEGl2M4GeiP.jpg",
    synopsis: "Ini adalah contoh sinopsis film yang bisa kamu ganti dengan film koleksimu sendiri.",
    embed_doodstream: "",
    embed_mixdrop: "",
    download_doodstream: "",
    download_mixdrop: "",
    trailer: ""
  }
];

// =============================================
// HELPER FUNCTIONS (jangan diedit)
// =============================================
function getFeatured() {
  return FILMS_DB.find(f => f.featured) || FILMS_DB[0] || null;
}

function getPopular(limit = 6) {
  return FILMS_DB.filter(f => f.popular).slice(0, limit);
}

function getLatest(limit = 9) {
  return [...FILMS_DB]
    .sort((a, b) => b.year - a.year)
    .slice(0, limit);
}

function getBySlug(slug) {
  return FILMS_DB.find(f => f.slug === slug);
}

function getById(id) {
  return FILMS_DB.find(f => f.id === id);
}

function getByGenre(genre) {
  if (!genre || genre === 'all') return [...FILMS_DB];
  return FILMS_DB.filter(f =>
    f.genre.map(g => g.toLowerCase()).includes(genre.toLowerCase())
  );
}

function searchFilms(query) {
  const q = query.toLowerCase().trim();
  if (!q) return [...FILMS_DB];
  return FILMS_DB.filter(f =>
    f.title.toLowerCase().includes(q) ||
    f.year.toString().includes(q) ||
    f.director.toLowerCase().includes(q) ||
    f.genre.some(g => g.toLowerCase().includes(q)) ||
    f.cast.some(c => c.toLowerCase().includes(q))
  );
}

function getAllGenres() {
  const genres = new Set();
  FILMS_DB.forEach(f => f.genre.forEach(g => genres.add(g)));
  return [...genres].sort();
}