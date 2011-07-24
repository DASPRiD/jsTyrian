/**
 * @author    Ben Scholzen <mail@dasprids.de>
 * @copyright Copyright (c) 2011, Ben Scholzen
 */

(function(Tyrian){
    /**
     * Screen constructor.
     *
     * @param   {Tyrian.Main} main
     * @returns {Tyrian.Screen}
     */
    Tyrian.Screen = function(main)
    {
        this.main      = main;
        this.context   = main.context;
        this.imageData = this.context.createImageData(640, 400);
        this.palette   = [{r: 0, g: 0, b: 0}];
        this.data      = [];
        
        for (i = 0; i < (320 * 200); i++) {
            this.data[i] = 0;
        }
        
        this.redraw();
    }

    Tyrian.Screen.prototype.setPalette = function(palette)
    {
        this.palette = palette;
        
        this.redraw();
    }
    
    Tyrian.Screen.prototype.redraw = function()
    {
        var color, x, y, idx, idy;

        for (x = 0; x < 640; x++) {
            for (y = 0; y < 400; y++) {
                idx = (x + y * 640) * 4;
                idy = (Math.floor(x / 2) + Math.floor(y / 2) * 320);
                
                color = this.palette[this.data[idy]];
                
                this.imageData.data[idx]     = color.r;
                this.imageData.data[idx + 1] = color.g;
                this.imageData.data[idx + 2] = color.b;
                this.imageData.data[idx + 3] = 255;
            }
        }

        this.context.putImageData(this.imageData, 0, 0);
    }
})(window['Tyrian']);
