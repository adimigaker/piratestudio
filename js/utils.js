// =============================================
// PIRATE STUDIO 21 - UTILITY FUNCTIONS
// =============================================
var UTILS = {
    parseGenres: function(str) {
        if (!str) return [];
        return str.split(',').map(function(g) { return g.trim(); }).filter(Boolean);
    },

    truncate: function(text, max) {
        max = max || 150;
        if (!text) return '';
        return text.length > max ? text.substring(0, max) + '...' : text;
    },

    getParam: function(param) {
        var urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    },

    spinner: function() {
        return '<div class="loading-container"><div class="spinner-lg"></div><p class="loading-text">Memuat...</p></div>';
    },

    errorHTML: function(msg) {
        return '<div class="error-container"><div class="error-icon">' + icon('alert', '48') + '</div><p class="error-msg">' + msg + '</p><button class="btn-retry" onclick="location.reload()">' + icon('refresh', '14') + ' Coba Lagi</button></div>';
    },

    emptyHTML: function(msg) {
        return '<div class="empty-container"><div class="empty-icon">' + icon('folder', '48') + '</div><p class="empty-msg">' + msg + '</p></div>';
    },

    escapeHtml: function(str) {
        if (!str) return '';
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
};
