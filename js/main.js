// =============================================
// PIRATE STUDIO 21 - MAIN SCRIPT
// =============================================

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
        if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = Math.min(activeIndex + 1, items.length - 1); updateActive(items); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = Math.max(activeIndex - 1, 0); updateActive(items); }
        else if (e.key === 'Enter') {
            if (activeIndex >= 0 && items[activeIndex]) { e.preventDefault(); items[activeIndex].click(); }
            else { var q = this.value.trim(); if (q) window.location.href = 'search.html?q=' + encodeURIComponent(q); }
        }
        else if (e.key === 'Escape') { dropdown.classList.remove('show'); activeIndex = -1; this.blur(); }
    });
    function updateActive(items) {
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
            if (res.status !== 'success' || !res.data || !res.data.length) {
                dropdown.innerHTML = '<div class="search-dropdown-empty">' + icon('search', '20') + '<p>Tidak ditemukan</p></div>';
                return;
            }
            var html = res.data.slice(0, 8).map(function(film) {
                var title = film.title.replace(new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<span class="search-highlight">$1</span>');
                return '<div class="search-item" onclick="window.location.href=\'play.html?id=' + encodeURIComponent(film.id) + '\'">'
                    + (film.poster ? '<img src="' + film.poster + '" class="search-item-poster" loading="lazy" onerror="this.style.display=\'none\'">' : '<div class="search-item-poster" style="display:flex;align-items:center;justify-content:center;background:#1a1a24;">' + icon('film', '16') + '</div>')
                    + '<div class="search-item-info"><div class="search-item-title">' + title + '</div>'
                    + '<div class="search-item-meta"><span>' + (film.year || '—') + '</span><span class="search-item-type">' + (film.type || 'movie') + '</span>'
                    + (film.rating ? '<span class="search-item-rating">' + icon('star', '10') + ' ' + film.rating + '</span>' : '')
                    + '</div></div></div>';
            }).join('');
            if (res.data.length > 8) html += '<div class="search-item search-item-more" onclick="window.location.href=\'search.html?q=' + encodeURIComponent(query) + '\'">Lihat semua (' + res.data.length + ') ' + icon('arrow-right', '14') + '</div>';
            dropdown.innerHTML = html;
        }).catch(function() {
            dropdown.innerHTML = '<div class="search-dropdown-empty">' + icon('alert', '20') + '<p>Gagal mencari</p></div>';
        });
    }
}

// ─── Skeleton (C) ────────────────────────────
function renderSkeletons(containerId, count) {
    var el = document.getElementById(containerId);
    if (!el) return;
    var html = '';
    for (var i = 0; i < (count || 6); i++) {
        html += '<div class="film-card skeleton-card">'
            + '<div class="skeleton skeleton-poster"></div>'
            + '<div class="skeleton skeleton-title"></div>'
            + '<div class="skeleton skeleton-meta"></div>'
            + '</div>';
    }
    el.innerHTML = html;
}

// ─── Pull to Refresh ─────────────────────────
function initPullToRefresh() {
    var startY = 0;
    var pulling = false;
    var indicator = document.createElement('div');
    indicator.id = 'ptr-indicator';
    indicator.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> <span>Tarik untuk refresh</span>';
    indicator.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;background:var(--surface,#16161f);color:var(--text2,#aaa);font-size:13px;transform:translateY(-100%);transition:transform 0.2s;border-bottom:1px solid rgba(255,255,255,0.06);';
    document.body.prepend(indicator);

    document.addEventListener('touchstart', function(e) {
        if (window.scrollY === 0) { startY = e.touches[0].clientY; pulling = true; }
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
        if (!pulling) return;
        var dist = e.touches[0].clientY - startY;
        if (dist > 10 && window.scrollY === 0) {
            indicator.style.transform = 'translateY(0)';
            var span = indicator.querySelector('span');
            if (span) span.textContent = dist > 60 ? 'Lepas untuk refresh' : 'Tarik untuk refresh';
        }
    }, { passive: true });

    document.addEventListener('touchend', function(e) {
        if (!pulling) return;
        pulling = false;
        var dist = e.changedTouches[0].clientY - startY;
        indicator.style.transform = 'translateY(-100%)';
        if (dist > 60 && window.scrollY === 0) {
            API.clearCache();
            var span = indicator.querySelector('span');
            indicator.style.transform = 'translateY(0)';
            if (span) span.textContent = 'Memuat ulang...';
            indicator.querySelector('svg').style.animation = 'spin 0.8s linear infinite';
            setTimeout(function() {
                indicator.style.transform = 'translateY(-100%)';
                loadHomePage();
            }, 600);
        }
    });
}

// ─── Load Home Page ───────────────────────────
async function loadHomePage() {
    var main = document.getElementById('main-content');
    if (!main) return;

    // Tampilkan skeleton dulu (C)
    var skeletonHtml = '<section class="section" style="padding-top:80px;"><div class="container">'
        + '<div class="section-header"><div class="skeleton" style="width:140px;height:22px;border-radius:4px;"></div></div>'
        + '<div class="film-grid grid-6" id="skeleton-popular"></div>'
        + '</div></section>'
        + '<section class="section"><div class="container">'
        + '<div class="section-header"><div class="skeleton" style="width:120px;height:22px;border-radius:4px;"></div></div>'
        + '<div class="film-grid" id="skeleton-latest"></div>'
        + '</div></section>';
    main.innerHTML = skeletonHtml;
    renderSkeletons('skeleton-popular', 6);
    renderSkeletons('skeleton-latest', 9);

    try {
        // Featured, popular, genres — parallel, pakai cache (B)
        var results = await Promise.all([
            API.getFeatured(),
            API.getPopular(),
            API.getGenres(),
            API.getLatest(CONFIG.LATEST_LIMIT || 9, 0) // paginated (A)
        ]);

        var featuredRes = results[0];
        var popularRes  = results[1];
        var genresRes   = results[2];
        var latestRes   = results[3];

        var html = '';
        var isFirstSection = true;

        function sectionPad() {
            if (isFirstSection) { isFirstSection = false; return ' style="padding-top:80px;"'; }
            return '';
        }

        // Hero
        if (featuredRes.status === 'success' && featuredRes.data) {
            var featuredList = Array.isArray(featuredRes.data) ? featuredRes.data : [featuredRes.data];
            if (featuredList.length > 0) {
                var randomFilm = featuredList[Math.floor(Math.random() * featuredList.length)];
                html += COMPONENTS.hero(randomFilm);
                isFirstSection = false;
            }
        }

        // Genre tags
        if (genresRes.status === 'success' && genresRes.data && genresRes.data.length > 0) {
            html += '<section class="section section-genre"' + sectionPad() + '><div class="container">';
            html += COMPONENTS.genreTags(genresRes.data);
            html += '</div></section>';
        }

        // Terpopuler
        if (popularRes.status === 'success' && popularRes.data && popularRes.data.length > 0) {
            html += '<section class="section"' + sectionPad() + '><div class="container">';
            html += COMPONENTS.sectionHeader('star', 'Terpopuler', popularRes.data.length, 'genre.html');
            html += '<div class="film-grid grid-6">';
            for (var i = 0; i < popularRes.data.length; i++) html += COMPONENTS.filmCard(popularRes.data[i], i);
            html += '</div></div></section>';
        }

        // Terbaru — paginated
        if (latestRes.status === 'success' && latestRes.data && latestRes.data.length > 0) {
            html += '<section class="section"' + sectionPad() + '><div class="container">';
            html += COMPONENTS.sectionHeader('clock', 'Terbaru', latestRes.total || latestRes.data.length);
            html += '<div class="film-grid" id="latest-grid"></div>';
            html += '<div id="load-more-container" class="load-more-container"></div>';
            html += '</div></section>';
        }

        if (!html) html = UTILS.emptyHTML('Belum ada film dalam database');

        main.innerHTML = html;

        // Init paginated load more
        if (latestRes.status === 'success' && latestRes.data && latestRes.data.length > 0) {
            var grid = document.getElementById('latest-grid');
            if (grid) {
                for (var j = 0; j < latestRes.data.length; j++) grid.innerHTML += COMPONENTS.filmCard(latestRes.data[j], j);
            }
            LOAD_MORE.initPaginated(latestRes.total || 0, CONFIG.LATEST_LIMIT || 9);
        }

    } catch (error) {
        console.error('Error:', error);
        main.innerHTML = UTILS.errorHTML('Gagal memuat data. Periksa koneksi internet Anda.');
    }
}

// ─── Init ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    initNavbarScroll();
    initLiveSearch();
    initPullToRefresh();
    loadHomePage();
});
