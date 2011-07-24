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
        this.canvas    = main.canvas;
        this.context   = main.context;
        this.imageData = this.context.createImageData(320, 200);
        this.palette   = [{r: 0, g: 0, b: 0}];
        this.data      = [];
        
        for (var i = 0; i < (320 * 200); i++) {
            this.data[i] = 0;
            this.imageData.data[i * 4 + 3] = 255;
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
        var color, idx;

        for (var i = 0; i < (320 * 200); i++) {
            idx   = i * 4;
            color = this.palette[this.data[i]];

            this.imageData.data[idx]     = color.r;
            this.imageData.data[idx + 1] = color.g;
            this.imageData.data[idx + 2] = color.b;
        }

        this.context.putImageData(this.imageData, 0, 0);
        this.context.drawImage(this.canvas, 0, 0, 320 * 4, 200 * 4);
    }
})(window['Tyrian']);
