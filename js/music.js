/**
 * @author    Ben Scholzen <mail@dasprids.de>
 * @copyright Copyright (c) 2011, Ben Scholzen
 */

(function(Tyrian){
    /**
     * Music constructor.
     *
     * @param   {Tyrian.Main} main
     * @returns {Tyrian.Music}
     */
    Tyrian.Music = function(main)
    {
        var data   = main.getDataFile('music.mus');
        var view   = new jDataView(data);
        var length = data.length;

        this.main        = main;
        this.view        = view;
        this.songCount   = view.getUint16();
        this.songOffsets = [];
            
        for (var i = 0; i < this.songCount; i++) {
            this.songOffsets[i] = view.getUint32();
        }
            
        this.songOffsets[this.songCount] = length;
    }
    
    Tyrian.Music.prototype.loadSong(songNum)
    {
        if (songNum < this.songCount) {
            var songSize = this.songOffsets[songNum + 1] - this.songOffsets[songNum];
            
            this.main.loudness.load(this.view, this.songOffsets[songNum], songSize);
        }
    }
})(window['Tyrian']);
