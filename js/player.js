// =============================================
// PIRATE STUDIO 21 - PLAYER SCRIPT
// =============================================

var currentFilm = null;
var currentServer = 'embed_url';
var episodeList = [];
var currentEpisodeId = null;

// ─── Init ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    initNavbarScroll();
    initLiveSearch();
    loadPlayer();
});

// ─── Navbar Scroll ────────────────────────────
function initNavbarScroll() {
    var navbar = document.getElementById('navbar');
    if (!navbar) return;
    window.addEventListener('scroll', function() {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
}

// ─── Live Search ──────────────────────────────
function initLiveSearch() {
    var searchInput = document.getElementById('nav-search');
    var dropdown = document.getElementById('search-dropdown');
    if (!searchInput || !dropdown) return;

    var debounceTimer;
    var activeIndex = -1;

    searchInput.addEventListener('focus', function() {
        if (this.value.trim().length >= 2) performSearch(this.value.trim());
    });

    searchInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        var query = this.value.trim();
        activeIndex = -1;
        if (query.length < 2) { dropdown.classList.remove('show'); return; }
        debounceTimer = setTimeout(function() { performSearch(query); }, 300);
    });

    searchInput.addEventListener('keydown', function(e) {
        var items = dropdown.querySelectorAll('.search-item');
        if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = Math.min(activeIndex + 1, items.length - 1); updateActiveItem(items); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = Math.max(activeIndex - 1, 0); updateActiveItem(items); }
        else if (e.key === 'Enter') {
            if (activeIndex >= 0 && items[activeIndex]) { e.preventDefault(); items[activeIndex].click(); }
            else { var q = this.value.trim(); if (q) window.location.href = 'search.html?q=' + encodeURIComponent(q); }
        }
        else if (e.key === 'Escape') { dropdown.classList.remove('show'); activeIndex = -1; this.blur(); }
    });

    function updateActiveItem(items) {
        for (var i = 0; i < items.length; i++) items[i].classList.remove('search-item-active');
        if (items[activeIndex]) { items[activeIndex].classList.add('search-item-active'); items[activeIndex].scrollIntoView({ block: 'nearest' }); }
    }

    document.addEventListener('click', function(e) {
        var sw = document.getElementById('search-wrap');
        if (sw && !sw.contains(e.target)) { dropdown.classList.remove('show'); activeIndex = -1; }
    });

    function performSearch(query) {
        dropdown.innerHTML = '<div class="search-dropdown-loading">' + icon('search', '16') + ' Mencari...</div>';
        dropdown.classList.add('show');
        API.search(query).then(function(res) {
            if (res.status !== 'success' || !res.data || res.data.length === 0) {
                dropdown.innerHTML = '<div class="search-dropdown-empty">' + icon('search', '20') + '<p>Tidak ditemukan</p></div>';
                return;
            }
            var results = res.data.slice(0, 8);
            var html = '';
            for (var i = 0; i < results.length; i++) {
                var film = results[i];
                var title = film.title.replace(new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<span class="search-highlight">$1</span>');
                html += '<div class="search-item" onclick="window.location.href=\'play.html?id=' + encodeURIComponent(film.id) + '\'">';
                if (film.poster) html += '<img src="' + film.poster + '" class="search-item-poster" loading="lazy" onerror="this.style.display=\'none\'">';
                else html += '<div class="search-item-poster" style="display:flex;align-items:center;justify-content:center;background:#1a1a24;">' + icon('film', '16') + '</div>';
                html += '<div class="search-item-info"><div class="search-item-title">' + title + '</div><div class="search-item-meta"><span>' + (film.year || '—') + '</span><span class="search-item-type">' + (film.type || 'movie') + '</span>';
                if (film.rating) html += '<span class="search-item-rating">' + icon('star', '10') + ' ' + film.rating + '</span>';
                html += '</div></div></div>';
            }
            if (res.data.length > 8) html += '<div class="search-item search-item-more" onclick="window.location.href=\'search.html?q=' + encodeURIComponent(query) + '\'">Lihat semua (' + res.data.length + ') ' + icon('arrow-right', '14') + '</div>';
            dropdown.innerHTML = html;
        }).catch(function() {
            dropdown.innerHTML = '<div class="search-dropdown-empty">' + icon('alert', '20') + '<p>Gagal mencari</p></div>';
        });
    }
}

// ─── Load Player ──────────────────────────────
async function loadPlayer() {
    var filmId = UTILS.getParam('id');
    var main = document.getElementById('player-content');
    if (!main) return;

    if (!filmId) {
        main.innerHTML = renderNotFound('ID film tidak ditemukan');
        return;
    }

    try {
        var res = await API.getById(filmId);
        if (res.status !== 'success' || !res.data) {
            main.innerHTML = renderNotFound('Film tidak ditemukan');
            return;
        }

        currentFilm = res.data;
        currentEpisodeId = currentFilm.id;

        // Cek apakah ini series
        if (currentFilm.type === 'series' || isSeriesId(currentFilm.id)) {
            var seriesId = extractSeriesId(currentFilm.id);
            // Ambil semua episode
            var allRes = await API.getAll();
            if (allRes.status === 'success') {
                episodeList = allRes.data.filter(function(f) {
                    return (f.type === 'series' || isSeriesId(f.id)) && extractSeriesId(f.id) === seriesId;
                }).sort(function(a, b) {
                    return extractEpisodeNum(a.id) - extractEpisodeNum(b.id);
                });
            }
        }

        renderPlayer();
        loadDisqus();

    } catch (error) {
        console.error('Error:', error);
        main.innerHTML = renderNotFound('Gagal memuat film');
    }
}

// ─── Render Player ────────────────────────────
function renderPlayer() {
    var main = document.getElementById('player-content');
    if (!main || !currentFilm) return;

    var html = '<div class="player-container">';

    // Back button
    html += '<div class="container" style="max-width:900px;padding-top:16px;">';
    html += '<a href="/" class="back-btn">' + icon('arrow-left', '14') + ' Kembali ke Home</a>';
    html += '</div>';

    // Player
    html += '<div class="player-wrapper">';
    html += '<div class="player-aspect" id="player-frame">';
    
    var embedUrl = currentFilm.embed_url || currentFilm.mirror_url || '';
    if (embedUrl) {
        html += '<iframe src="' + embedUrl + '" id="player-iframe" allowfullscreen allow="autoplay; fullscreen; picture-in-picture; encrypted-media" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation" scrolling="no" frameborder="0"></iframe>';
    } else {
        html += '<div class="player-loading">' + icon('play-outline', '48') + '<span>Embed URL belum tersedia</span></div>';
    }
    
    html += '</div></div>';

    // Server selector (jika ada mirror)
    if (currentFilm.embed_url && currentFilm.mirror_url) {
        html += '<div class="server-bar">';
        html += '<span class="server-label">' + icon('tv', '14') + ' Server:</span>';
        html += '<button class="server-btn active" onclick="switchServer(\'embed_url\')">Server 1</button>';
        html += '<button class="server-btn" onclick="switchServer(\'mirror_url\')">Server 2</button>';
        html += '</div>';
    }

    html += '<div class="container" style="max-width:900px;">';

    // Episode list (untuk series)
    if (episodeList.length > 1) {
        html += '<div class="episode-section">';
        html += '<div class="episode-title">' + icon('film', '16') + ' Daftar Episode</div>';
        html += '<div class="episode-scroll">';
        for (var i = 0; i < episodeList.length; i++) {
            var ep = episodeList[i];
            var epNum = extractEpisodeNum(ep.id);
            var isActive = ep.id === currentEpisodeId;
            html += '<button class="episode-btn' + (isActive ? ' active' : '') + '" onclick="changeEpisode(\'' + ep.id + '\')">' + (epNum || 'Ep') + '</button>';
        }
        html += '</div></div>';
    }

    // Info section
    html += '<div class="info-section">';
    html += '<div class="info-grid">';
    
    // Poster
    html += '<img src="' + (currentFilm.poster || '') + '" alt="' + currentFilm.title + '" class="info-poster" onerror="this.style.background=\'#1a1a24\';this.style.objectFit=\'contain\';">';
    
    // Details
    html += '<div class="info-details">';
    html += '<h1 class="info-title">' + currentFilm.title + '</h1>';
    
    html += '<div class="info-meta">';
    html += '<span class="info-year">' + (currentFilm.year || '—') + '</span>';
    if (currentFilm.rating) {
        html += '<span class="info-rating">' + icon('star', '12') + ' ' + currentFilm.rating + '</span>';
    }
    if (currentFilm.duration) {
        html += '<span class="info-duration">' + icon('clock', '12') + ' ' + currentFilm.duration + '</span>';
    }
    html += '</div>';
    
    // Genres
    var genres = UTILS.parseGenres(currentFilm.genre);
    if (genres.length > 0) {
        html += '<div class="info-genres">';
        for (var g = 0; g < genres.length; g++) {
            html += '<span class="info-genre-tag">' + genres[g] + '</span>';
        }
        html += '</div>';
    }
    
    html += '</div></div>'; // close info-grid

    // Synopsis
    if (currentFilm.synopsis) {
        html += '<div class="info-synopsis">';
        html += '<div class="info-synopsis-label">Sinopsis</div>';
        html += '<p>' + currentFilm.synopsis + '</p>';
        html += '</div>';
    }

    // More info
    html += '<div class="info-more">';
    if (currentFilm.director) {
        html += '<div class="info-more-item"><span class="info-more-label">Sutradara</span><span class="info-more-value">' + currentFilm.director + '</span></div>';
    }
    if (currentFilm.cast) {
        var cast = UTILS.parseGenres(currentFilm.cast);
        html += '<div class="info-more-item"><span class="info-more-label">Pemeran</span><span class="info-more-value">' + cast.slice(0, 3).join(', ') + '</span></div>';
    }
    html += '<div class="info-more-item"><span class="info-more-label">Tipe</span><span class="info-more-value" style="text-transform:uppercase;">' + (currentFilm.type || 'movie') + '</span></div>';
    html += '</div>';

    // Action buttons
    html += '<div class="action-buttons">';
    if (currentFilm.download_url) {
        html += '<a href="' + currentFilm.download_url + '" target="_blank" class="btn-action btn-action-download">' + icon('download', '16') + ' Download</a>';
    }
    if (currentFilm.subtitle_url) {
        html += '<a href="' + currentFilm.subtitle_url + '" target="_blank" class="btn-action">' + icon('file', '16') + ' Subtitle</a>';
    }
    html += '<button class="btn-action" onclick="copyLink()">' + icon('copy', '16') + ' Salin Link</button>';
    html += '<a href="/" class="btn-action">' + icon('home', '16') + ' Home</a>';
    html += '</div>';

    // Comments
    html += '<div class="comments-section">';
    html += '<div class="comments-title">' + icon('message', '18') + ' Komentar</div>';
    html += '<div id="disqus_thread"></div>';
    html += '</div>';

    html += '</div></div>'; // close container & player-container

    main.innerHTML = html;
}

// ─── Switch Server ────────────────────────────
function switchServer(serverKey) {
    currentServer = serverKey;
    var iframe = document.getElementById('player-iframe');
    var newUrl = currentFilm[serverKey];
    
    if (iframe && newUrl) {
        iframe.src = newUrl;
    }

    // Update active button
    var btns = document.querySelectorAll('.server-btn');
    for (var i = 0; i < btns.length; i++) {
        btns[i].classList.remove('active');
        if ((serverKey === 'embed_url' && i === 0) || (serverKey === 'mirror_url' && i === 1)) {
            btns[i].classList.add('active');
        }
    }
}

// ─── Change Episode ───────────────────────────
function changeEpisode(epId) {
    window.location.href = 'play.html?id=' + epId;
}

// ─── Copy Link ────────────────────────────────
function copyLink() {
    var url = window.location.href;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function() {
            alert('Link berhasil disalin!');
        });
    } else {
        var input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        alert('Link berhasil disalin!');
    }
}

// ─── Load Disqus ──────────────────────────────
function loadDisqus() {
    var d = document, s = d.createElement('script');
    s.src = 'https://' + (CONFIG.DISQUS_SHORTNAME || 'piratesstudio21') + '.disqus.com/embed.js';
    s.setAttribute('data-timestamp', +new Date());
    (d.head || d.body).appendChild(s);
}

// ─── Render Not Found ─────────────────────────
function renderNotFound(msg) {
    return '<div class="player-notfound">' +
        '<div class="player-notfound-icon">' + icon('alert', '64') + '</div>' +
        '<div class="player-notfound-title">Film Tidak Ditemukan</div>' +
        '<p class="player-notfound-msg">' + (msg || 'Film yang Anda cari tidak tersedia.') + '</p>' +
        '<a href="/" class="btn btn-primary">' + icon('home', '16') + ' Kembali ke Home</a>' +
    '</div>';
}

// ─── Helpers ──────────────────────────────────
function isSeriesId(id) {
    return /-\d+$/.test(id);
}

function extractSeriesId(id) {
    if (!id) return '';
    var match = id.match(/^(.+?)-(\d+)$/);
    if (match) {
        var sMatch = match[1].match(/^(.+?-S\d+)$/);
        return sMatch ? sMatch[1] : match[1];
    }
    return id;
}

function extractEpisodeNum(id) {
    if (!id) return 0;
    var parts = id.split('-');
    return parseInt(parts[parts.length - 1]) || 0;
}