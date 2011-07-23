/**
 * @author    Ben Scholzen <mail@dasprids.de>
 * @copyright Copyright (c) 2011, Ben Scholzen
 */

(function(Tyrian){   
    /**
     * Sprites constructor.
     *
     * @param   {Tyrian.Main} main
     * @param   {String}      filename
     * @returns {Tyrian.Sprites}
     */
    Tyrian.Sprites = function(main, filename)
    {
        this.shpNum      = 12;
        this.spriteTable = [];
        this.shapes      = {
            'C1': {},
            '9':  {},
            '6':  {},
            '5':  {},
            'W2': {}
        };
        
        var data   = main.getDataFile(filename);
        var view   = new jDataView(data);
        var length = data.length;
        
        var shpNumb = view.getUint16();
        var shpPos  = [];

        for (var i = 0; i < shpNumb; i++) {
            shpPos[i] = view.getUint32();
        }

        shpPos[shpNumb] = length;

        // Fonts, interface, option sprites
        for (i = 0; i < 7; i++) {
            view.seek(shpPos[i]);
            this.loadSprites(i, view);
        }

        // Player shot sprites
        this.shapes['C1'].size = shpPos[i + 1] - shpPos[i];
        this.loadCompShapesB('C1', view);
        i++;

        // Player ship sprites
        this.shapes['9'].size = shpPos[i + 1] - shpPos[i];
        this.loadCompShapesB('9' , view);
        i++;

        // Power-up sprites
        this.shapes['6'].size = shpPos[i + 1] - shpPos[i];
        this.loadCompShapesB('6', view);
        i++;

        // Coins, datacubes, etc sprites
        this.shapes['5'].size = shpPos[i + 1] - shpPos[i];
        this.loadCompShapesB('5', view);
        i++;

        // More player shot sprites
        this.shapes['W2'].size = shpPos[i + 1] - shpPos[i];
        this.loadCompShapesB('W2', view);
        i++;
    }
    
    Tyrian.Sprites.prototype.loadSprites = function(table, view)
    {
        this.spriteTable[table] = {
            count:   view.getUint16(),
            sprites: []
        };
        
        for (var i = 0; i < this.spriteTable[table].count; i++) {
            try {
                view.getChar();
            } catch (e) {
                continue;
            }
            
            var sprite = {
                width:  view.getUint16(),
                height: view.getUint16(),
                size:   view.getUint16(),
                data:   []
            };
            
            for (var j = 0; j < sprite.size; j++) {
                sprite.data.push(view.getUint8());
            }
            
            this.spriteTable[table].sprites[i] = sprite;
        }
    }
    
    Tyrian.Sprites.prototype.loadCompShapesB = function(shapesName, view)
    {
        this.shapes[shapesName].data = [];
        
        for (var i = 0; i < this.shapes[shapesName].size; i++) {
            this.shapes[shapesName].data.push(view.getUint8());
        }
    }
})(window['Tyrian']);
