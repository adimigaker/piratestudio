// =============================================
// PIRATE STUDIO 21 - LOAD MORE SYSTEM
// =============================================
var LOAD_MORE = {
    _state: {
        offset: 0,
        limit: 9,
        total: 0,
        allData: [],
        containerId: '',
        isLoading: false
    },

    init: function(containerId, allData, limit) {
        limit = limit || 9;
        this._state = {
            offset: 0,
            limit: limit,
            total: allData.length,
            allData: allData,
            containerId: containerId,
            isLoading: false
        };
        this.renderInitial();
        this.renderButton();
    },

    renderInitial: function() {
        var state = this._state;
        var container = document.getElementById(state.containerId);
        if (!container) return;

        var initialData = state.allData.slice(0, state.limit);
        state.offset = state.limit;

        if (initialData.length === 0) {
            container.innerHTML = UTILS.emptyHTML('Belum ada film');
            return;
        }

        container.innerHTML = '';
        for (var i = 0; i < initialData.length; i++) {
            container.innerHTML += COMPONENTS.filmCard(initialData[i], i);
        }
    },

    loadMore: function() {
        var state = this._state;
        if (state.isLoading) return;
        state.isLoading = true;

        var container = document.getElementById(state.containerId);
        var btn = document.getElementById('load-more-btn');

        if (btn) {
            btn.innerHTML = '<div style="width:18px;height:18px;border:2px solid rgba(255,255,255,0.2);border-top-color:#fff;border-radius:50%;animation:spin 0.6s linear infinite;display:inline-block;"></div> Memuat...';
            btn.disabled = true;
        }

        var self = this;
        setTimeout(function() {
            var nextData = state.allData.slice(state.offset, state.offset + state.limit);
            state.offset += state.limit;

            for (var i = 0; i < nextData.length; i++) {
                container.insertAdjacentHTML('beforeend', COMPONENTS.filmCard(nextData[i], i));
            }

            state.isLoading = false;
            self.renderButton();
        }, 400);
    },

    renderButton: function() {
        var state = this._state;
        var btnContainer = document.getElementById('load-more-container');
        if (!btnContainer) return;

        if (state.offset >= state.total) {
            btnContainer.innerHTML = '<div class="load-more-info">' + icon('check-circle', '14') + ' Semua film sudah ditampilkan (' + state.total + ' film)</div>';
            return;
        }

        var remaining = state.total - state.offset;
        btnContainer.innerHTML = '<button id="load-more-btn" class="load-more-btn" onclick="LOAD_MORE.loadMore()">' + icon('chevron-down', '16') + ' Muat Lebih Banyak <span style="color:var(--text3);font-size:0.75rem;">(' + remaining + ' tersisa)</span></button>';
    }
};