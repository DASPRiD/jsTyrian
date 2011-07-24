/**
 * @author    Ben Scholzen <mail@dasprids.de>
 * @copyright Copyright (c) 2011, Ben Scholzen
 */

(function(Tyrian){
    /**
     * Palette constructor.
     *
     * @param   {Tyrian.Main} main
     * @returns {Tyrian.Palette}
     */
    Tyrian.Palette = function(main)
    {
        this.main     = main;
        this.palettes = [];
        this.palette  = [];
        this.pcxpal   = [0, 7, 5, 8, 10, 5, 18, 19, 19, 20, 21, 22, 5];
        
        var data   = this.main.getDataFile('palette.dat');
        var view   = new jDataView(data);
        var length = data.length;
        
        var paletteCount = length / (256 * 3);
        
        for (var p = 0; p < paletteCount; p++) {
            this.palettes[p] = [];
            
            for (var i = 0; i < 256; i++) {
                this.palettes[p][i] = {
                    r: view.getUint8() << 2,
                    g: view.getUint8() << 2,
                    b: view.getUint8() << 2
                };
            }
        }
        
        this.setPalette(this.palettes[this.pcxpal[3-1]], 0, 255);
    }

    Tyrian.Palette.prototype.setPalette = function(colors, firstColor, lastColor)
    {
        for (var i = firstColor; i <= lastColor; i++) {
            this.palette[i] = colors[i];
        }
    }

    Tyrian.Palette.prototype.initStepFadePalette = function(diff, colors, firstColor, lastColor)
    {
        for (var i = firstColor; i <= lastColor; i++) {
            diff[i][0] = colors[i].r - this.palette[i].r;
            diff[i][1] = colors[i].g - this.palette[i].g;
            diff[i][2] = colors[i].b - this.palette[i].b;
        }
        
        return diff;
    }
    
    Tyrian.Palette.prototype.initStepFadePalette = function(diff, color, firstColor, lastColor)
    {
        for (var i = firstColor; i <= lastColor; i++) {
            diff[i][0] = color.r - this.palette[i].r;
            diff[i][1] = color.g - this.palette[i].g;
            diff[i][2] = color.b - this.palette[i].b;
        }
        
        return diff;
    }
    
    Tyrian.Palette.prototype.stepFadePalette = function(diff, steps, firstColor, lastColor)
    {
        for (var i = firstColor; i <= lastColor; i++) {
            var delta = [
                Math.floor(diff[i][0] / steps),
                Math.floor(diff[i][1] / steps),
                Math.floor(diff[i][2] / steps)
            ];
            
            diff[i][0] -= delta[0];
            diff[i][1] -= delta[1];
            diff[i][2] -= delta[2];
            
            this.palette[i].r += delta[0];
            this.palette[i].g += delta[1];
            this.palette[i].b += delta[2];

            
        }
        
        return diff;
    }

    /**
     * Fade solid.
     *
     * @param   {Array}   color
     * @param   {Integer} steps
     * @param   {Integer} firstColor
     * @param   {Integer} lastColor
     * @param   {Function} callback
     * @returns {void}
     */
    Tyrian.Palette.prototype.fadeSolid = function(color, steps, firstColor, lastColor, callback)
    {
        var context = this.main.context;
        
        var diff = [];
        
        for (var i = 0; i < 256; i++) {
            diff[i] = [];
        }
        
        diff = this.initStepFadePalette(diff, color, firstColor, lastColor);
        
        var palette = this;
        
        var stepFade = function(){
            palette.stepFadePalette(diff, steps, firstColor, lastColor);
            
            steps--;
            
            if (steps > 0) {
                window.setTimeout(function(){
                    stepFade();
                }, 16);
            } else {
                callback();
            }
        }
    }   

    /**
     * Fade to black.
     *
     * @param   {Integer} steps
     * @param   {Function} callback
     * @returns {void}
     */
    Tyrian.Palette.prototype.fadeBlack = function(steps, callback)
    {
        this.fadeSolid({r: 0, g: 0, b: 0}, steps, 0, 255, callback);
    }    

    /**
     * Fade to white.
     *
     * @param   {Integer}  steps
     * @param   {Function} callback
     * @returns {void}
     */
    Tyrian.Palette.prototype.fadeWhite = function(steps, callback)
    {
        this.fadeSolid({r: 255, g: 255, b: 255}, steps, 0, 255, callback);
    }    
})(window['Tyrian']);
