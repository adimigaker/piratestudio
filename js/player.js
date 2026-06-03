// =============================================
// PIRATE STUDIO 21 - PLAYER SCRIPT
// =============================================

var currentFilm = null;
var currentEpisode = null;
var episodes = [];
var trailerMode = false;

document.addEventListener('DOMContentLoaded', function() {
    initNavbarScroll();
    initLiveSearch();
    loadPlayer();
});

function initNavbarScroll() {
    var navbar = document.getElementById('navbar');
    if (!navbar) return;
    window.addEventListener('scroll', function() {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
}

function initLiveSearch() {
    var searchInput = document.getElementById('nav-search');
    var dropdown = document.getElementById('search-dropdown');
    if (!searchInput || !dropdown) return;
    var debounceTimer;
    var activeIndex = -1;
    searchInput.addEventListener('focus', function() { if (this.value.trim().length >= 2) performSearch(this.value.trim()); });
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

// ── Merge 4 kolom episode terpisah jadi satu array ──
function mergeEpisodes(film) {
    function parseCol(val) {
        if (!val) return [];
        if (typeof val === 'string') {
            try { var p = JSON.parse(val); return Array.isArray(p) ? p : []; }
            catch(e) { return []; }
        }
        return Array.isArray(val) ? val : [];
    }

    var embeds    = parseCol(film.embed_url);
    var downloads = parseCol(film.download_url);
    var mirrors   = parseCol(film.mirror_url);
    var subtitles = parseCol(film.subtitle_url);

    // Kalau embed_url sudah format lama (punya semua field), pakai langsung
    if (embeds.length > 0 && embeds[0].download !== undefined) {
        return embeds;
    }

    // Format baru — merge berdasarkan ep number
    var map = {};

    embeds.forEach(function(e) {
        var n = e.ep;
        if (!map[n]) map[n] = { ep: n, embed: '', download: '', mirror: '', subtitle: '' };
        map[n].embed = e.embed || '';
    });
    downloads.forEach(function(e) {
        var n = e.ep;
        if (!map[n]) map[n] = { ep: n, embed: '', download: '', mirror: '', subtitle: '' };
        map[n].download = e.download || '';
    });
    mirrors.forEach(function(e) {
        var n = e.ep;
        if (!map[n]) map[n] = { ep: n, embed: '', download: '', mirror: '', subtitle: '' };
        map[n].mirror = e.mirror || '';
    });
    subtitles.forEach(function(e) {
        var n = e.ep;
        if (!map[n]) map[n] = { ep: n, embed: '', download: '', mirror: '', subtitle: '' };
        map[n].subtitle = e.subtitle || '';
    });

    // Sort by ep number
    return Object.values(map).sort(function(a, b) { return a.ep - b.ep; });
}

async function loadPlayer() {
    var filmId = UTILS.getParam('id');
    var main = document.getElementById('player-content');
    if (!main) return;
    if (!filmId) { main.innerHTML = renderNotFound('ID film tidak ditemukan'); return; }
    try {
        var res = await API.getById(filmId);
        if (res.status !== 'success' || !res.data) { main.innerHTML = renderNotFound('Film tidak ditemukan'); return; }
        currentFilm = res.data;
        trailerMode = !!(currentFilm.trailer);
        episodes = [];
        currentEpisode = null;
        if (currentFilm.type === 'series') {
            episodes = mergeEpisodes(currentFilm);
            currentEpisode = episodes[0] || null;
        }
        renderPlayer();
        loadDisqus();
    } catch(error) {
        console.error('Error:', error);
        main.innerHTML = renderNotFound('Gagal memuat film');
    }
}

function isDriveUrl(url) {
    return url && url.indexOf('drive.google.com') > -1;
}

function toEmbedUrl(url) {
    if (!url) return '';
    var videoId = null;
    var origin = 'https://piratestudio.vercel.app';
    if (url.indexOf('youtube.com/embed/') > -1 || url.indexOf('youtube-nocookie.com/embed/') > -1) {
        var idMatch = url.match(/embed\/([\w-]+)/);
        if (idMatch) videoId = idMatch[1];
    }
    if (!videoId) {
        var shortMatch = url.match(/youtu\.be\/([\w-]+)/);
        if (shortMatch) videoId = shortMatch[1];
    }
    if (!videoId) {
        var watchMatch = url.match(/[?&]v=([\w-]+)/);
        if (watchMatch) videoId = watchMatch[1];
    }
    if (videoId) {
        return 'https://www.youtube-nocookie.com/embed/' + videoId
            + '?origin=' + encodeURIComponent(origin)
            + '&rel=0&modestbranding=1';
    }
    if (url.indexOf('drive.google.com') > -1) {
        return url.replace('/view', '/preview').replace('/edit', '/preview');
    }
    return url;
}

function renderPlayer() {
    var main = document.getElementById('player-content');
    if (!main || !currentFilm) return;

    var isSeries = currentFilm.type === 'series' && episodes.length > 0;
    var trailerUrl = toEmbedUrl(currentFilm.trailer || '');
    var hasTrailer = !!trailerUrl;

    var embedUrl = '', downloadUrl = '', mirrorUrl = '', subtitleUrl = '';
    if (isSeries && currentEpisode) {
        embedUrl    = currentEpisode.embed    || '';
        downloadUrl = currentEpisode.download || '';
        mirrorUrl   = currentEpisode.mirror   || '';
        subtitleUrl = currentEpisode.subtitle || '';
    } else {
        embedUrl    = typeof currentFilm.embed_url === 'string' ? currentFilm.embed_url : '';
        downloadUrl = currentFilm.download_url || '';
        mirrorUrl   = currentFilm.mirror_url   || '';
        subtitleUrl = currentFilm.subtitle_url || '';
    }

    var activeUrl = (trailerMode && hasTrailer) ? trailerUrl : embedUrl;

    var html = '<div class="player-container">';
    html += '<div class="container" style="max-width:900px;padding-top:4px;">';
    html += '<a href="/" class="back-btn">' + icon('arrow-left', '14') + ' Kembali ke Home</a>';
    html += '</div>';

    html += '<div class="player-wrapper">';
    html += '<div class="player-aspect" id="player-frame">';
    if (activeUrl) {
        var isDrive = isDriveUrl(activeUrl);
        var frameStyle = isDrive ? ' style="padding-bottom:calc(56.25% + 44px);"' : '';
        html = html.replace('<div class="player-aspect" id="player-frame">', '<div class="player-aspect" id="player-frame"' + frameStyle + '>');
        html += '<iframe src="' + activeUrl + '" id="player-iframe" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" frameborder="0"></iframe>';
    } else {
        html += '<div class="player-loading">' + icon('play', '48') + '<span>Embed URL belum tersedia</span></div>';
    }
    html += '</div></div>';

    html += '<div class="server-bar" id="tab-bar" style="flex-wrap:wrap;gap:6px;">';
    html += '<span class="server-label">' + icon('tv', '14') + '</span>';
    if (hasTrailer) {
        html += '<button class="server-btn' + (trailerMode ? ' active' : '') + '" onclick="switchTab(\'trailer\')">'
            + icon('play', '12') + ' Trailer</button>';
    }
    if (isSeries) {
        for (var i = 0; i < episodes.length; i++) {
            var isEpActive = !trailerMode && currentEpisode && episodes[i].ep === currentEpisode.ep;
            html += '<button class="server-btn' + (isEpActive ? ' active' : '') + '" onclick="changeEpisode(' + i + ')">Ep ' + episodes[i].ep + '</button>';
        }
    } else {
        if (embedUrl) {
            html += '<button class="server-btn' + (!trailerMode ? ' active' : '') + '" onclick="switchTab(\'film\')">'
                + icon('film', '12') + ' Full Film</button>';
        }
        if (mirrorUrl) {
            html += '<button class="server-btn" onclick="switchTab(\'mirror\')">Mirror</button>';
        }
    }
    html += '</div>';

    html += '<div class="container" style="max-width:900px;">';
    html += '<div class="info-section"><div class="info-grid">';
    html += '<img src="' + (currentFilm.poster || '') + '" alt="' + currentFilm.title + '" class="info-poster" onerror="this.style.background=\'#1a1a24\';">';
    html += '<div class="info-details">';
    html += '<h1 class="info-title">' + currentFilm.title;
    if (isSeries && currentEpisode && !trailerMode) html += ' <span style="color:#e50914;font-size:0.6em;">EP ' + currentEpisode.ep + '</span>';
    html += '</h1>';
    html += '<div class="info-meta">';
    html += '<span class="info-year">' + (currentFilm.year || '—') + '</span>';
    if (currentFilm.rating) html += '<span class="info-rating">' + icon('star', '12') + ' ' + currentFilm.rating + '</span>';
    if (currentFilm.duration) html += '<span class="info-duration">' + icon('clock', '12') + ' ' + currentFilm.duration + '</span>';
    html += '</div>';
    var genres = UTILS.parseGenres(currentFilm.genre);
    if (genres.length > 0) {
        html += '<div class="info-genres">';
        for (var g = 0; g < genres.length; g++) html += '<span class="info-genre-tag">' + genres[g] + '</span>';
        html += '</div>';
    }
    html += '</div></div>';
    if (currentFilm.synopsis) html += '<div class="info-synopsis"><div class="info-synopsis-label">Sinopsis</div><p>' + currentFilm.synopsis + '</p></div>';
    html += '<div class="info-more">';
    if (currentFilm.director) html += '<div class="info-more-item"><span class="info-more-label">Sutradara</span><span class="info-more-value">' + currentFilm.director + '</span></div>';
    if (currentFilm.cast) {
        var cast = UTILS.parseGenres(currentFilm.cast);
        html += '<div class="info-more-item"><span class="info-more-label">Pemeran</span><span class="info-more-value">' + cast.slice(0, 3).join(', ') + '</span></div>';
    }
    html += '<div class="info-more-item"><span class="info-more-label">Tipe</span><span class="info-more-value" style="text-transform:uppercase;">' + (currentFilm.type || 'movie') + '</span></div>';
    html += '</div>';
    html += '<div class="action-buttons">';
    if (downloadUrl) html += '<a href="' + downloadUrl + '" target="_blank" class="btn-action btn-action-download">' + icon('download', '16') + ' Download</a>';
    if (subtitleUrl) html += '<a href="' + subtitleUrl + '" target="_blank" class="btn-action btn-action-subtitle">' + icon('file', '16') + ' Subtitle</a>';
    html += '<button class="btn-action" onclick="copyLink()">' + icon('copy', '16') + ' Salin Link</button>';
    html += '</div>';
    html += '<div class="comments-section"><div class="comments-title">' + icon('message', '18') + ' Komentar</div><div id="disqus_thread"></div></div>';
    html += '</div></div>';
    main.innerHTML = html;
}

function changeEpisode(index) {
    if (!episodes[index]) return;
    trailerMode = false;
    currentEpisode = episodes[index];
    var embedUrl = currentEpisode.embed || '';
    var iframe = document.getElementById('player-iframe');
    var playerFrame = document.getElementById('player-frame');
    if (embedUrl) {
        if (iframe) iframe.src = embedUrl;
        else if (playerFrame) playerFrame.innerHTML = '<iframe src="' + embedUrl + '" id="player-iframe" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" frameborder="0"></iframe>';
    }
    var tabBar = document.getElementById('tab-bar');
    if (tabBar) {
        tabBar.querySelectorAll('.server-btn').forEach(function(btn) { btn.classList.remove('active'); });
        var allBtns = tabBar.querySelectorAll('.server-btn');
        var offset = (currentFilm.trailer ? 1 : 0);
        if (allBtns[offset + index]) allBtns[offset + index].classList.add('active');
    }
    var titleEl = document.querySelector('.info-title');
    if (titleEl) titleEl.innerHTML = currentFilm.title + ' <span style="color:#e50914;font-size:0.6em;">EP ' + currentEpisode.ep + '</span>';

    // Update download & subtitle button
    var dlEl = document.querySelector('.btn-action-download');
    if (dlEl) { dlEl.href = currentEpisode.download || '#'; dlEl.style.display = currentEpisode.download ? '' : 'none'; }
    var subEl = document.querySelector('.btn-action-subtitle');
    if (subEl) { subEl.href = currentEpisode.subtitle || '#'; subEl.style.display = currentEpisode.subtitle ? '' : 'none'; }

    var wrapper = document.querySelector('.player-wrapper');
    if (wrapper) wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function switchTab(tab) {
    var trailerUrl = toEmbedUrl(currentFilm.trailer || '');
    var filmUrl = typeof currentFilm.embed_url === 'string' ? currentFilm.embed_url : '';
    var mirrorUrl = currentFilm.mirror_url || '';
    var iframe = document.getElementById('player-iframe');
    var playerFrame = document.getElementById('player-frame');
    var targetUrl = '';
    if (tab === 'trailer')     { trailerMode = true;  targetUrl = trailerUrl; }
    else if (tab === 'film')   { trailerMode = false; targetUrl = filmUrl; }
    else if (tab === 'mirror') { trailerMode = false; targetUrl = mirrorUrl; }
    if (targetUrl) {
        if (iframe) iframe.src = targetUrl;
        else if (playerFrame) playerFrame.innerHTML = '<iframe src="' + targetUrl + '" id="player-iframe" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" frameborder="0"></iframe>';
    }
    var tabBar = document.getElementById('tab-bar');
    if (tabBar) {
        var btns = tabBar.querySelectorAll('.server-btn');
        btns.forEach(function(btn) {
            var txt = btn.textContent.trim();
            if (tab === 'trailer') btn.classList.toggle('active', txt.indexOf('Trailer') > -1);
            else if (tab === 'film') btn.classList.toggle('active', txt.indexOf('Full Film') > -1);
            else if (tab === 'mirror') btn.classList.toggle('active', txt === 'Mirror');
        });
    }
}

function switchServer(url, btnIndex) {
    var iframe = document.getElementById('player-iframe');
    if (iframe && url) iframe.src = url;
    var btns = document.querySelectorAll('.server-btn');
    for (var i = 0; i < btns.length; i++) btns[i].classList.toggle('active', i === btnIndex);
}

function copyLink() {
    var url = window.location.href;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(showCopyToast);
    } else {
        var input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showCopyToast();
    }
}

function showCopyToast() {
    var t = document.getElementById('copy-toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'copy-toast';
        t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#e50914;color:#fff;padding:10px 20px;border-radius:8px;font-size:14px;z-index:9999;opacity:0;transition:opacity 0.3s;pointer-events:none;';
        t.textContent = 'Link berhasil disalin!';
        document.body.appendChild(t);
    }
    t.style.opacity = '1';
    setTimeout(function() { t.style.opacity = '0'; }, 2000);
}

function loadDisqus() {
    var d = document, s = d.createElement('script');
    s.src = 'https://' + (CONFIG.DISQUS_SHORTNAME || 'piratesstudio21') + '.disqus.com/embed.js';
    s.setAttribute('data-timestamp', +new Date());
    (d.head || d.body).appendChild(s);
}

function renderNotFound(msg) {
    return '<div class="player-notfound">'
        + '<div class="player-notfound-icon">' + icon('alert', '64') + '</div>'
        + '<div class="player-notfound-title">Film Tidak Ditemukan</div>'
        + '<p class="player-notfound-msg">' + (msg || 'Film yang Anda cari tidak tersedia.') + '</p>'
        + '<a href="/" class="btn btn-primary">' + icon('home', '16') + ' Kembali ke Home</a>'
        + '</div>';
}
