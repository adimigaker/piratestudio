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

// Update URL dengan parameter episode
function updateUrlEpisode(epNum) {
    var url = new URL(window.location.href);
    if (epNum) {
        url.searchParams.set('ep', epNum);
    } else {
        url.searchParams.delete('ep');
    }
    window.history.replaceState({}, '', url);
}

async function loadPlayer() {
    var filmId = UTILS.getParam('id');
    var episodeParam = UTILS.getParam('ep');  // Baca parameter episode
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
            
            // Cari episode berdasarkan parameter ep
            if (episodeParam) {
                var targetEp = parseInt(episodeParam);
                var foundEpisode = null;
                for (var i = 0; i < episodes.length; i++) {
                    if (episodes[i].ep === targetEp) {
                        foundEpisode = episodes[i];
                        break;
                    }
                }
                currentEpisode = foundEpisode || episodes[0] || null;
            } else {
                currentEpisode = episodes[0] || null;
            }
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

    // TAB BAR (Trailer + Episode/Full Film)
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
    }
    html += '</div>';

    // SERVER BAR (Server 1 / Server 2) untuk MOVIE
    if (!isSeries && mirrorUrl) {
        var serverBarStyle = trailerMode ? 'display:none;gap:8px;' : 'gap:8px;';
        html += '<div class="server-bar" id="server-bar" style="' + serverBarStyle + '">';
        html += '<span class="server-label">' + icon('tv', '14') + ' Server:</span>';
        html += '<button class="server-btn active" id="srv-1" onclick="switchServer(&quot;embed&quot;)">Server 1</button>';
        html += '<button class="server-btn" id="srv-2" onclick="switchServer(&quot;mirror&quot;)">Server 2</button>';
        html += '</div>';
    } else if (!isSeries) {
        html += '<div id="server-bar" style="display:none;"></div>';
    }

    // SERVER BAR untuk SERIES
    if (isSeries) {
        var hasEpMirror = currentEpisode && currentEpisode.mirror;
        var seriesServerStyle = (trailerMode || !hasEpMirror) ? 'display:none;gap:8px;' : 'gap:8px;';
        html += '<div class="server-bar" id="server-bar" style="' + seriesServerStyle + '">';
        html += '<span class="server-label">' + icon('tv', '14') + ' Server:</span>';
        html += '<button class="server-btn active" id="srv-1" onclick="switchServer(&quot;embed&quot;)">Server 1</button>';
        html += '<button class="server-btn" id="srv-2" onclick="switchServer(&quot;mirror&quot;)">Server 2</button>';
        html += '</div>';
    }

    // INFO SECTION
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

    // Update URL dengan episode yang dipilih
    updateUrlEpisode(currentEpisode.ep);

    // Update download & subtitle button
    var dlEl = document.querySelector('.btn-action-download');
    if (dlEl) { dlEl.href = currentEpisode.download || '#'; dlEl.style.display = currentEpisode.download ? '' : 'none'; }
    var subEl = document.querySelector('.btn-action-subtitle');
    if (subEl) { subEl.href = currentEpisode.subtitle || '#'; subEl.style.display = currentEpisode.subtitle ? '' : 'none'; }

    // Update server bar visibility
    var serverBar = document.getElementById('server-bar');
    if (serverBar) {
        if (currentEpisode && currentEpisode.mirror) {
            serverBar.style.display = '';
            var srv1 = document.getElementById('srv-1');
            var srv2 = document.getElementById('srv-2');
            if (srv1) srv1.classList.add('active');
            if (srv2) srv2.classList.remove('active');
        } else {
            serverBar.style.display = 'none';
        }
    }

    var wrapper = document.querySelector('.player-wrapper');
    if (wrapper) wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function switchTab(tab) {
    var trailerUrl = toEmbedUrl(currentFilm.trailer || '');
    var filmUrl = typeof currentFilm.embed_url === 'string' ? currentFilm.embed_url : '';
    var iframe = document.getElementById('player-iframe');
    var playerFrame = document.getElementById('player-frame');
    var targetUrl = '';
    
    if (tab === 'trailer') {
        trailerMode = true;
        targetUrl = trailerUrl;
        // Hapus parameter ep dari URL saat mode trailer
        updateUrlEpisode(null);
    } else if (tab === 'film') {
        trailerMode = false;
        targetUrl = filmUrl;
        // Kembalikan parameter ep jika series
        if (currentFilm.type === 'series' && currentEpisode) {
            updateUrlEpisode(currentEpisode.ep);
        } else {
            updateUrlEpisode(null);
        }
    }

    if (targetUrl) {
        if (iframe) iframe.src = targetUrl;
        else if (playerFrame) playerFrame.innerHTML = '<iframe src="' + targetUrl + '" id="player-iframe" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" frameborder="0"></iframe>';
    }
    
    // Update active style di tab-bar
    var tabBar = document.getElementById('tab-bar');
    if (tabBar) {
        var btns = tabBar.querySelectorAll('.server-btn');
        btns.forEach(function(btn) {
            var txt = btn.textContent.trim();
            if (tab === 'trailer') btn.classList.toggle('active', txt.indexOf('Trailer') > -1);
            else if (tab === 'film') btn.classList.toggle('active', txt.indexOf('Full Film') > -1);
        });
    }

    // Atur visibilitas server bar
    var serverBar = document.getElementById('server-bar');
    var isSeries = currentFilm.type === 'series';
    var mirrorUrl = (isSeries && currentEpisode) ? currentEpisode.mirror : currentFilm.mirror_url;
    
    if (serverBar) {
        if (tab === 'trailer') {
            serverBar.style.display = 'none';
        } else if (tab === 'film') {
            if (mirrorUrl) {
                serverBar.style.display = '';
                var srv1 = document.getElementById('srv-1');
                var srv2 = document.getElementById('srv-2');
                if (srv1) srv1.classList.add('active');
                if (srv2) srv2.classList.remove('active');
            } else {
                serverBar.style.display = 'none';
            }
        }
    }
    
    // Untuk series: update title biar ga kelebihan span EP
    if (isSeries) {
        var titleEl = document.querySelector('.info-title');
        if (titleEl && !trailerMode && currentEpisode) {
            titleEl.innerHTML = currentFilm.title + ' <span style="color:#e50914;font-size:0.6em;">EP ' + currentEpisode.ep + '</span>';
        } else if (titleEl && trailerMode) {
            titleEl.innerHTML = currentFilm.title;
        }
    }
}

function switchServer(server) {
    var targetUrl = '';
    var isSeries = currentFilm.type === 'series';
    
    if (server === 'embed') {
        targetUrl = (isSeries && currentEpisode) ? currentEpisode.embed : currentFilm.embed_url;
    } else if (server === 'mirror') {
        targetUrl = (isSeries && currentEpisode) ? currentEpisode.mirror : currentFilm.mirror_url;
    }
    
    var iframe = document.getElementById('player-iframe');
    if (iframe && targetUrl) iframe.src = targetUrl;
    
    var srv1 = document.getElementById('srv-1');
    var srv2 = document.getElementById('srv-2');
    if (srv1) srv1.classList.toggle('active', server === 'embed');
    if (srv2) srv2.classList.toggle('active', server === 'mirror');
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

// =============================================
// DISQUS INTEGRATION
// =============================================

function loadDisqus() {
    var shortname = CONFIG.DISQUS_SHORTNAME || 'piratestudio21';
    var filmId = currentFilm ? currentFilm.id : UTILS.getParam('id');
    var currentUrl = window.location.href;
    
    // Hapus thread Disqus yang lama jika ada
    var disqusThread = document.getElementById('disqus_thread');
    if (disqusThread) {
        disqusThread.innerHTML = '';
    }
    
    // Hapus script Disqus yang lama
    var oldScript = document.getElementById('disqus-embed-script');
    if (oldScript) {
        oldScript.remove();
    }
    
    // Hapus elemen iframe Disqus yang mungkin tertinggal
    var disqusFrames = document.querySelectorAll('iframe[src*="disqus.com"]');
    disqusFrames.forEach(function(frame) {
        frame.remove();
    });
    
    // Reset DISQUS global variable
    window.DISQUS = undefined;
    
    // Konfigurasi Disqus
    window.disqus_config = function() {
        this.page.url = currentUrl;
        this.page.identifier = filmId;  // Gunakan film.id sebagai identifier (bukan per episode)
        this.page.title = currentFilm ? currentFilm.title : document.title;
    };
    
    // Load script Disqus
    var script = document.createElement('script');
    script.id = 'disqus-embed-script';
    script.src = 'https://' + shortname + '.disqus.com/embed.js';
    script.setAttribute('data-timestamp', +new Date());
    script.async = true;
    
    (document.head || document.body).appendChild(script);
}

function renderNotFound(msg) {
    return '<div class="player-notfound">'
        + '<div class="player-notfound-icon">' + icon('alert', '64') + '</div>'
        + '<div class="player-notfound-title">Film Tidak Ditemukan</div>'
        + '<p class="player-notfound-msg">' + (msg || 'Film yang Anda cari tidak tersedia.') + '</p>'
        + '<a href="/" class="btn btn-primary">' + icon('home', '16') + ' Kembali ke Home</a>'
        + '</div>';
}