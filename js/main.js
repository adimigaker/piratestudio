// =============================================
// PIRATE STUDIO 21 - MAIN SCRIPT
// =============================================

// ─── Navbar Scroll Effect ─────────────────────
function initNavbarScroll() {
    var navbar = document.getElementById('navbar');
    if (!navbar) return;

    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// ─── Live Search ──────────────────────────────
function initLiveSearch() {
    var searchInput = document.getElementById('nav-search');
    var dropdown = document.getElementById('search-dropdown');
    if (!searchInput || !dropdown) return;

    var debounceTimer;
    var activeIndex = -1;

    // Tampilkan dropdown saat fokus (jika ada isi)
    searchInput.addEventListener('focus', function() {
        if (this.value.trim().length >= 2) {
            performSearch(this.value.trim());
        }
    });

    // Search saat mengetik (debounce 300ms)
    searchInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        var query = this.value.trim();
        activeIndex = -1;

        if (query.length < 2) {
            dropdown.classList.remove('show');
            return;
        }

        debounceTimer = setTimeout(function() {
            performSearch(query);
        }, 300);
    });

    // Keyboard navigation
    searchInput.addEventListener('keydown', function(e) {
        var items = dropdown.querySelectorAll('.search-item');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = Math.min(activeIndex + 1, items.length - 1);
            updateActiveItem(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = Math.max(activeIndex - 1, 0);
            updateActiveItem(items);
        } else if (e.key === 'Enter') {
            if (activeIndex >= 0 && items[activeIndex]) {
                e.preventDefault();
                items[activeIndex].click();
            } else {
                var q = this.value.trim();
                if (q) window.location.href = 'search.html?q=' + encodeURIComponent(q);
            }
        } else if (e.key === 'Escape') {
            dropdown.classList.remove('show');
            activeIndex = -1;
            this.blur();
        }
    });

    function updateActiveItem(items) {
        for (var i = 0; i < items.length; i++) {
            items[i].classList.remove('search-item-active');
        }
        if (items[activeIndex]) {
            items[activeIndex].classList.add('search-item-active');
            items[activeIndex].scrollIntoView({ block: 'nearest' });
        }
    }

    // Tutup dropdown saat klik di luar
    document.addEventListener('click', function(e) {
        var searchWrap = document.getElementById('search-wrap');
        if (searchWrap && !searchWrap.contains(e.target)) {
            dropdown.classList.remove('show');
            activeIndex = -1;
        }
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
                var title = highlightMatch(film.title, query);

                html += '<div class="search-item" onclick="window.location.href=\'play.html?id=' + encodeURIComponent(film.id) + '\'">';
                
                if (film.poster) {
                    html += '<img src="' + film.poster + '" alt="" class="search-item-poster" loading="lazy" onerror="this.style.display=\'none\'">';
                } else {
                    html += '<div class="search-item-poster" style="display:flex;align-items:center;justify-content:center;background:#1a1a24;">' + icon('film', '16') + '</div>';
                }
                
                html += '<div class="search-item-info">';
                html += '<div class="search-item-title">' + title + '</div>';
                html += '<div class="search-item-meta">';
                html += '<span>' + (film.year || '—') + '</span>';
                html += '<span class="search-item-type">' + (film.type || 'movie') + '</span>';
                if (film.rating) {
                    html += '<span class="search-item-rating">' + icon('star', '10') + ' ' + film.rating + '</span>';
                }
                html += '</div></div></div>';
            }

            if (res.data.length > 8) {
                html += '<div class="search-item search-item-more" onclick="window.location.href=\'search.html?q=' + encodeURIComponent(query) + '\'">Lihat semua (' + res.data.length + ') ' + icon('arrow-right', '14') + '</div>';
            }

            dropdown.innerHTML = html;
        }).catch(function() {
            dropdown.innerHTML = '<div class="search-dropdown-empty">' + icon('alert', '20') + '<p>Gagal mencari</p></div>';
        });
    }

    function highlightMatch(text, query) {
        var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var regex = new RegExp('(' + escaped + ')', 'gi');
        return text.replace(regex, '<span class="search-highlight">$1</span>');
    }
}

// ─── Load Home Page ───────────────────────────
async function loadHomePage() {
    var main = document.getElementById('main-content');
    if (!main) return;

    try {
        var results = await Promise.all([
            API.getFeatured(),
            API.getPopular(),
            API.getLatest(),
            API.getGenres()
        ]);

        var featuredRes = results[0];
        var popularRes = results[1];
        var latestRes = results[2];
        var genresRes = results[3];

        var html = '';

        // Hero
        if (featuredRes.status === 'success' && featuredRes.data) {
            html += COMPONENTS.hero(featuredRes.data);
        }

        // Popular
        if (popularRes.status === 'success' && popularRes.data.length > 0) {
            html += '<section class="section"><div class="container">';
            html += COMPONENTS.sectionHeader('star', 'Film Populer', popularRes.data.length, 'genre.html');
            html += '<div class="film-grid grid-6">';
            for (var i = 0; i < popularRes.data.length; i++) {
                html += COMPONENTS.filmCard(popularRes.data[i], i);
            }
            html += '</div></div></section>';
        }

        // Latest
        if (latestRes.status === 'success' && latestRes.data.length > 0) {
            html += '<section class="section"><div class="container">';
            html += COMPONENTS.sectionHeader('clock', 'Rilis Terbaru', latestRes.data.length);
            html += '<div class="film-grid" id="latest-grid"></div>';
            html += '<div id="load-more-container" class="load-more-container"></div>';
            html += '</div></section>';
        }

        // Genre tags
        if (genresRes.status === 'success' && genresRes.data.length > 0) {
            html += '<section class="section"><div class="container">';
            html += COMPONENTS.genreTags(genresRes.data);
            html += '</div></section>';
        }

        // Empty
        if (!html) {
            html = UTILS.emptyHTML('Belum ada film dalam database');
        }

        main.innerHTML = html;

        // Init Load More
        if (latestRes.status === 'success' && latestRes.data.length > 9) {
            LOAD_MORE.init('latest-grid', latestRes.data, 9);
        } else if (latestRes.status === 'success' && latestRes.data.length > 0) {
            var grid = document.getElementById('latest-grid');
            if (grid) {
                grid.innerHTML = '';
                for (var j = 0; j < latestRes.data.length; j++) {
                    grid.innerHTML += COMPONENTS.filmCard(latestRes.data[j], j);
                }
            }
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
    loadHomePage();
});