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
    tableBody.innerHTML = '<tr><td colspan="10" class="table-loading">⏳ Memuat data...</td></tr>';
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
        if (allFilms.length > 0) showToast('✅ ' + allFilms.length + ' film dimuat', 'success');
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
        tbody.innerHTML = '<tr><td colspan="10" class="table-loading">📭 Tidak ada film</td></tr>';
        return;
    }
    var start = (currentPage - 1) * perPage;
    var end = Math.min(start + perPage, filteredFilms.length);
    var pageFilms = filteredFilms.slice(start, end);
    var html = '';
    for (var i = 0; i < pageFilms.length; i++) {
        var film = pageFilms[i];
        var genres = parseGenres(film.genre);
        var statusBadge = film.status === 'draft' ? ' <span style="background:#f39c12;color:#000;font-size:0.6rem;padding:2px 6px;border-radius:3px;">DRAFT</span>' : '';
        html += '<tr>';
        html += '<td>' + (start + i + 1) + '</td>';
        if (film.poster) {
            html += '<td><img src="' + film.poster + '" class="table-poster" loading="lazy" onerror="this.style.display=\'none\'"></td>';
        } else {
            html += '<td><div class="table-poster" style="background:#1a1a26;">—</div></td>';
        }
        html += '<td><div class="table-title">' + (film.title || '—') + statusBadge + '</div><small style="color:#555570;">' + (film.id || '—') + '</small></td>';
        html += '<td><span class="table-type ' + (film.type || 'movie') + '">' + (film.type || 'movie') + '</span></td>';
        html += '<td>' + (film.year || '—') + '</td>';
        html += '<td>' + (genres.length > 0 ? genres.join(', ') : '—') + '</td>';
        html += '<td>' + (film.rating ? '<span class="table-rating">★ ' + film.rating + '</span>' : '—') + '</td>';
        html += '<td><span class="table-badge ' + (film.featured === 'TRUE' ? 'yes' : 'no') + '">' + (film.featured === 'TRUE' ? '⭐' : '—') + '</span></td>';
        html += '<td><span class="table-badge ' + (film.popular === 'TRUE' ? 'yes' : 'no') + '">' + (film.popular === 'TRUE' ? '🔥' : '—') + '</span></td>';
        html += '<td><div class="table-actions">';
        html += '<a href="editor.html?id=' + encodeURIComponent(film.id) + '" class="admin-btn admin-btn-sm admin-btn-secondary">✏️</a>';
        html += '<button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteFilmById(\'' + film.id.replace(/'/g, "\\'") + '\')">🗑️</button>';
        html += '</div></td></tr>';
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
        if (res.status === 'success') { showToast('✅ Dihapus!', 'success'); loadDashboard(); }
        else showToast('❌ ' + (res.message || 'Gagal'), 'error');
    } catch (e) { showToast('❌ Gagal', 'error'); }
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
        document.getElementById('page-title').textContent = '✏️ Edit Film';
        document.getElementById('form-mode').value = 'edit';
        document.getElementById('original-id').value = filmId;
        document.getElementById('btn-delete').style.display = 'inline-flex';
        document.getElementById('film-id').readOnly = true;
        await loadFilmData(filmId);
    } else {
        document.getElementById('page-title').textContent = '➕ Tambah Film';
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
        if (res.status !== 'success' || !res.data) { showToast('❌ Tidak ditemukan', 'error'); return; }
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
        setVal('film-embed', f.embed_url);
        setVal('film-download', f.download_url);
        setVal('film-mirror', f.mirror_url);
        setVal('film-subtitle', f.subtitle_url);
        setVal('film-trailer', f.trailer);
        document.getElementById('film-featured').checked = f.featured === 'TRUE';
        document.getElementById('film-popular').checked = f.popular === 'TRUE';
        if (f.poster) showPreview(document.getElementById('poster-preview'), f.poster);
        if (f.backdrop) showPreview(document.getElementById('backdrop-preview'), f.backdrop);
        showToast('✅ Data dimuat', 'success');
    } catch (e) { showToast('❌ Gagal', 'error'); }
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
        if (file.size > 5 * 1024 * 1024) { showToast('❌ Maks 5MB', 'error'); return; }

        // Cari tombol upload yang sesuai dan disable
        var btn = input.parentElement ? input.parentElement.querySelector('.media-upload-btn') : null;
        if (btn) { btn.disabled = true; btn.innerHTML = '⏳'; }
        showToast('⏳ Mengupload gambar...', 'info');

        try {
            var result = await DASHBOARD_API.uploadImage(file);
            if (result.status === 'success' && result.url) {
                input.value = result.url;
                var preview = document.getElementById(previewId);
                if (preview) showPreview(preview, result.url);
                showToast('✅ Upload berhasil!', 'success');
            } else {
                showToast('❌ ' + (result.message || 'Gagal upload'), 'error');
            }
        } catch (err) {
            showToast('❌ Error: ' + err.message, 'error');
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
            if (confirm('📝 Ditemukan draft. Lanjutkan?')) {
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
    setVal('film-embed', data.embed_url || '');
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
        el.textContent = '📝 Status: Draft (lokal)';
    } else if (status === 'published') {
        el.style.display = 'block';
        el.className = 'draft-status published';
        el.textContent = '✅ Status: Dirilis';
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
        
        if (!id) { showToast('❌ ID diperlukan!', 'error'); return; }

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
            embed_url: document.getElementById('film-embed').value.trim() || 'https://example.com/test',
            download_url: document.getElementById('film-download').value.trim(),
            mirror_url: document.getElementById('film-mirror').value.trim(),
            subtitle_url: document.getElementById('film-subtitle').value.trim(),
            trailer: document.getElementById('film-trailer').value.trim(),
            featured: document.getElementById('film-featured').checked ? 'TRUE' : 'FALSE',
            popular: document.getElementById('film-popular').checked ? 'TRUE' : 'FALSE',
            status: action === 'publish' ? 'published' : 'draft'
        };
        
        console.log('DATA OK');
        
        if (!data.title) { showToast('❌ Judul wajib diisi!', 'error'); return; }
        
        console.log('TITLE OK');
        
        // DRAFT
        if (action === 'draft') {
            console.log('MASUK DRAFT');
            localStorage.setItem('ps21_draft', JSON.stringify(data));
            showDraftStatus('draft');
            showToast('💾 Draft tersimpan!', 'info');
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
        
        console.log('📡 Mulai fetch...');
        
        var res;
        if (mode === 'edit') {
            console.log('FETCH UPDATE');
            res = await DASHBOARD_API.update(data);
        } else {
            console.log('FETCH ADD');
            res = await DASHBOARD_API.add(data);
        }
        
        console.log('📥 Response:', JSON.stringify(res));
        
        if (res.status === 'success') {
            localStorage.removeItem('ps21_draft');
            showDraftStatus('published');
            showToast('🚀 BERHASIL!', 'success');
            setTimeout(function() { window.location.href = 'index.html'; }, 1500);
        } else {
            showToast('❌ ' + (res.message || 'Gagal'), 'error');
        }
        
        if (btn) {
            btn.textContent = '🚀 Rilis';
            btn.disabled = false;
        }
        
    } catch (e) {
        console.error('❌ ERROR BESAR:', e.message);
        console.error('❌ STACK:', e.stack);
        showToast('❌ Error: ' + e.message, 'error');
        
        var btn = document.getElementById('btn-publish');
        if (btn) {
            btn.textContent = '🚀 Rilis';
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
            showToast('✅ Dihapus!', 'success');
            setTimeout(function() { window.location.href = 'index.html'; }, 1000);
        } else showToast('❌ ' + (res.message || 'Gagal'), 'error');
    } catch (e) { showToast('❌ Gagal', 'error'); }
}

if (document.getElementById('table-body')) {
    document.addEventListener('DOMContentLoaded', function() { setupFilters(); loadDashboard(); });
}