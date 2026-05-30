// =============================================
// PIRATE STUDIO 21 - LOAD MORE (PAGINATED)
// =============================================
var LOAD_MORE = {
    _state: {
        offset: 0,
        limit: 9,
        total: 0,
        isLoading: false
    },

    // Mode lama (client-side) — masih dipakai di genre.html & search.html
    init: function(containerId, allData, limit) {
        limit = limit || 9;
        this._state = { offset: 0, limit: limit, total: allData.length, allData: allData, containerId: containerId, isLoading: false, mode: 'client' };
        this.renderInitial();
        this.renderButton();
    },

    renderInitial: function() {
        var state = this._state;
        var container = document.getElementById(state.containerId);
        if (!container) return;
        var initialData = state.allData.slice(0, state.limit);
        state.offset = state.limit;
        if (!initialData.length) { container.innerHTML = UTILS.emptyHTML('Belum ada film'); return; }
        container.innerHTML = '';
        for (var i = 0; i < initialData.length; i++) container.innerHTML += COMPONENTS.filmCard(initialData[i], i);
    },

    loadMore: function() {
        var state = this._state;
        if (state.isLoading) return;
        if (state.mode === 'server') { this._loadMoreServer(); return; }
        this._loadMoreClient();
    },

    _loadMoreClient: function() {
        var state = this._state;
        state.isLoading = true;
        var container = document.getElementById(state.containerId);
        var self = this;
        this._btnLoading(true);
        setTimeout(function() {
            var nextData = state.allData.slice(state.offset, state.offset + state.limit);
            state.offset += state.limit;
            for (var i = 0; i < nextData.length; i++) container.insertAdjacentHTML('beforeend', COMPONENTS.filmCard(nextData[i], i));
            state.isLoading = false;
            self.renderButton();
        }, 300);
    },

    // Mode baru (server/paginated) — dipakai di home
    initPaginated: function(total, limit) {
        limit = limit || 9;
        this._state = {
            offset: limit, // sudah render batch pertama
            limit: limit,
            total: total,
            isLoading: false,
            mode: 'server'
        };
        this.renderButton();
    },

    _loadMoreServer: async function() {
        var state = this._state;
        if (state.isLoading || state.offset >= state.total) return;
        state.isLoading = true;
        this._btnLoading(true);

        try {
            var res = await API.getLatest(state.limit, state.offset);
            var container = document.getElementById('latest-grid');
            if (res.status === 'success' && res.data && container) {
                var startIndex = state.offset;
                for (var i = 0; i < res.data.length; i++) {
                    container.insertAdjacentHTML('beforeend', COMPONENTS.filmCard(res.data[i], startIndex + i));
                }
                state.offset += res.data.length;
                // Update total jika AppScript kirim info terbaru
                if (res.total) state.total = res.total;
            }
        } catch(e) { console.error(e); }

        state.isLoading = false;
        this.renderButton();
    },

    renderButton: function() {
        var state = this._state;
        var btnContainer = document.getElementById('load-more-container');
        if (!btnContainer) return;
        if (state.offset >= state.total) {
            btnContainer.innerHTML = state.total > 0
                ? '<div class="load-more-info">' + icon('check-circle', '14') + ' Semua ' + state.total + ' film sudah ditampilkan</div>'
                : '';
            return;
        }
        var remaining = state.total - state.offset;
        btnContainer.innerHTML = '<button id="load-more-btn" class="load-more-btn" onclick="LOAD_MORE.loadMore()">'
            + icon('chevron-down', '16') + ' Muat Lebih Banyak <span style="color:var(--text3,#555570);font-size:0.75rem;">(' + remaining + ' tersisa)</span></button>';
    },

    _btnLoading: function(on) {
        var btn = document.getElementById('load-more-btn');
        if (!btn) return;
        if (on) {
            btn.innerHTML = '<div style="width:16px;height:16px;border:2px solid rgba(255,255,255,0.2);border-top-color:#fff;border-radius:50%;animation:spin 0.6s linear infinite;display:inline-block;vertical-align:middle;margin-right:6px;"></div> Memuat...';
            btn.disabled = true;
        }
    }
};
