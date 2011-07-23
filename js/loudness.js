/**
 * @author    Ben Scholzen <mail@dasprids.de>
 * @copyright Copyright (c) 2011, Ben Scholzen
 */

(function(Tyrian){
    /**
     * Loudness constructor.
     *
     * @param   {Tyrian.Main} main
     * @returns {Tyrian.Loudness}
     */
    Tyrian.Loudness = function(main)
    {
        this.main        = main;
    }
    
    Tyrian.Loudness.prototype.load = function(view, songOffset, songSize)
    {
        view.seek(songOffset);
        
        var mode = view.getUint8();
        
        if (mode > 2) {
            throw 'Error: failed to load music';
        }
        
        var i, j;
        var speed   = view.getUint16();
        var tempo   = view.getUint8();
        var pattlen = view.getUint8();
        
        this.chandelay = [];
        
        for (i = 0; i < 9; i++) {
            this.chandelay[i] = view.getUint8();
        }
        
        var regbd     = view.getUint8();
        var numpatch  = view.getUint16();
        var soundbank = {};
        
        for (i = 0; i < numpatch; i++) {
            var sb = {};
            sb.modMisc    = view.getUint8();
            sb.modVol     = view.getUint8();
            sb.modAd      = view.getUint8();
            sb.modSr      = view.getUint8();
            sb.modWave    = view.getUint8();
            sb.carMisc    = view.getUint8();
            sb.carVol     = view.getUint8();
            sb.carAd      = view.getUint8();
            sb.carSr      = view.getUint8();
            sb.carWave    = view.getUint8();
            sb.feedback   = view.getUint8();
            sb.keyoff     = view.getUint8();
            sb.portamento = view.getUint8();
            sb.glide      = view.getUint8();
            sb.finetune   = view.getUint8();
            sb.vibrator   = view.getUint8();
            sb.vibdelay   = view.getUint8();
            sb.modTrem    = view.getUint8();
            sb.carTrem    = view.getUint8();
            sb.tremwait   = view.getUint8();
            sb.arpeggio   = view.getUint8();
            sb.arpTab     = [];
            
            for (j = 0; j < 12; j++) {
                sb.arpTab[j] = view.getUint8();
            }
            
            sb.start    = view.getUint16();
            sb.size     = view.getUint16();
            sb.fms      = view.getUint8();
            sb.transp   = view.getUint16();
            sb.midinst  = view.getUint8();
            sb.midvelo  = view.getUint8();
            sb.midkey   = view.getUint8();
            sb.midtrans = view.getUint8();
            sb.midnum1  = view.getUint8();
            sb.midnum2  = view.getUint8();
            
            soundbank[i] = sb;
        }
        
        var numposi   = view.getUint16();
        var positions = [];
        
        for (i = 0; i < numposi; i++) {
            for (j = 0; j < 9; j++) {               
                positions[i * 9 + j] = {
                    patnum:    view.getUint16() / 2,
                    transpose: view.getUint8()
                };
            }
        }
        
        view.getUint16();
        
        var remaining = songSize - (view.tell() - songOffset);
        var patterns  = [];
        
        for (i = 0; i < remaining / 2; i++) {
            patterns[i] = view.getUint16();
        }
        
        this.rewind();
    }
    
    Tyrian.Loudness.prototype.rewind = rewind()
    {
        var i;
        
        this.tempoNow   = 3;
        this.playing    = true;
        this.songlooped = false;
        this.jumping = this.fadeonoff = this.allvolume = this.hardfade = this.pattplay = this.posplay = this.jumppos = this.mainvolume = 0;
    }
})(window['Tyrian']);
