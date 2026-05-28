// =============================================
// PIRATE STUDIO 21 - COMPONENTS
// =============================================
var COMPONENTS = {
    filmCard: function(film, index) {
        index = index || 0;
        var genres = UTILS.parseGenres(film.genre);
        var genreBadge = genres[0] || '';
        var delay = index * 0.05;

        var html = '<div class="film-card" style="animation-delay:' + delay + 's" onclick="window.location.href=\'play.html?id=' + film.id + '\'">';

        // Poster
        html += '<img src="' + film.poster + '" alt="' + film.title + '" loading="lazy" onerror="this.style.background=\'#1a1a24\';this.style.objectFit=\'contain\';">';

        // Genre badge
        if (genreBadge) {
            html += '<div class="card-badge">' + genreBadge + '</div>';
        }

        // Type badge
        html += '<div class="card-type">' + (film.type || 'movie') + '</div>';

        // Rating
        if (film.rating) {
            html += '<div class="card-rating">' + icon('star', '10') + ' ' + film.rating + '</div>';
        }

        // Overlay
        html += '<div class="card-overlay"></div>';

        // Bottom info
        html += '<div class="card-info-bottom">';
        html += '<div class="card-title">' + film.title + '</div>';
        html += '<div class="card-year">' + (film.year || '') + '</div>';
        html += '</div>';

        // Hover info
        html += '<div class="card-hover">';
        html += '<div class="card-play-btn">' + icon('play', '18') + '</div>';
        html += '<div class="card-hover-title">' + film.title + '</div>';
        html += '<div class="card-hover-meta">';
        html += '<span>' + (film.year || '—') + '</span>';
        if (film.rating) {
            html += '<span>&middot;</span><span style="color:#f5c518;">' + icon('star', '10') + ' ' + film.rating + '</span>';
        }
        html += '</div></div>';

        html += '</div>';
        return html;
    },

    hero: function(film) {
        if (!film) return '';

        var genres = UTILS.parseGenres(film.genre);
        var backdrop = film.backdrop || film.poster || '';

        var html = '<section class="hero">';
        if (backdrop) {
            html += '<div class="hero-bg" style="background-image:url(\'' + backdrop + '\');"></div>';
        }
        html += '<div class="hero-overlay"></div>';
        html += '<div class="hero-content">';

        // Badge
        html += '<div class="hero-badge"><span class="hero-badge-dot"></span>' + icon('film', '12') + ' Featured</div>';

        // Title
        html += '<h1 class="hero-title">' + film.title + '</h1>';

        // Meta
        html += '<div class="hero-meta">';
        html += '<span class="hero-year">' + (film.year || '—') + '</span>';
        if (film.rating) {
            html += '<span class="hero-rating">' + icon('star', '12') + ' ' + film.rating + '</span>';
        }
        for (var i = 0; i < Math.min(genres.length, 3); i++) {
            html += '<span class="hero-genre">' + genres[i] + '</span>';
        }
        html += '<span class="hero-genre" style="opacity:0.6;">' + (film.type || 'movie').toUpperCase() + '</span>';
        html += '</div>';

        // Synopsis
        html += '<p class="hero-desc">' + UTILS.truncate(film.synopsis, 180) + '</p>';

        // Actions
        html += '<div class="hero-actions">';
        html += '<a href="play.html?id=' + film.id + '" class="btn btn-primary">' + icon('play', '16') + ' Tonton Sekarang</a>';
        html += '<a href="play.html?id=' + film.id + '" class="btn btn-secondary">' + icon('info', '16') + ' Info Lebih</a>';
        html += '</div>';

        html += '</div></section>';
        return html;
    },

    sectionHeader: function(iconName, title, count, seeAllLink) {
        var html = '<div class="section-header">';
        html += '<h2 class="section-title">' + icon(iconName, '18') + ' ' + title + '</h2>';
        if (count) {
            html += '<span class="section-count">' + count + ' film</span>';
        }
        if (seeAllLink) {
            html += '<a href="' + seeAllLink + '" class="see-all">Lihat Semua ' + icon('chevron-right', '14') + '</a>';
        }
        html += '</div>';
        return html;
    },

    genreTags: function(genres, activeGenre) {
        var html = '<div class="genre-tags">';
        html += '<span class="genre-label">' + icon('film', '14') + ' Genre:</span>';
        html += '<a href="genre.html" class="genre-tag' + (!activeGenre ? ' active' : '') + '">Semua</a>';
        for (var i = 0; i < Math.min(genres.length, 8); i++) {
            var g = genres[i];
            html += '<a href="genre.html?genre=' + encodeURIComponent(g) + '" class="genre-tag' + (g === activeGenre ? ' active' : '') + '">' + g + '</a>';
        }
        html += '</div>';
        return html;
    }
};