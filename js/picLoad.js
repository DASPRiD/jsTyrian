/**
 * @author    Ben Scholzen <mail@dasprids.de>
 * @copyright Copyright (c) 2011, Ben Scholzen
 */

(function(Tyrian){
    /**
     * Pic loader constructor.
     *
     * @param   {Tyrian.Main} main
     * @returns {Tyrian.Palette}
     */
    Tyrian.PicLoad = function(main)
    {
        this.main   = main;
        this.first  = true;
        this.pcxNum = 13;
        this.pcxPos = [];
    }

    /**
     * Load a pic.
     *
     * @param   {Integer} pcxNumber
     * @param   {Boolean} storePal
     * @returns {void}
     */
    Tyrian.PicLoad.prototype.loadPic = function(pcxNumber, storePal)
    {
        pcxNumber--;
        
        var data   = this.main.getDataFile('tyrian.pic');
        var view   = new jDataView(data);
        var length = data.length;
        var i;
        
        if (this.first) {
            this.first = false;
            
            view.getUint16();
            
            for (i = 0; i < this.pcxNum; i++) {
                this.pcxPos[i] = view.getUint32();
            }
            
            this.pcxPos[this.pcxNum] = length;
        }
        
        var size   = this.pcxPos[pcxNumber + 1] - this.pcxPos[pcxNumber];
        var buffer = [];
        
        view.seek(this.pcxPos[pcxNumber]);
        
        for (i = 0; i < size; i++) {
            buffer.push(view.getUint8());
        }
        
        var palette = this.main.palette.palettes[this.main.palette.pcxpal[pcxNumber]];
        var screen  = this.main.screen;
        var color, p, currentI, j, v;
        
        for (i = 0, p = 0; i < (320 * 200); ) {
            currentI = i;
            v        = buffer[p];
            
            if ((v & 0xc0) == 0xc0) {
                i += (v & 0x3f);
                v = buffer[p + 1];
                p += 2;
            } else {               
                i++;
                p++;
            }

            
            color = palette[v];

            for (j = currentI; j < i; j++) {
                screen.data[j] = v;
            }
        }
        
        screen.setPalette(palette);
    }
})(window['Tyrian']);
