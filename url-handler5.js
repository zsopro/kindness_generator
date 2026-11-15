// url-handler.js
export const URLHandler = {
    // YouTube ID kinyerése
    parseYouTubeID: (url) => {
        if (!url) return '';
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[7].length === 11) ? match[7] : url;
    },

    // Kép URL ellenőrzése / tisztítása (ha később kellene)
    cleanImageURL: (url) => {
        return url ? url.trim() : '';
    }
};
