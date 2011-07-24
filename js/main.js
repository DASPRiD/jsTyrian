/**
 * @author    Ben Scholzen <mail@dasprids.de>
 * @copyright Copyright (c) 2011, Ben Scholzen
 */

/**
 * @namespace Tyrian
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
            'sprites.js': false,
            'palette.js': false,
            'picLoad.js': false,
            'screen.js': false
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
            'tyrian.pic': false,
            'music.mus': false,
            'palette.dat': false
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
        this.initVideo();

        this.screen  = new Tyrian.Screen(this);
        this.sprites = new Tyrian.Sprites(this, 'tyrian.shp');
        this.palette = new Tyrian.Palette(this);
        this.picLoad = new Tyrian.PicLoad(this);
        //this.loudness = new Tyrian.Loudness(this);
        //this.music    = new Tyrian.Music(this);
        
        this.introLogos();
    }
    
    /**
     * Initiate video.
     *
     * @returns {void}
     */
    Tyrian.Main.prototype.initVideo = function()
    {
        this.canvas               = document.getElementById('canvas');
        this.canvas.width         = 640;
        this.canvas.height        = 400;
        this.canvas.style.display = 'block';
        
        this.context = this.canvas.getContext('2d');
    }
    
    /**
     * Show intro logos.
     *
     * @returns {void}
     */
    Tyrian.Main.prototype.introLogos = function()
    {
        var main = this;
               
        this.palette.fadeWhite(50, function(){
            var colors = main.picLoad.loadPic(10, false);
            
            main.palette.fadePalette(colors, 50, 0, 255, function(){
                window.setTimeout(function(){
                    main.palette.fadeBlack(10, function(){
                        var colors = main.picLoad.loadPic(12, false);
                        
                        main.palette.fadePalette(colors, 10, 0, 255, function(){
                            window.setTimeout(function(){
                                main.palette.fadeBlack(10, function(){
                                    // Load menu
                                });
                            }, 200 * 14.375031429); 
                        });
                    });
                }, 200 * 14.375031429); 
            });
        })

        /*
        window.setTimeout(function(){
            main.picLoad.loadPic(12, false);
        }, 1000);
        */
    }    
    
    /**
     * Get a data file.
     *
     * @returns {String}
     */
    Tyrian.Main.prototype.getDataFile = function(filename)
    {
        return this.dataFiles[filename];
    }    
})(window['Tyrian']);
