var allFilms = [];
var filteredFilms = [];
var currentPage = 1;
var perPage = 20;

function getParam(param) {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

function parseGenres(str) {
    if (!str) return [];
    return str.split(',').map(function(g) { return g.trim(); }).filter(Boolean);
}

function showToast(msg, type) {
    type = type || 'info';
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = 'toast ' + type + ' show';
    setTimeout(function() { toast.classList.remove('show'); }, 3000);
}

async function loadDashboard() {
    var tableBody = document.getElementById('table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="10" class="table-loading">Memuat data...</td></tr>';
    try {
        var res = await DASHBOARD_API.getAll();
        if (res.status !== 'success') {
            tableBody.innerHTML = '<tr><td colspan="10" class="table-loading">❌ ' + (res.message || 'Gagal') + '</td></tr>';
            return;
        }
        allFilms = res.data || [];
        filteredFilms = allFilms;
        updateStats();
        populateGenreFilter();
        renderTable();
        renderPagination();
        if (allFilms.length > 0) showToast(allFilms.length + ' film dimuat', 'success');
    } catch (error) {
        tableBody.innerHTML = '<tr><td colspan="10" class="table-loading">❌ ' + error.message + '</td></tr>';
    }
}

function updateStats() {
    var total = allFilms.length;
    var movies = 0, series = 0;
    for (var i = 0; i < allFilms.length; i++) {
        if (allFilms[i].type === 'movie') movies++;
        else if (allFilms[i].type === 'series') series++;
    }
    var elTotal = document.getElementById('stat-total');
    var elMovies = document.getElementById('stat-movies');
    var elSeries = document.getElementById('stat-series');
    if (elTotal) elTotal.textContent = total;
    if (elMovies) elMovies.textContent = movies;
    if (elSeries) elSeries.textContent = series;
}

function populateGenreFilter() {
    var select = document.getElementById('filter-genre');
    if (!select) return;
    var genres = {};
    for (var i = 0; i < allFilms.length; i++) {
        var fg = parseGenres(allFilms[i].genre);
        for (var j = 0; j < fg.length; j++) genres[fg[j]] = true;
    }
    select.innerHTML = '<option value="all">Semua Genre</option>';
    var keys = Object.keys(genres).sort();
    for (var k = 0; k < keys.length; k++) {
        select.innerHTML += '<option value="' + keys[k] + '">' + keys[k] + '</option>';
    }
}

function filterFilms() {
    var search = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
    var type = document.getElementById('filter-type')?.value || 'all';
    var genre = document.getElementById('filter-genre')?.value || 'all';
    filteredFilms = [];
    for (var i = 0; i < allFilms.length; i++) {
        var film = allFilms[i];
        var matchSearch = !search || (film.title && film.title.toLowerCase().indexOf(search) !== -1) || (film.id && film.id.toLowerCase().indexOf(search) !== -1);
        var matchType = type === 'all' || film.type === type;
        var matchGenre = true;
        if (genre !== 'all') {
            matchGenre = false;
            var fg = parseGenres(film.genre);
            for (var j = 0; j < fg.length; j++) {
                if (fg[j].toLowerCase() === genre.toLowerCase()) { matchGenre = true; break; }
            }
        }
        if (matchSearch && matchType && matchGenre) filteredFilms.push(film);
    }
    currentPage = 1;
    renderTable();
    renderPagination();
}

function renderTable() {
    var tbody = document.getElementById('table-body');
    if (!tbody) return;
    if (filteredFilms.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="table-loading">Tidak ada film</td></tr>';
        return;
    }
    var start = (currentPage - 1) * perPage;
    var end = Math.min(start + perPage, filteredFilms.length);
    var pageFilms = filteredFilms.slice(start, end);
    var html = '';
    for (var i = 0; i < pageFilms.length; i++) {
        var film = pageFilms[i];
        var genres = parseGenres(film.genre);
        var isDraft = film.status === 'draft';
        var isFeatured = film.featured === 'TRUE';
        var isPopular = film.popular === 'TRUE';

        html += '<tr>';
        html += '<td style="width:28px;text-align:center;color:var(--admin-text3);font-size:0.75rem;">' + (start + i + 1) + '</td>';

        // Cover dengan badge overlay
        html += '<td style="width:54px;">';
        html += '<div class="cover-wrap">';
        if (film.poster) {
            html += '<img src="' + film.poster + '" class="table-poster" loading="lazy" onerror="this.style.opacity=0.2">';
        } else {
            html += '<div class="table-poster no-poster">—</div>';
        }
        html += '<div class="cover-badges">';
        if (isFeatured) html += '<span class="cover-badge-icon featured" title="Featured"><svg width=\"11\" height=\"11\" viewBox=\"0 0 24 24\" fill=\"#f1c40f\" stroke=\"#f1c40f\" stroke-width=\"1\"><polygon points=\"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2\"/></svg></span>';
        if (isPopular)  html += '<span class="cover-badge-icon popular" title="Popular"><svg width=\"11\" height=\"11\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#e67e22\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z\"/></svg></span>';
        html += '</div>';
        html += '<span class="cover-type ' + (film.type || 'movie') + '">' + (film.type === 'series' ? 'S' : 'M') + '</span>';
        html += '</div></td>';

        // Info
        html += '<td>';
        html += '<div class="table-title">' + (film.title || '—');
        if (isDraft) html += ' <span class="draft-badge">DRAFT</span>';
        html += '</div>';
        html += '<div class="table-meta">';
        html += '<span>' + (film.year || '—') + '</span>';
        if (film.rating) html += '<span>&#9733; ' + film.rating + '</span>';
        if (genres.length > 0) html += '<span>' + genres.slice(0,2).join(', ') + (genres.length > 2 ? '...' : '') + '</span>';
        html += '</div>';
        html += '<div style="font-size:0.68rem;color:var(--admin-text3);margin-top:2px;">' + (film.id || '') + '</div>';
        html += '</td>';

        // Aksi
        html += '<td style="width:76px;">';
        html += '<div class="table-actions">';
        html += '<a href="editor.html?id=' + encodeURIComponent(film.id) + '" class="admin-btn admin-btn-sm admin-btn-secondary" title="Edit"><svg width=\"13\" height=\"13\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7\"/><path d=\"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z\"/></svg></a>';
        html += '<button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteFilmById(\'' + film.id.replace(/'/g, "\'") + '\')" title="Hapus"><svg width=\"13\" height=\"13\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"3 6 5 6 21 6\"/><path d=\"M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6\"/><path d=\"M10 11v6\"/><path d=\"M14 11v6\"/><path d=\"M9 6V4h6v2\"/></svg></button>';
        html += '</div></td>';
        html += '</tr>';
    }
    tbody.innerHTML = html;
}

function renderPagination() {
    var container = document.getElementById('pagination');
    if (!container) return;
    var totalPages = Math.ceil(filteredFilms.length / perPage);
    if (totalPages <= 1) { container.innerHTML = ''; return; }
    var html = '';
    for (var i = 1; i <= totalPages; i++) {
        html += '<button class="page-btn' + (i === currentPage ? ' active' : '') + '" onclick="goToPage(' + i + ')">' + i + '</button>';
    }
    container.innerHTML = html;
}

function goToPage(page) { currentPage = page; renderTable(); renderPagination(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

async function deleteFilmById(id) {
    if (!confirm('Yakin hapus "' + id + '"?')) return;
    try {
        var res = await DASHBOARD_API.delete(id);
        if (res.status === 'success') { showToast('Dihapus!', 'success'); loadDashboard(); }
        else showToast('' + (res.message || 'Gagal'), 'error');
    } catch (e) { showToast('Gagal', 'error'); }
}

function setupFilters() {
    var si = document.getElementById('search-input');
    var ft = document.getElementById('filter-type');
    var fg = document.getElementById('filter-genre');
    if (si) si.addEventListener('input', filterFilms);
    if (ft) ft.addEventListener('change', filterFilms);
    if (fg) fg.addEventListener('change', filterFilms);
}

async function initEditor() {
    var filmId = getParam('id');
    setupPreview('film-poster', 'poster-preview');
    setupPreview('film-backdrop', 'backdrop-preview');
    
    var form = document.getElementById('film-form');
    if (form) {
        form.addEventListener('submit', function(e) { e.preventDefault(); });
    }
    
    var titleEl = document.getElementById('film-title');
    var slugEl = document.getElementById('film-slug');
    var yearEl = document.getElementById('film-year');
    if (titleEl && slugEl) {
        titleEl.addEventListener('input', function() {
            if (!slugEl.dataset.manual) {
                var s = titleEl.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                if (yearEl && yearEl.value) s += '-' + yearEl.value;
                slugEl.value = s;
            }
        });
        slugEl.addEventListener('focus', function() { slugEl.dataset.manual = 'true'; });
    }

    if (filmId) {
        document.getElementById('page-title').innerHTML = '<svg width=\"13\" height=\"13\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7\"/><path d=\"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z\"/></svg> Edit Film';
        document.getElementById('form-mode').value = 'edit';
        document.getElementById('original-id').value = filmId;
        document.getElementById('btn-delete').style.display = 'inline-flex';
        document.getElementById('film-id').readOnly = true;
        await loadFilmData(filmId);
    } else {
        document.getElementById('page-title').textContent = 'Tambah Film';
        checkDraft();
    }
}

function setupPreview(inputId, previewId) {
    var input = document.getElementById(inputId);
    var preview = document.getElementById(previewId);
    if (!input || !preview) return;
    if (input.value.trim()) showPreview(preview, input.value.trim());
    input.addEventListener('input', function() { showPreview(preview, this.value.trim()); });
}

function showPreview(preview, url) {
    if (url) {
        preview.innerHTML = '<img src="' + url + '" style="max-width:100%;max-height:200px;object-fit:contain;" onerror="this.innerHTML=\'<span class=preview-placeholder>Gambar tidak ditemukan</span>\'">';
    } else {
        preview.innerHTML = '<span class="preview-placeholder">Preview akan muncul di sini</span>';
    }
}

async function loadFilmData(id) {
    try {
        var res = await DASHBOARD_API.getById(id);
        if (res.status !== 'success' || !res.data) { showToast('Tidak ditemukan', 'error'); return; }
        var f = res.data;
        setVal('film-id', f.id);
        setVal('film-type', f.type);
        setVal('film-title', f.title);
        setVal('film-slug', f.slug);
        setVal('film-year', f.year);
        setVal('film-rating', f.rating);
        setVal('film-duration', f.duration);
        setVal('film-genre', f.genre);
        setVal('film-synopsis', f.synopsis);
        setVal('film-director', f.director);
        setVal('film-cast', f.cast);
        setVal('film-poster', f.poster);
        setVal('film-backdrop', f.backdrop);
        // Handle embed_url: series = parse episodes, movie = input biasa
        if (f.type === 'series') {
            // Panggil toggleSeriesPanel dulu, lalu load episodes
            if (typeof toggleSeriesPanel === 'function') toggleSeriesPanel();
            loadEpisodes(f.embed_url);
        } else {
            setVal('film-embed', f.embed_url);
        }
        setVal('film-download', f.download_url);
        setVal('film-mirror', f.mirror_url);
        setVal('film-subtitle', f.subtitle_url);
        setVal('film-trailer', f.trailer);
        document.getElementById('film-featured').checked = f.featured === 'TRUE';
        document.getElementById('film-popular').checked = f.popular === 'TRUE';
        if (f.poster) showPreview(document.getElementById('poster-preview'), f.poster);
        if (f.backdrop) showPreview(document.getElementById('backdrop-preview'), f.backdrop);
        showToast('Data dimuat', 'success');
    } catch (e) { showToast('Gagal', 'error'); }
}

function setupPreview(inputId, previewId) {
    var input = document.getElementById(inputId);
    var preview = document.getElementById(previewId);
    if (!input || !preview) return;
    input.addEventListener('input', function() {
        var url = this.value.trim();
        if (url) showPreview(preview, url);
        else { preview.innerHTML = '<span class="preview-placeholder">Preview akan muncul di sini</span>'; }
    });
}

function showPreview(previewEl, url) {
    if (!previewEl || !url) return;
    previewEl.innerHTML = '<img src="' + url + '" style="max-width:100%;max-height:200px;border-radius:6px;display:block;" onerror="this.parentElement.innerHTML=\'<span class=preview-placeholder>Gambar tidak bisa dimuat</span>\'">';
}

// Upload gambar ke Google Drive via AppScript
async function uploadMedia(inputId, previewId) {
    var input = document.getElementById(inputId);
    if (!input) return;

    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';

    fileInput.onchange = async function() {
        var file = fileInput.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { showToast('Maks 5MB', 'error'); return; }

        // Cari tombol upload yang sesuai dan disable
        var btn = input.parentElement ? input.parentElement.querySelector('.media-upload-btn') : null;
        if (btn) { btn.disabled = true; btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><circle cx="12" cy="12" r="10" stroke-opacity="0.2"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>'; }
        showToast('Mengupload gambar...', 'info');

        try {
            var result = await DASHBOARD_API.uploadImage(file);
            if (result.status === 'success' && result.url) {
                input.value = result.url;
                var preview = document.getElementById(previewId);
                if (preview) showPreview(preview, result.url);
                showToast('Upload berhasil!', 'success');
            } else {
                showToast('' + (result.message || 'Gagal upload'), 'error');
            }
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
        }
    };

    fileInput.click();
}

function setVal(id, value) {
    var el = document.getElementById(id);
    if (el && value !== undefined && value !== null) el.value = value;
}

function checkDraft() {
    var d = localStorage.getItem('ps21_draft');
    if (d) {
        try {
            var data = JSON.parse(d);
            if (confirm('Ditemukan draft. Lanjutkan?')) {
                loadDraftData(data);
                showDraftStatus('draft');
            } else {
                localStorage.removeItem('ps21_draft');
            }
        } catch (e) { localStorage.removeItem('ps21_draft'); }
    }
}

function loadDraftData(data) {
    setVal('film-id', data.id || '');
    setVal('film-type', data.type || 'movie');
    setVal('film-title', data.title || '');
    setVal('film-slug', data.slug || '');
    setVal('film-year', data.year || '');
    setVal('film-rating', data.rating || '');
    setVal('film-duration', data.duration || '');
    setVal('film-genre', data.genre || '');
    setVal('film-synopsis', data.synopsis || '');
    setVal('film-director', data.director || '');
    setVal('film-cast', data.cast || '');
    setVal('film-poster', data.poster || '');
    setVal('film-backdrop', data.backdrop || '');
    if (data.type === 'series') {
        if (typeof toggleSeriesPanel === 'function') toggleSeriesPanel();
        loadEpisodes(data.embed_url);
    } else {
        setVal('film-embed', data.embed_url || '');
    }
    setVal('film-download', data.download_url || '');
    setVal('film-mirror', data.mirror_url || '');
    setVal('film-subtitle', data.subtitle_url || '');
    setVal('film-trailer', data.trailer || '');
    document.getElementById('film-featured').checked = data.featured === 'TRUE';
    document.getElementById('film-popular').checked = data.popular === 'TRUE';
    if (data.poster) showPreview(document.getElementById('poster-preview'), data.poster);
    if (data.backdrop) showPreview(document.getElementById('backdrop-preview'), data.backdrop);
}

function showDraftStatus(status) {
    var el = document.getElementById('draft-status');
    if (!el) return;
    if (status === 'draft') {
        el.style.display = 'block';
        el.className = 'draft-status draft';
        el.textContent = 'Status: Draft (lokal)';
    } else if (status === 'published') {
        el.style.display = 'block';
        el.className = 'draft-status published';
        el.textContent = 'Status: Dirilis';
    } else {
        el.style.display = 'none';
    }
}

// =============================================
// SUBMIT FILM - DEBUG FULL
// =============================================
async function submitFilm(action) {
    try {
        console.log('=== SUBMIT:', action, '===');
        
        var idField = document.getElementById('film-id');
        var id = idField ? idField.value.trim() : '';
        if (!id) id = document.getElementById('original-id').value.trim();
        console.log('ID:', id);
        
        if (!id) { showToast('ID diperlukan!', 'error'); return; }

        var data = {
            id: id,
            title: document.getElementById('film-title').value.trim(),
            slug: document.getElementById('film-slug').value.trim(),
            type: document.getElementById('film-type').value,
            year: document.getElementById('film-year').value,
            rating: document.getElementById('film-rating').value,
            duration: document.getElementById('film-duration').value.trim(),
            genre: document.getElementById('film-genre').value.trim(),
            synopsis: document.getElementById('film-synopsis').value.trim(),
            director: document.getElementById('film-director').value.trim(),
            cast: document.getElementById('film-cast').value.trim(),
            poster: document.getElementById('film-poster').value.trim(),
            backdrop: document.getElementById('film-backdrop').value.trim(),
            embed_url: (function() {
                var type = document.getElementById('film-type').value;
                if (type === 'series') {
                    var eps = getEpisodes();
                    return eps.length > 0 ? JSON.stringify(eps) : '[]';
                }
                return document.getElementById('film-embed').value.trim();
            })(),
            download_url: document.getElementById('film-download').value.trim(),
            mirror_url: document.getElementById('film-mirror').value.trim(),
            subtitle_url: document.getElementById('film-subtitle').value.trim(),
            trailer: document.getElementById('film-trailer').value.trim(),
            featured: document.getElementById('film-featured').checked ? 'TRUE' : 'FALSE',
            popular: document.getElementById('film-popular').checked ? 'TRUE' : 'FALSE',
            status: action === 'publish' ? 'published' : 'draft'
        };
        
        console.log('DATA OK');
        
        if (!data.title) { showToast('Judul wajib diisi!', 'error'); return; }
        
        console.log('TITLE OK');
        
        // DRAFT
        if (action === 'draft') {
            console.log('MASUK DRAFT');
            localStorage.setItem('ps21_draft', JSON.stringify(data));
            showDraftStatus('draft');
            showToast('Draft tersimpan!', 'info');
            return;
        }
        
        console.log('MASUK RILIS');
        
        var btn = document.getElementById('btn-publish');
        console.log('BTN:', btn);
        
        if (btn) {
            btn.textContent = '⏳...';
            btn.disabled = true;
        }
        
        console.log('BTN DISABLED');
        
        var mode = document.getElementById('form-mode').value || 'add';
        console.log('MODE:', mode);
        
        console.log('Mulai fetch...');
        
        var res;
        if (mode === 'edit') {
            console.log('FETCH UPDATE');
            res = await DASHBOARD_API.update(data);
        } else {
            console.log('FETCH ADD');
            res = await DASHBOARD_API.add(data);
        }
        
        console.log('Response:', JSON.stringify(res));
        
        if (res.status === 'success') {
            localStorage.removeItem('ps21_draft');
            showDraftStatus('published');
            showToast('Berhasil dirilis!', 'success');
            setTimeout(function() { window.location.href = 'index.html'; }, 1500);
        } else {
            showToast('' + (res.message || 'Gagal'), 'error');
        }
        
        if (btn) {
            btn.textContent = 'Rilis';
            btn.disabled = false;
        }
        
    } catch (e) {
        console.error('ERROR BESAR:', e.message);
        console.error('STACK:', e.stack);
        showToast('Error: ' + e.message, 'error');
        
        var btn = document.getElementById('btn-publish');
        if (btn) {
            btn.textContent = 'Rilis';
            btn.disabled = false;
        }
    }
}

async function deleteFilm() {
    var id = document.getElementById('original-id').value;
    if (!id) return;
    if (!confirm('Yakin hapus "' + id + '"?')) return;
    try {
        var res = await DASHBOARD_API.delete(id);
        if (res.status === 'success') {
            localStorage.removeItem('ps21_draft');
            showToast('Dihapus!', 'success');
            setTimeout(function() { window.location.href = 'index.html'; }, 1000);
        } else showToast('' + (res.message || 'Gagal'), 'error');
    } catch (e) { showToast('Gagal', 'error'); }
}

if (document.getElementById('table-body')) {
    document.addEventListener('DOMContentLoaded', function() { setupFilters(); loadDashboard(); });
}
// =============================================
// EPISODE MANAGEMENT (SERIES)
// =============================================
var episodeCount = 0;

function addEpisode(data) {
    episodeCount++;
    var ep = episodeCount;
    var container = document.getElementById('episode-list');
    if (!container) return;

    var div = document.createElement('div');
    div.className = 'episode-item';
    div.dataset.ep = ep;
    div.innerHTML = [
        '<div class="episode-item-header">',
        '  <span class="episode-num">Episode ' + ep + '</span>',
        '  <button type="button" class="episode-remove" onclick="removeEpisode(this)" title="Hapus episode">',
        '    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        '  </button>',
        '</div>',
        '<div class="episode-fields">',
        '  <div><label>URL Embed</label><input type="text" class="ep-embed" placeholder="https://doodstream.com/e/..." value="' + (data && data.embed ? escapeAttr(data.embed) : '') + '"></div>',
        '  <div><label>URL Download</label><input type="text" class="ep-download" placeholder="https://..." value="' + (data && data.download ? escapeAttr(data.download) : '') + '"></div>',
        '  <div><label>URL Mirror</label><input type="text" class="ep-mirror" placeholder="https://..." value="' + (data && data.mirror ? escapeAttr(data.mirror) : '') + '"></div>',
        '  <div><label>URL Subtitle</label><input type="text" class="ep-subtitle" placeholder="https://..." value="' + (data && data.subtitle ? escapeAttr(data.subtitle) : '') + '"></div>',
        '</div>'
    ].join('');

    container.appendChild(div);
    renumberEpisodes();
}

function removeEpisode(btn) {
    var item = btn.closest('.episode-item');
    if (item) item.remove();
    renumberEpisodes();
}

function renumberEpisodes() {
    var items = document.querySelectorAll('.episode-item');
    items.forEach(function(item, i) {
        var numEl = item.querySelector('.episode-num');
        if (numEl) numEl.textContent = 'Episode ' + (i + 1);
        item.dataset.ep = i + 1;
    });
    episodeCount = items.length;
}

function getEpisodes() {
    var items = document.querySelectorAll('.episode-item');
    var episodes = [];
    items.forEach(function(item, i) {
        episodes.push({
            ep: i + 1,
            embed:    item.querySelector('.ep-embed')?.value.trim()    || '',
            download: item.querySelector('.ep-download')?.value.trim() || '',
            mirror:   item.querySelector('.ep-mirror')?.value.trim()   || '',
            subtitle: item.querySelector('.ep-subtitle')?.value.trim() || ''
        });
    });
    return episodes;
}

function loadEpisodes(jsonStr) {
    var container = document.getElementById('episode-list');
    if (!container) return;
    container.innerHTML = '';
    episodeCount = 0;
    if (!jsonStr) return;
    try {
        var episodes = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
        if (!Array.isArray(episodes)) return;
        episodes.forEach(function(ep) { addEpisode(ep); });
    } catch (e) {
        // kalau bukan JSON, berarti movie biasa — skip
    }
}

function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
