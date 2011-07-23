/**
 * @author    Ben Scholzen <mail@dasprids.de>
 * @copyright Copyright (c) 2011, Ben Scholzen
 */

/**
 * @namespace Ancera
 */
window['Tyrian'] = {};

(function(Tyrian){
    /**
     * Main constructor.
     *
     * @returns {Tyrian.Main}
     */
    Tyrian.Main = function()
    {
        var scripts = document.getElementsByTagName('script');
        var length  = scripts.length;
        var regex   = /Main\.js(\W|$)/i;
        var src;
        var match;

        for (var i = 0; i < length; i++) {
            src = scripts[i].getAttribute('src');

            if (!src) {
                continue;
            }

            if ((match = src.match(regex)) != null) {
                this.rootPath = src.substring(0, match.index);
                return;
            }
        }

        throw 'Could not determine script path';
    }

    /**
     * Run Main procedure.
     *
     * @returns {void}
     */
    Tyrian.Main.prototype.run = function(filename)
    {
        this.files = {
            'vendor/jDataView.js': false,
            'sprites.js': false
        };

        for (file in this.files) {
            this.load(file);
        }
    }

    /**
     * Load a package file.
     *
     * @param   {String} filename
     * @returns {void}
     */
    Tyrian.Main.prototype.load = function(filename)
    {
        if (!this.files.hasOwnProperty(filename) || this.files[filename]) {
            return;
        }

        var main    = this;
        var request = new XMLHttpRequest();
        request.open('GET', this.rootPath + filename, true);
        request.loadingFilename = filename;

        request.addEventListener('load', function(event){
            main.files[event.target.loadingFilename] = true;
            window.eval(event.target.responseText);

            for (file in main.files) {
                if (!main.files[file]) {
                    return;
                }
            }

            main.loadDataFiles();
        }, false);

        request.send(null);
    }

    /**
     * Load all binary files.
     *
     * @returns {void}
     */
    Tyrian.Main.prototype.loadDataFiles = function()
    {
        this.dataFiles = {
            'tyrian.shp': false,
            'music.mus': false
        };

        for (file in this.dataFiles) {
            this.loadData(file);
        }
    }
    
    /**
     * Load a data file.
     *
     * @param   {String} filename
     * @returns {void}
     */
    Tyrian.Main.prototype.loadData = function(filename)
    {
        var main    = this;
        var request = new XMLHttpRequest();
        request.overrideMimeType('text/plain; charset=x-user-defined');
        request.open('GET', this.rootPath + '../data/' + filename, true);
        request.loadingFilename = filename;
        
        request.addEventListener('load', function(event){
            main.dataFiles[event.target.loadingFilename] = event.target.responseText;

            for (file in main.dataFiles) {
                if (!main.dataFiles[file]) {
                    console.log('not');
                    return;
                }
            }
            
            main.init();
        }, false);

        request.send(null);
    }
    
    /**
     * Initiate Tyrian.
     *
     * @returns {void}
     */
    Tyrian.Main.prototype.init = function()
    {
        this.sprites  = new Tyrian.Sprites(this, 'tyrian.shp');
        this.loudness = new Tyrian.Loudness(this);
        this.music    = new Tyrian.Music(this);
    }
    
    /**
     * Get a data file.
     *
     * @returns {void}
     */
    Tyrian.Main.prototype.getDataFile = function(filename)
    {
        return this.dataFiles[filename];
    }    
})(window['Tyrian']);
