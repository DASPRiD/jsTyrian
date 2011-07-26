/**
 * @author    Ben Scholzen <mail@dasprids.de>
 * @copyright Copyright (c) 2011, Ben Scholzen
 */

(function(Tyrian){
    /**
     * OPL3 constructor.
     *
     * @returns {Tyrian.Opl3}
     */
    Tyrian.Opl3 = function()
    {
        this.registers = [];
        this.operators = [];
        this.channel2op = [];
        this.channel4op = [];
        this.channel    = [];
    }
    
    Tyrian.Opl3.prototype.read()
    {
        var output        = [];
        var outputBuffer  = [];
        var channelOutput = [];
        
        for (var outputChannelNumber = 0; outputChannelNumber < 4; outputChannelNumber++) {
            outputBuffer[outputChannelNumber] = 0;
        }
        
        // If _new = 0, use OPL2 mode with 9 channels. If _new = 1, use OPL3 18
        // channels;
        for (var array = 0; array < (this._new + 1); array++) {
            for (var channelNumber = 0; channelNumber < 9; channelNumber++) {
                // Reads output from each OPL3 channel, and accumulates it in
                // the output buffer:
                channelOutput = this.channels[array][channelNumber].getChannelOutput();
                
                for (outputChannelNumber = 0; outputChannelNumber < 4; outputChannelNumber++) {
                    outputBuffer[outputChannelNumber] += channelOutput[outputChannelNumber];
                }
            }
        }
        
        // Normalizes the output buffer after all channels have been added, with
        // a maximum of 18 channels, and multiplies it to get the 16 bit signed
        // output.
        for (outputChannelNumber = 0; outputChannelNumber < 4; outputChannelNumber++) {
            output[outputChannelNumber] = outputBuffer[outputChannelNumber] / 18 * 0x7fff;
        }

        // Advances the OPL3-wide vibrato index, which is used by 
        // PhaseGenerator.getPhase() in each Operator.
        this.vibratoIndex++;
        
        if (this.vibratoIndex >= OPL3Data.vibratoTable[dvb].length) {
            this.vibratoIndex = 0;
        }
        
        // Advances the OPL3-wide tremolo index, which is used by 
        // EnvelopeGenerator.getEnvelope() in each Operator.
        this.tremoloIndex++;
        
        if (this.tremoloIndex >= OPL3Data.tremoloTable[dam].length) {
            this.tremoloIndex = 0;         
        }
        
        return output;
    }
    
    Tyrian.Opl3.prototype.write = function(array, address, data)
    {
        // The OPL3 has two registers arrays, each with adresses ranging
        // from 0x00 to 0xf5.
        // This emulator uses one array, with the two original register arrays
        // starting at 0x00 and at 0x100.
        var registerAddress = (array << 8) | address;
        
        // If the address is out of the OPL3 memory map, returns.
        if (registerAddress < 0 || registerAddress >= 0x200) {
            return;
        }
        
        this.registers[registerAddress] = data;
        
        // The first 3 bits masking gives the type of the register by using its base address:
        // 0x00, 0x20, 0x40, 0x60, 0x80, 0xA0, 0xC0, 0xE0 
        // When it is needed, we further separate the register type inside each base address,
        // which is the case of 0x00 and 0xA0.

        // Through out this emulator we will use the same name convention to
        // reference a byte with several bit registers.
        // The name of each bit register will be followed by the number of bits
        // it occupies inside the byte. 
        // Numbers without accompanying names are unused bits.
        switch (address & 0xe0) {
            case 0x00:
                // Unique registers for entire OPL3:
                if (array == 1) {
                    if (address == 0x04) {
                        this.update_2_CONNECTIONSEL6();
                    } else if (address == 0x05) {
                        this.update_7_NEW1();
                    }
                } else if (address == 0x08) {
                    this.update_1_NTS1_6();
                }
                break;
                
            case 0xa0:
                // 0xbd is a control register for the entire OPL3:
                if (address == 0xbd) {
                    if (array == 0) {
                        this.update_DAM1_DVB1_RYT1_BD1_SD1_TOM1_TC1_HH1();
                        break;
                    }
                }
                
                // Registers for each channel are in A0-A8, B0-B8, C0-C8, in both register arrays.
                // 0xB0...0xB8 keeps kon,block,fnum(h) for each channel.
                if ((address & 0xf0) == 0xb0 && address <= 0xb8) {
                    // If the address is in the second register array, adds 9 to the channel number.
                    // The channel number is given by the last four bits, like in A0,...,A8.
                    this.channels[array][address & 0x0f].update_2_KON1_BLOCK3_FNUMH2();
                    break;                    
                }
                
                // 0xa0...0xa8 keeps fnum(l) for each channel.
                if ((address & 0xf0) == 0xa0 && address <= 0xa8) {
                    this.channels[array][address & 0x0f].update_FNUML8();
                }
                break;
                
            // 0xc0...0xc8 keeps cha,chb,chc,chd,fb,cnt for each channel:
            case 0xc0:
                if (address <= 0xc8) {
                    this.channels[array][address & 0x0f].update_CHD1_CHC1_CHB1_CHA1_FB3_CNT1();
                }
                break;
                
            // Registers for each of the 36 Operators:
            default:
                var operatorOffset = address & 0x1f;
                
                if (this.operators[array][operatorOffset] == null) {
                    break;
                }
                
                switch (address & 0xe0) {
                    // 0x20...0x35 keeps am,vib,egt,ksr,mult for each operator:                
                    case 0x20:
                        this.operators[array][operatorOffset].update_AM1_VIB1_EGT1_KSR1_MULT4();
                        break;
                        
                    // 0x40...0x55 keeps ksl,tl for each operator: 
                    case 0x40:
                        this.operators[array][operatorOffset].update_KSL2_TL6();
                        break;
                        
                    // 0x60...0x75 keeps ar,dr for each operator: 
                    case 0x60:
                        this.operators[array][operatorOffset].update_AR4_DR4();
                        break;
                        
                    // 0x80...0x95 keeps sl,rr for each operator:
                    case 0x80:
                        this.operators[array][operatorOffset].update_SL4_RR4();
                        break;
                        
                    // 0xe0...0xf5 keeps ws for each operator:
                    case 0xE0:
                        this.operators[array][operatorOffset].update_5_WS3();
                        break;
                }
                break;
        }
    }
    
    /**
     * Abstract channel.
     *
     * @param   {Tyrian.Opl3.Opl3} opl3
     * @param   {Integer}          baseAddress
     * @returns {Tyrian.Opl3.Channel}
     */
    Tyrian.Opl3.Channel = function(opl3, baseAddress)
    {
        this.toPhase     = 4;
        this.opl3        = opl3;
        this.baseAddress = baseAddress;
        this.fnuml       = this.fnumh = this.kon = this.block = this.cha
                         = this.chb = this.chc = this.chd = this.fb = this.cnt
                         = 0;
        this.feedback    = [0, 0];
    }
    
    Tyrian.Opl3.Channel.prototype.update_2_KON1_BLOCK3_FNUMH2()
    {
        var _2_kon1_block3_fnumh2 = this.opl3.registers[this.baseAddress + ChannelData._2_KON1_BLOCK3_FNUMH2_Offset];
        
        var block = (_2_kon1_block3_fnumh2 & 0x1C) >> 2;
        var fnumh = _2_kon1_block3_fnumh2 & 0x03;
        
        this.updateOperators();
    }
    
    /**
     * OPL3 data
     */
    var OPL3Data = {
        _1_NTS1_6_Offset:                           0x08,
        DAM1_DVB1_RYT1_BD1_SD1_TOM1_TC1_HH1_Offset: 0xbd,
        _7_NEW1_Offset:                             0x105, 
        _2_CONNECTIONSEL6_Offset:                   0x104,
        
        sampleRate: 49700,
        
        vibratoTable: [],
        tremoloTable: [],
        
        calculateIncrement: function(begin, end, period){
            return (end - begin) / opl3Data.sampleRate * (1 / period);
        }
    };
    
    // Load vibrato table
    (function(o){
        // According to the YMF262 datasheet, the OPL3 vibrato repetition rate is 6.1 Hz.
        // According to the YMF278B manual, it is 6.0 Hz. 
        // The information that the vibrato table has 8 levels standing 1024 samples each
        // was taken from the emulator by Jarek Burczynski and Tatsuyuki Satoh,
        // with a frequency of 6,06689453125 Hz, what  makes sense with the difference 
        // in the information on the datasheets.
        
        // The first array is used when DVB=0 and the second array is used when DVB=1.
        var i;
        
        for (i = 0; i < 2; i++) {
            o.vibratoTable[i] = [];
        }
        
        var semitone = Math.pow(2, 1 / 12);
        // A cent is 1/100 of a semitone:
        var cent = Math.pow(semitone, 1 / 100);
        
        // When dvb=0, the depth is 7 cents, when it is 1, the depth is 14 cents.
        var DVB0 = Math.pow(cent, 7);
        var DVB1 = Math.pow(cent, 14);        
        
        for (i = 0; i < 1024; i++) {
            o.vibratoTable[0][i] = o.vibratoTable[1][i] = 1;        
        }
        
        for (; i < 2048; i++) {
            o.vibratoTable[0][i] = Math.sqrt(DVB0);
            o.vibratoTable[1][i] = Math.sqrt(DVB1);
        }
        
        for (; i < 3072; i++) {
            o.vibratoTable[0][i] = DVB0;
            o.vibratoTable[1][i] = DVB1;
        }
        
        for(; i < 4096; i++) {
            o.vibratoTable[0][i] = Math.sqrt(DVB0);
            o.vibratoTable[1][i] = Math.sqrt(DVB1);
        }
        
        for(; i < 5120; i++) {
            o.vibratoTable[0][i] = o.vibratoTable[1][i] = 1;
        }
        
        for (; i < 6144; i++) {
            o.vibratoTable[0][i] = 1 / Math.sqrt(DVB0);
            o.vibratoTable[1][i] = 1 / Math.sqrt(DVB1);
        }
        
        for (; i < 7168; i++) {
            o.vibratoTable[0][i] = 1 / DVB0;
            o.vibratoTable[1][i] = 1 / DVB1;
        }
        
        for (; i < 8192; i++) {
            o.vibratoTable[0][i] = 1 / Math.sqrt(DVB0);
            o.vibratoTable[1][i] = 1 / Math.sqrt(DVB1);
        }
    })(OPL3Data);
    
    // Load tremolo table
    (function(o){
        // The OPL3 tremolo repetition rate is 3.7 Hz.  
        var tremoloFrequency = 3.7;
        
        // The tremolo depth is -1 dB when DAM = 0, and -4.8 dB when DAM = 1.
        var tremoloDepth = [-1, -4.8];
        
        //  According to the YMF278B manual's OPL3 section graph, 
        //              the tremolo waveform is not 
        //   \      /   a sine wave, but a single triangle waveform.
        //    \    /    Thus, the period to achieve the tremolo depth is T/2, and      
        //     \  /     the increment in each T/2 section uses a frequency of 2*f.
        //      \/      Tremolo varies from 0 dB to depth, to 0 dB again, at frequency*2:
        var tremoloIncrement = [
            o.calculateIncrement(tremoloDepth[0], 0, 1 / (2 * tremoloFrequency)),
            o.calculateIncrement(tremoloDepth[1], 0, 1 / (2 * tremoloFrequency))
        ];
        
        var tremoloTableLength = Math.floor(o.sampleRate / tremoloFrequency);
        
        // First array used when AM = 0 and second array used when AM = 1.
        for (var i = 0; i < 2; i++) {
            o.tremoloTable[i] = [];
        }
        
        // This is undocumented. The tremolo starts at the maximum attenuation,
        // instead of at 0 dB:
        o.tremoloTable[0][0] = tremoloDepth[0];
        o.tremoloTable[1][0] = tremoloDepth[1];
        
        var counter = 0;
        
        // The first half of the triangle waveform:
        while (o.tremoloTable[0][counter] < 0) {
            counter++;
            
            o.tremoloTable[0][counter] = o.tremoloTable[0][counter-1] + tremoloIncrement[0];
            o.tremoloTable[1][counter] = o.tremoloTable[1][counter-1] + tremoloIncrement[1];
        }
        
        // The second half of the triangle waveform:
        while (tremoloTable[0][counter] > tremoloDepth[0] && counter < tremoloTableLength - 1) {
            counter++;
            
            o.tremoloTable[0][counter] = o.tremoloTable[0][counter - 1] - tremoloIncrement[0];
            o.tremoloTable[1][counter] = o.tremoloTable[1][counter - 1] - tremoloIncrement[1];
        }
    })(OPL3Data);

    /**
     * Channel data
     */
    var ChannelData = {
        _2_KON1_BLOCK3_FNUMH2_Offset:        0xb0,
        FNUML8_Offset:                       0xa0,
        CHD1_CHC1_CHB1_CHA1_FB3_CNT1_Offset: 0xc0,
        
        // Feedback rate in fractions of 2*Pi, normalized to (0,1): 
        // 0, Pi/16, Pi/8, Pi/4, Pi/2, Pi, 2*Pi, 4*Pi turns to be:
        feedback: [0, 1 / 32, 1 / 16, 1 / 8, 1 / 4, 1 / 2, 1, 2]
    };
    
    /**
     * Operator data
     */
    var OperatorData = {
        AM1_VIB1_EGT1_KSR1_MULT4_Offset: 0x20,
        KSL2_TL6_Offset:                 0x40,
        AR4_DR4_Offset:                  0x60,
        SL4_RR4_Offset:                  0x80,
        _5_WS3_Offset:                   0xe0,
        
        waveLength: 1024,
    
        multTable: [0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 12, 12, 15, 15],
    
        ksl3dBtable: [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, -3, -6, -9], 
            [0, 0, 0, 0, -3, -6, -9, -12], 
            [0, 0, 0, -1.875, -4.875, -7.875, -10.875, -13.875], 

            [0, 0, 0, -3, -6, -9, -12, -15], 
            [0, 0, -1.125, -4.125, -7.125, -10.125, -13.125, -16.125], 
            [0, 0, -1.875, -4.875, -7.875, -10.875, -13.875, -16.875], 
            [0, 0, -2.625, -5.625, -8.625, -11.625, -14.625, -17.625], 

            [0, 0, -3, -6, -9, -12, -15, -18], 
            [0, -0.750, -3.750, -6.750, -9.750, -12.750, -15.750, -18.750], 
            [0, -1.125, -4.125, -7.125, -10.125, -13.125, -16.125, -19.125], 
            [0, -1.500, -4.500, -7.500, -10.500, -13.500, -16.500, -19.500], 

            [0, -1.875, -4.875, -7.875, -10.875, -13.875, -16.875, -19.875], 
            [0, -2.250, -5.250, -8.250, -11.250, -14.250, -17.250, -20.250], 
            [0, -2.625, -5.625, -8.625, -11.625, -14.625, -17.625, -20.625], 
            [0, -3, -6, -9, -12, -15, -18, -21]
        ],
        
        waveforms: [],
        
        log2: function(x){
            return Math.log(x) / Math.log(2);
        }
    };

    // Load waveforms
    (function(od){
        var i, theta = 0, thetaIncrement = 2 * Math.PI / 1024;
        
        for (i = 0; i < 8; i++) {
            od.waveforms[i] = [];
        }
        
        for (i = 0, theta = 0; i < 1024; i++, theta += thetaIncrement) {
            od.waveforms[0][i] = Math.sin(theta);
        }
        
        // 1st waveform: sinusoid.
        var sineTable = od.waveforms[0];
        
        // 2nd: first half of a sinusoid.
        for (i = 0; i < 512; i++) {
            od.waveforms[1][i]       = sineTable[i];
            od.waveforms[1][512 + i] = 0;
        }
        
        // 3rd: double positive sinusoid.
        for (i = 0; i < 512; i++) {
            od.waveforms[2][i] = od.waveforms[2][512 + i] = sineTable[i];
        }
        
        // 4th: first and third quarter of double positive sinusoid.
        for (i = 0; i < 256; i++) {
            od.waveforms[3][i]       = od.waveforms[3][512 + i] = sineTable[i];
            od.waveforms[3][256 + i] = od.waveforms[3][768 + i] = 0;
        }
        
        // 5th: first half with double frequency sinusoid.
        for (i = 0; i < 512; i++) {
            od.waveforms[4][i]       = sineTable[i * 2];
            od.waveforms[4][512 + i] = 0;
        } 
        
        // 6th: first half with double frequency positive sinusoid.
        for (i = 0; i < 256; i++) {
            od.waveforms[5][i]       = od.waveforms[5][256 + i] = sineTable[i * 2];
            od.waveforms[5][512 + i] = od.waveforms[5][768 + i] = 0;
        }
        
        // 7th: square wave
        for (i = 0; i < 512; i++) {
            od.waveforms[6][i]       = 1;
            od.waveforms[6][512 + i] = -1;
        }                
        
        // 8th: exponential
        var x, xIncrement = 1 * 16 / 256;
        
        for (i = 0, x = 0; i < 512; i++, x += xIncrement) {
            od.waveforms[7][i]        = Math.pow(2,-x);
            od.waveforms[7][1023 - i] = -Math.pow(2,-(x + 1 / 16));
        }
    })(OperatorData);
    
    /**
     * Envelope Generator data
     */
    var EnvelopeGeneratorData = {
        INFINITY: (1 / 0),
        
        // This table is indexed by the value of Operator.ksr 
        // and the value of ChannelRegister.keyScaleNumber.
        rateOffset: [
            [0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3],
            [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]
        ]
    };
    
    EnvelopeGeneratorData.attackTimeValuesTable = [
        [envelopeGeneratorData.INFINITY, envelopeGeneratorData.INFINITY],
        [envelopeGeneratorData.INFINITY, envelopeGeneratorData.INFINITY],
        [envelopeGeneratorData.INFINITY, envelopeGeneratorData.INFINITY],
        [envelopeGeneratorData.INFINITY, envelopeGeneratorData.INFINITY], 
        [2826.24, 1482.75], [2252.80, 1155.07], [1884.16, 991.23], [1597.44, 868.35], 
        [1413.12, 741.38], [1126.40, 577.54], [942.08, 495.62], [798.72, 434.18], 
        [706.56, 370.69], [563.20, 288.77], [471.04, 247.81], [399.36, 217.09], 

        [353.28, 185.34], [281.60, 144.38], [235.52, 123.90], [199.68, 108.54], 
        [176.76, 92.67], [140.80, 72.19], [117.76, 61.95], [99.84, 54.27], 
        [88.32, 46.34], [70.40, 36.10], [58.88, 30.98], [49.92, 27.14], 
        [44.16, 23.17], [35.20, 18.05], [29.44, 15.49], [24.96, 13.57], 

        [22.08, 11.58], [17.60, 9.02], [14.72, 7.74], [12.48, 6.78], 
        [11.04, 5.79], [8.80, 4.51], [7.36, 3.87], [6.24, 3.39], 
        [5.52, 2.90], [4.40, 2.26], [3.68, 1.94], [3.12, 1.70], 
        [2.76, 1.45], [2.20, 1.13], [1.84, 0.97], [1.56, 0.85], 

        [1.40, 0.73], [1.12, 0.61], [0.92, 0.49], [0.80, 0.43], 
        [0.70, 0.37], [0.56, 0.31], [0.46, 0.26], [0.42, 0.22], 
        [0.38, 0.19], [0.30, 0.14], [0.24, 0.11], [0.20, 0.11], 
        [0.00, 0.00], [0.00, 0.00], [0.00, 0.00], [0.00, 0.00]
    ];
    
    EnvelopeGeneratorData.decayAndReleaseTimeValuesTable = [
        [envelopeGeneratorData.INFINITY, envelopeGeneratorData.INFINITY],
        [envelopeGeneratorData.INFINITY, envelopeGeneratorData.INFINITY],
        [envelopeGeneratorData.INFINITY, envelopeGeneratorData.INFINITY],
        [envelopeGeneratorData.INFINITY, envelopeGeneratorData.INFINITY],
        [39280.64, 8212.48], [31416.32, 6574.08], [26173.44, 5509.12], [22446.08, 4730.88], 
        [19640.32, 4106.24], [15708.16, 3287.04], [13086.72, 2754.56], [11223.04, 2365.44], 
        [9820.16, 2053.12], [7854.08, 1643.52], [6543.36, 1377.28], [5611.52, 1182.72], 

        [4910.08, 1026.56], [3927.04, 821.76], [3271.68, 688.64], [2805.76, 591.36], 
        [2455.04, 513.28], [1936.52, 410.88], [1635.84, 344.34], [1402.88, 295.68], 
        [1227.52, 256.64], [981.76, 205.44], [817.92, 172.16], [701.44, 147.84], 
        [613.76, 128.32], [490.88, 102.72], [488.96, 86.08], [350.72, 73.92], 

        [306.88, 64.16], [245.44, 51.36], [204.48, 43.04], [175.36, 36.96], 
        [153.44, 32.08], [122.72, 25.68], [102.24, 21.52], [87.68, 18.48], 
        [76.72, 16.04], [61.36, 12.84], [51.12, 10.76], [43.84, 9.24], 
        [38.36, 8.02], [30.68, 6.42], [25.56, 5.38], [21.92, 4.62], 

        [19.20, 4.02], [15.36, 3.22], [12.80, 2.68], [10.96, 2.32], 
        [9.60, 2.02], [7.68, 1.62], [6.40, 1.35], [5.48, 1.15], 
        [4.80, 1.01], [3.84, 0.81], [3.20, 0.69], [2.74, 0.58], 
        [2.40, 0.51], [2.40, 0.51], [2.40, 0.51], [2.40, 0.51]
    ];
})(window['Tyrian']);
