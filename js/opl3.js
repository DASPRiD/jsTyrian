/**
 * @author    Ben Scholzen <mail@dasprids.de>
 * @copyright Copyright (c) 2011, Ben Scholzen
 */

(function(Tyrian){
    var OPL3;
    
    /**
     * OPL3 constructor.
     *
     * @returns {Tyrian.Opl3}
     */
    Tyrian.Opl3 = function()
    {
        OPL3 = this;

        this.nts = this.dam = this.dvb = this.ryt = this.bd = this.sd = this.tom
                 = this.tc = this.hh = this._new = this.connectionsel = 0;
        this.vibratorIndex = this.tremoloIndex = 0;
        this.registers = [];
        
        this.initOperators();
        this.initChannels2op();
        this.initChannels4op();
        this.initRhythmChannels();
        this.initChannels();
    }
    
    Tyrian.Opl3.prototype.initOperators = function()
    {
        var baseAddress;
        // The YMF262 has 36 operators:
        this.operators = [];
        
        for (var array = 0; array < 2; array++) {
            this.operators[array] = [];
            
            for (var group = 0; group <= 0x10; group += 8) {
                for (var offset = 0; offset < 6; offset++) {
                    baseAddress = (array << 8) | (group + offset);
                    operators[array][group + offset] = new Operator(baseAddress);
                }
            }
        }
        
        // Create specific operators to switch when in rhythm mode:
        this.highHatOperator   = new HighHatOperator();
        this.snareDrumOperator = new SnareDrumOperator();
        this.tomTomOperator    = new TomTomOperator();
        this.topCymbalOperator = new TopCymbalOperator();
    
        // Save operators when they are in non-rhythm mode:
        // Channel 7:
        this.highHatOperatorInNonRhythmMode   = operators[0][0x11];
        this.snareDrumOperatorInNonRhythmMode = operators[0][0x14];
        
        // Channel 8:
        this.tomTomOperatorInNonRhythmMode    = operators[0][0x12];
        this.topCymbalOperatorInNonRhythmMode = operators[0][0x15];
    }
    
    Tyrian.Opl3.prototype.initChannels2op = function()
    {
        var baseAddress;
        // The YMF262 has 18 2-op channels.
        // Each 2-op channel can be at a serial or parallel operator configuration:
        this.channels2op = [];
        
        for (var array = 0; array < 2; array++) {
            this.channels2op[array] = [];
            
            for (var channelNumber = 0; channelNumber < 3; channelNumber++) {
                baseAddress = (array << 8) | channelNumber;
                
                // Channels 1, 2, 3 -> Operator offsets 0x0,0x3; 0x1,0x4; 0x2,0x5
                this.channels2op[array][channelNumber]   = new Channel2op(baseAddress, this.operators[array][channelNumber], this.operators[array][channelNumber + 0x3]);
                
                // Channels 4, 5, 6 -> Operator offsets 0x8,0xB; 0x9,0xC; 0xA,0xD
                this.channels2op[array][channelNumber+3] = new Channel2op(baseAddress + 3, this.operators[array][channelNumber + 0x8], this.operators[array][channelNumber + 0xb]);
                
                // Channels 7, 8, 9 -> Operators 0x10,0x13; 0x11,0x14; 0x12,0x15
                this.channels2op[array][channelNumber+6] = new Channel2op(baseAddress + 6, this.operators[array][channelNumber + 0x10], this.operators[array][channelNumber + 0x13]);
            }   
        }
    }
    
    Tyrian.Opl3.prototype.initChannels4op = function()
    {
        var baseAddress;
        // The YMF262 has 3 4-op channels in each array:
        this.channels4op = [];
        
        for (var array = 0; array < 2; array++) {
            this.channels4op[array] = [];
            
            for (var channelNumber = 0; channelNumber < 3; channelNumber++) {
                baseAddress = (array << 8) | channelNumber;
                
                // Channels 1, 2, 3 -> Operators 0x0,0x3,0x8,0xB; 0x1,0x4,0x9,0xC; 0x2,0x5,0xA,0xD;
                this.channels4op[array][channelNumber] = new Channel4op(
                    baseAddress,
                    this.operators[array][channelNumber],
                    this.operators[array][channelNumber + 0x3],
                    this.operators[array][channelNumber + 0x8],
                    this.operators[array][channelNumber + 0xb]
                );
            }   
        }
    }

    Tyrian.Opl3.prototype.initRhythmChannels = function()
    {
        this.bassDrumChannel         = new BassDrumChannel();
        this.highHatSnareDrumChannel = new HighHatSnareDrumChannel();
        this.tomTomTopCymbalChannel  = new TomTomTopCymbalChannel();
    }
    
    Tyrian.Opl3.prototype.initChannels = function()
    {
        this.channels = [];
        
        // Channel is an abstract class that can be a 2-op, 4-op, rhythm or disabled channel, 
        // depending on the OPL3 configuration at the time.
        // channels[] inits as a 2-op serial channel array:
        for (var array = 0; array < 2; array++) {
            this.channels[array] = [];
            
            for (var i = 0; i < 9; i++) {
                this.channels[array][i] = this.channels2op[array][i];
            }
        }
        
        // Unique instance to fill future gaps in the Channel array,
        // when there will be switches between 2op and 4op mode.
        this.disabledChannel = new DisabledChannel();
    }

    Tyrian.Opl3.prototype.update_1_NTS1_6 = function()
    {
        var _1_nts1_6 = this.registers[OPL3Data._1_NTS1_6_Offset];
        
        // Note Selection. This register is used in Channel.updateOperators() implementations,
        // to calculate the channel´s Key Scale Number.
        // The value of the actual envelope rate follows the value of
        // OPL3.nts,Operator.keyScaleNumber and Operator.ksr
        this.nts = (_1_nts1_6 & 0x40) >> 6;
    }
    
    Tyrian.Opl3.prototype.update_DAM1_DVB1_RYT1_BD1_SD1_TOM1_TC1_HH1 = function()
    {
        var dam1_dvb1_ryt1_bd1_sd1_tom1_tc1_hh1 = this.registers[OPL3Data.DAM1_DVB1_RYT1_BD1_SD1_TOM1_TC1_HH1_Offset];
        
        // Depth of amplitude. This register is used in EnvelopeGenerator.getEnvelope();
        this.dam = (dam1_dvb1_ryt1_bd1_sd1_tom1_tc1_hh1 & 0x80) >> 7;
        
        // Depth of vibrato. This register is used in PhaseGenerator.getPhase();
        this.dvb = (dam1_dvb1_ryt1_bd1_sd1_tom1_tc1_hh1 & 0x40) >> 6;
        
        var new_ryt = (dam1_dvb1_ryt1_bd1_sd1_tom1_tc1_hh1 & 0x20) >> 5;
        
        if (new_ryt != this.ryt) {
            this.ryt = new_ryt;
            this.setRhythmMode();               
        }
        
        var new_bd = (dam1_dvb1_ryt1_bd1_sd1_tom1_tc1_hh1 & 0x10) >> 4;
        
        if (new_bd != this.bd) {
            this.bd = new_bd;
            
            if (this.bd == 1) {
                this.bassDrumChannel.op1.keyOn();
                this.bassDrumChannel.op2.keyOn();
            }
        }
        
        var new_sd = (dam1_dvb1_ryt1_bd1_sd1_tom1_tc1_hh1 & 0x08) >> 3;
        
        if (new_sd != this.sd) {
            this.sd = new_sd;
            
            if (this.sd == 1) {
                this.snareDrumOperator.keyOn();
            } 
        }
        
        var new_tom = (dam1_dvb1_ryt1_bd1_sd1_tom1_tc1_hh1 & 0x04) >> 2;
        
        if (new_tom != this.tom) {
            this.tom = new_tom;
            
            if (this.tom == 1) {
                this.tomTomOperator.keyOn();
            }
        }
        
        var new_tc = (dam1_dvb1_ryt1_bd1_sd1_tom1_tc1_hh1 & 0x02) >> 1;
        
        if (new_tc != this.tc) {
            this.tc = new_tc;
            
            if (tc == 1) {
                this.topCymbalOperator.keyOn();
            }
        }
        
        var new_hh = dam1_dvb1_ryt1_bd1_sd1_tom1_tc1_hh1 & 0x01;
        
        if (new_hh != this.hh) {
            this.hh = new_hh;
            
            if (this.hh == 1) {
                this.highHatOperator.keyOn();
            }
        }
    }

    Tyrian.Opl3.prototype.update_7_NEW1 = function()
    {
        var _7_new1 = OPL3.registers[OPL3Data._7_NEW1_Offset];
        
        // OPL2/OPL3 mode selection. This register is used in 
        // OPL3.read(), OPL3.write() and Operator.getOperatorOutput();
        this._new = (_7_new1 & 0x01);
        
        if (this._new == 1) {
            this.setEnabledChannels();
        }
        
        this.set4opConnections();                    
    }

    Tyrian.Opl3.prototype.setEnabledChannels = function()
    {
        var baseAddress;
        
        for (var array = 0; array < 2; array++) {
            for (var i = 0; i < 9; i++) {
                baseAddress = this.channels[array][i].baseAddress;
                this.registers[baseAddress + ChannelData.CHD1_CHC1_CHB1_CHA1_FB3_CNT1_Offset] |= 0xf0;
                this.channels[array][i].update_CHD1_CHC1_CHB1_CHA1_FB3_CNT1();
            }        
        }
    }
    
    Tyrian.Opl3.prototype.update_2_CONNECTIONSEL6 = function()
    {
        // This method is called only if _new is set.
        var _2_connectionsel6 = this.registers[OPL3Data._2_CONNECTIONSEL6_Offset];
        
        // 2-op/4-op channel selection. This register is used here to configure the OPL3.channels[] array.
        this.connectionsel = (_2_connectionsel6 & 0x3f);
        this.set4opConnections();
    }
    
    Tyrian.Opl3.prototype.set4opConnections = function()
    {
        // bits 0, 1, 2 sets respectively 2-op channels (1,4), (2,5), (3,6) to 4-op operation.
        // bits 3, 4, 5 sets respectively 2-op channels (10,13), (11,14), (12,15) to 4-op operation.
        for (var array = 0; array < 2; array++) {
            for (var i = 0; i < 3; i++) {
                if (this._new == 1) {
                    var shift         = array * 3 + i;
                    var connectionBit = (this.connectionsel >> shift) & 0x01;
                    
                    if (connectionBit == 1) {
                        this.channels[array][i]     = this.channels4op[array][i];
                        this.channels[array][i + 3] = this.disabledChannel;
                        this.channels[array][i].updateChannel();
                        continue;    
                    }
                }
                
                this.channels[array][i]     = this.channels2op[array][i];
                this.channels[array][i + 3] = this.channels2op[array][i + 3];
                this.channels[array][i].updateChannel();
                this.channels[array][i + 3].updateChannel();
            }
        }
    } 
    
    Tyrian.Opl3.prototype.setRhythmMode = function()
    {
        var i;
        
        if (this.ryt == 1) {
            this.channels[0][6]     = this.bassDrumChannel;
            this.channels[0][7]     = this.highHatSnareDrumChannel;
            this.channels[0][8]     = this.tomTomTopCymbalChannel;
            this.operators[0][0x11] = this.highHatOperator;
            this.operators[0][0x14] = this.snareDrumOperator;
            this.operators[0][0x12] = this.tomTomOperator;
            this.operators[0][0x15] = this.topCymbalOperator;
        } else {
            for (i = 6; i <= 8; i++) {
                this.channels[0][i] = this.channels2op[0][i];
            }
            
            this.operators[0][0x11] = this.highHatOperatorInNonRhythmMode;
            this.operators[0][0x14] = this.snareDrumOperatorInNonRhythmMode;
            this.operators[0][0x12] = this.tomTomOperatorInNonRhythmMode;
            this.operators[0][0x15] = this.topCymbalOperatorInNonRhythmMode;                
        }
        
        for (i = 6; i <= 8; i++) {
            this.channels[0][i].updateChannel();
        }
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
        
        if (this.vibratoIndex >= OPL3Data.vibratoTable[this.dvb].length) {
            this.vibratoIndex = 0;
        }
        
        // Advances the OPL3-wide tremolo index, which is used by 
        // EnvelopeGenerator.getEnvelope() in each Operator.
        this.tremoloIndex++;
        
        if (this.tremoloIndex >= OPL3Data.tremoloTable[this.dam].length) {
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
     * Abstract channel
     */
    var Channel = function(baseAddress)
    {
        // Factor to convert between normalized amplitude to normalized
        // radians. The amplitude maximum is equivalent to 8*Pi radians.
        this.toPhase     = 4;
       
        this.baseAddress = baseAddress;
        this.fnuml       = this.fnumh = this.kon = this.block = this.cha
                         = this.chb = this.chc = this.chd = this.fb = this.cnt
                         = 0;
        this.feedback    = [0, 0];
    }
    
    Channel.prototype.update_2_KON1_BLOCK3_FNUMH2()
    {
        var _2_kon1_block3_fnumh2 = OPL3.registers[this.baseAddress + ChannelData._2_KON1_BLOCK3_FNUMH2_Offset];
        
        // Frequency Number (hi-register) and Block. These two registers, together with fnuml, 
        // sets the Channel´s base frequency;
        var block = (_2_kon1_block3_fnumh2 & 0x1C) >> 2;
        var fnumh = _2_kon1_block3_fnumh2 & 0x03;
        
        this.updateOperators();
        
        // Key On. If changed, calls Channel.keyOn() / keyOff().
        var newKon = (_2_kon1_block3_fnumh2 & 0x20) >> 5;
        
        if (newKon != this.kon) {
            if (newKon == 1) {
                keyOn();
            } else {
                keyOff(); 
            }
            
            this.kon = newKon;
        }
    }
    
    Channel.prototype.update_FNUML8 = function()
    {
        var fnuml8 = OPL3.registers[this.baseAddress + ChannelData.FNUML8_Offset];
        
        // Frequency Number, low register.
        this.fnuml = fnuml8 & 0xff;
        
        this.updateOperators();
    }
    
    Channel.prototype.update_CHD1_CHC1_CHB1_CHA1_FB3_CNT1 = function()
    {
        var chd1_chc1_chb1_cha1_fb3_cnt1 = OPL3.registers[this.baseAddress + ChannelData.CHD1_CHC1_CHB1_CHA1_FB3_CNT1_Offset];
        
        this.chd = (chd1_chc1_chb1_cha1_fb3_cnt1 & 0x80) >> 7;
        this.chc = (chd1_chc1_chb1_cha1_fb3_cnt1 & 0x40) >> 6;
        this.chb = (chd1_chc1_chb1_cha1_fb3_cnt1 & 0x20) >> 5;
        this.cha = (chd1_chc1_chb1_cha1_fb3_cnt1 & 0x10) >> 4;
        this.fb  = (chd1_chc1_chb1_cha1_fb3_cnt1 & 0x0e) >> 1;
        this.cnt = chd1_chc1_chb1_cha1_fb3_cnt1 & 0x01;
        
        this.updateOperators();
    }
    
    Channel.prototype.updateChannel = function()
    {
        this.update_2_KON1_BLOCK3_FNUMH2();
        this.update_FNUML8();
        this.update_CHD1_CHC1_CHB1_CHA1_FB3_CNT1();
    }
    
    Channel.prototype.getInFourChannels = function(channelOutput)
    {
        var output = [];
        
        if (OPL3._new == 0) {
            output[0] = output[1] = output[2] = output[3] = channelOutput;
        } else {
            output[0] = (this.cha == 1) ? channelOutput : 0;
            output[1] = (this.chb == 1) ? channelOutput : 0;
            output[2] = (this.chc == 1) ? channelOutput : 0;
            output[3] = (this.chd == 1) ? channelOutput : 0;
        }
        
        return output;
    }
    
    Channel.prototype.getChannelOutput = function(){ throw 'Not implemented'; }
    Channel.prototype.keyOn            = function(){ throw 'Not implemented'; }
    Channel.prototype.keyOff           = function(){ throw 'Not implemented'; }
    Channel.prototype.updateOperators  = function(){ throw 'Not implemented'; }
    
    /**
     * Channel2op
     */
    var Channel2op = function(baseAddress, o1, o2)
    {
        Channel.call(this, baseAddress);
        
        this.op1 = o1;
        this.op2 = o2;
    }
    
    Channel2op.prototype             = new Channel();
    Channel2op.prototype.constructor = Channel2op;
    
    Channel2op.prototype.getChannelOutput = function()
    {
        var channelOutput = 0, op1Output = 0, op2Output = 0;

        // The feedback uses the last two outputs from the first operator,
        // instead of just the last one. 
        var feedbackOutput = (this.feedback[0] + this.feedback[1]) / 2;

        switch (this.cnt) {
            // CNT = 0, the operators are in series, with the first in feedback.
            case 0:
                if (this.op2.envelopeGenerator.stage == EnvelopeGenerator.Stage.OFF) {
                    return this.getInFourChannels(0);
                }
                
                op1Output     = this.op1.getOperatorOutput(feedbackOutput);
                channelOutput = this.op2.getOperatorOutput(op1Output * this.toPhase);
                break;
                
            // CNT = 1, the operators are in parallel, with the first in feedback.    
            case 1:
                if (this.op1.envelopeGenerator.stage == EnvelopeGenerator.Stage.OFF && 
                    this.op2.envelopeGenerator.stage == EnvelopeGenerator.Stage.OFF
                ) {
                    return this.getInFourChannels(0);
                }
                
                op1Output     = this.op1.getOperatorOutput(feedbackOutput);
                op2Output     = this.op2.getOperatorOutput(Operator.noModulator);
                channelOutput = (op1Output + op2Output) / 2;
                break;
        }
        
        this.feedback[0] = this.feedback[1];
        this.feedback[1] = (op1Output * ChannelData.feedback[this.fb]) % 1;        
        
        return this.getInFourChannels(channelOutput);
    }
    
    Channel2op.prototype.keyOn = function()
    {
        this.op1.keyOn();
        this.op2.keyOn();
        
        this.feedback[0] = this.feedback[1] = 0;
    }
    
    Channel2op.prototype.keyOff = function()
    {
        this.op1.keyOff();
        this.op2.keyOff();        
    }
    
    Channel2op.prototype.updateOperators = function()
    {
        // Key Scale Number, used in EnvelopeGenerator.setActualRates().
        var keyScaleNumber = this.block * 2 + ((this.fnumh >> OPL3.nts) & 0x01);
        var f_number       = (this.fnumh << 8) | this.fnuml;           
        
        this.op1.updateOperator(keyScaleNumber, f_number, this.block);        
        this.op2.updateOperator(keyScaleNumber, f_number, this.block);     
    }
    
    /**
     * Channel4op
     */
    var Channel4op = function(baseAddress, o1, o2, o3, o4)
    {
        Channel.call(this, baseAddress);
        
        this.op1 = o1;
        this.op2 = o2;
        this.op3 = o3;
        this.op4 = o4;
    }
    
    Channel4op.prototype             = new Channel();
    Channel4op.prototype.constructor = Channel4op;
    
    Channel4op.prototype.getChannelOutput = function()
    {
        var channelOutput = 0, op1Output = 0, op2Output = 0, op3Output = 0, op4Output = 0;

        var secondBaseAddress = this.baseAddress + 3;
        var secondCnt         = OPL3.registers[secondBaseAddress + ChannelData.CHD1_CHC1_CHB1_CHA1_FB3_CNT1_Offset] & 0x1;
        var cnt4op            = (this.cnt << 1) | secondCnt;
        
        var feedbackOutput = (feedback[0] + feedback[1]) / 2;
        
        switch (cnt4op) {
            case 0:
                if (this.op4.envelopeGenerator.stage == EnvelopeGenerator.Stage.OFF) {
                    return this.getInFourChannels(0);
                }
                
                op1Output     = this.op1.getOperatorOutput(feedbackOutput);
                op2Output     = this.op2.getOperatorOutput(op1Output * this.toPhase);
                op3Output     = this.op3.getOperatorOutput(op2Output * this.toPhase);
                channelOutput = this.op4.getOperatorOutput(op3Output * this.toPhase);
                break;
                
            case 1:
                if (this.op2.envelopeGenerator.stage == EnvelopeGenerator.Stage.OFF && 
                    this.op4.envelopeGenerator.stage == EnvelopeGenerator.Stage.OFF
                ) {
                    return this.getInFourChannels(0);
                }
                
                op1Output     = this.op1.getOperatorOutput(feedbackOutput);
                op2Output     = this.op2.getOperatorOutput(op1Output * this.toPhase);
                op3Output     = this.op3.getOperatorOutput(Operator.noModulator);
                op4Output     = this.op4.getOperatorOutput(op3Output * this.toPhase);
                channelOutput = (op2Output + op4Output) / 2;
                break;
                
            case 2:
                if (this.op1.envelopeGenerator.stage == EnvelopeGenerator.Stage.OFF && 
                    this.op4.envelopeGenerator.stage == EnvelopeGenerator.Stage.OFF
                ) {
                    return this.getInFourChannels(0);
                }
                
                op1Output     = this.op1.getOperatorOutput(feedbackOutput);
                op2Output     = this.op2.getOperatorOutput(Operator.noModulator);
                op3Output     = this.op3.getOperatorOutput(op2Output * this.toPhase);
                op4Output     = this.op4.getOperatorOutput(op3Output * this.toPhase);
                channelOutput = (op1Output + op4Output) / 2;
                break;
                
            case 3:
                if (this.op1.envelopeGenerator.stage == EnvelopeGenerator.Stage.OFF && 
                    this.op3.envelopeGenerator.stage == EnvelopeGenerator.Stage.OFF && 
                    this.op4.envelopeGenerator.stage == EnvelopeGenerator.Stage.OFF
                ) {
                    return getInFourChannels(0);
                }
                
                op1Output     = this.op1.getOperatorOutput(feedbackOutput);
                op2Output     = this.op2.getOperatorOutput(Operator.noModulator);
                op3Output     = this.op3.getOperatorOutput(op2Output * this.toPhase);               
                op4Output     = this.op4.getOperatorOutput(Operator.noModulator);
                channelOutput = (op1Output + op3Output + op4Output) / 3;
                break;
        }
        
        this.feedback[0] = this.feedback[1];
        this.feedback[1] = (op1Output * ChannelData.feedback[this.fb]) % 1;        
        
        return this.getInFourChannels(channelOutput);
    }
    
    Channel4op.prototype.keyOn = function()
    {
        this.op1.keyOn();
        this.op2.keyOn();
        this.op3.keyOn();
        this.op4.keyOn();
        
        this.feedback[0] = this.feedback[1] = 0;
    }
    
    Channel4op.prototype.keyOff = function()
    {
        this.op1.keyOff();
        this.op2.keyOff();        
        this.op3.keyOff();        
        this.op4.keyOff();        
    }
    
    Channel4op.prototype.updateOperators = function()
    {
        // Key Scale Number, used in EnvelopeGenerator.setActualRates().
        var keyScaleNumber = this.block * 2 + ((this.fnumh >> OPL3.nts) & 0x01);
        var f_number       = (this.fnumh << 8) | this.fnuml;           
        
        this.op1.updateOperator(keyScaleNumber, f_number, this.block);        
        this.op2.updateOperator(keyScaleNumber, f_number, this.block);     
        this.op3.updateOperator(keyScaleNumber, f_number, this.block);     
        this.op4.updateOperator(keyScaleNumber, f_number, this.block);     
    }
    
    /**
     * There's just one instance of this class, that fills the eventual gaps in
     * the Channel array;
     */
    var DisabledChannel = function()
    {
        Channel.call(this, 0);
    }
    
    DisabledChannel.prototype             = new Channel();
    DisabledChannel.prototype.constructor = Channel2op;
    
    DisabledChannel.prototype.getChannelOutput = function(){ }
    DisabledChannel.prototype.keyOn            = function(){ }
    DisabledChannel.prototype.keyOff           = function(){ }
    DisabledChannel.prototype.updateOperators  = function(){ }
    
    /**
     * Operator
     */
    var Operator = function(baseAddress)
    {
        this.baseAddress       = baseAddress;
        this.phaseGenerator    = new PhaseGenerator();
        this.envelopeGenerator = new EnvelopeGenerator();
        
        this.envelope = 0, this.phase = 0;
        this.am = this.vib = this.ksr = this.egt = this.mult = this.ksl
                = this.tl = this.ar = this.dr = this.sl = this.rr = this.ws
                = 0;
        this.keyScaleNumber = this.f_number = block = 0;
    }

    Operator.noModulator = 0;

    Operator.prototype.update_AM1_VIB1_EGT1_KSR1_MULT4 = function()
    {
        var am1_vib1_egt1_ksr1_mult4 = OPL3.registers[this.baseAddress + OperatorData.AM1_VIB1_EGT1_KSR1_MULT4_Offset];
        
        // Amplitude Modulation. This register is used int EnvelopeGenerator.getEnvelope();
        this.am = (am1_vib1_egt1_ksr1_mult4 & 0x80) >> 7;
        
        // Vibrato. This register is used in PhaseGenerator.getPhase();
        this.vib = (am1_vib1_egt1_ksr1_mult4 & 0x40) >> 6;
        
        // Envelope Generator Type. This register is used in EnvelopeGenerator.getEnvelope();
        this.egt = (am1_vib1_egt1_ksr1_mult4 & 0x20) >> 5;
        
        // Key Scale Rate. Sets the actual envelope rate together with rate and keyScaleNumber.
        // This register os used in EnvelopeGenerator.setActualAttackRate().
        this.ksr = (am1_vib1_egt1_ksr1_mult4 & 0x10) >> 4;
        
        // Multiple. Multiplies the Channel.baseFrequency to get the Operator.operatorFrequency.
        // This register is used in PhaseGenerator.setFrequency().
        this.mult = am1_vib1_egt1_ksr1_mult4 & 0x0f;
        
        this.phaseGenerator.setFrequency(this.f_number, this.block, this.mult);
        this.envelopeGenerator.setActualAttackRate(this.ar, this.ksr, this.keyScaleNumber);
        this.envelopeGenerator.setActualDecayRate(this.dr, this.ksr, this.keyScaleNumber); 
        this.envelopeGenerator.setActualReleaseRate(this.rr, this.ksr, this.keyScaleNumber);        
    }
    
    Operator.prototype.update_KSL2_TL6 = function()
    {
        var ksl2_tl6 = OPL3.registers[this.baseAddress + OperatorData.KSL2_TL6_Offset];
        
        // Key Scale Level. Sets the attenuation in accordance with the octave.
        this.ksl = (ksl2_tl6 & 0xc0) >> 6;
        
        // Total Level. Sets the overall damping for the envelope.
        this.tl =  ksl2_tl6 & 0x3f;
        
        this.envelopeGenerator.setAtennuation(this.f_number, this.block, this.ksl);
        this.envelopeGenerator.setTotalLevel(this.tl);
    }
    
    Operator.prototype.update_AR4_DR4 = function()
    {
        var ar4_dr4 = OPL3.registers[this.baseAddress + OperatorData.AR4_DR4_Offset];
        
        // Attack Rate.
        this.ar = (ar4_dr4 & 0xf0) >> 4;
        
        // Decay Rate.
        this.dr = ar4_dr4 & 0x0f;

        this.envelopeGenerator.setActualAttackRate(this.ar, this.ksr, this.keyScaleNumber);
        this.envelopeGenerator.setActualDecayRate(this.dr, this.ksr, this.keyScaleNumber);
    }
    
    Operator.prototype.update_SL4_RR4 = function()
    {     
        var sl4_rr4 = OPL3.registers[this.baseAddress + OperatorData.SL4_RR4_Offset];
        
        // Sustain Level.
        this.sl = (sl4_rr4 & 0xf0) >> 4;
        
        // Release Rate.
        this.rr = sl4_rr4 & 0x0f;
        
        this.envelopeGenerator.setActualSustainLevel(this.sl);
        this.envelopeGenerator.setActualReleaseRate(this.rr, this.ksr, this.keyScaleNumber);        
    }
    
    Operator.prototype.update_5_WS3 = function()
    {     
        var _5_ws3 = OPL3.registers[this.baseAddress + OperatorData._5_WS3_Offset];
        
        this.ws = _5_ws3 & 0x07;
    }
    
    Operator.prototype.getOperatorOutput = function(modulator)
    {
        if (this.envelopeGenerator.stage == EnvelopeGenerator.Stage.OFF) {
            return 0;
        }
        
        var envelopeInDB = this.envelopeGenerator.getEnvelope(this.egt, this.am);
        this.envelope    = Math.pow(10, envelopeInDB / 10.0);
        
        // If it is in OPL2 mode, use first four waveforms only:
        this.ws &= ((OPL3._new << 2) + 3); 
        var waveform = OperatorData.waveforms[this.ws];
        this.phase   = this.phaseGenerator.getPhase(this.vib);
        
        return this.getOutput(modulator, phase, waveform);
    }
    
    Operator.prototype.getOutput = function(modulator, outputPhase, waveform)
    {
        outputPhase = (outputPhase + modulator) % 1;
        
        if (outputPhase < 0) {
            outputPhase++;
            // If the double could not afford to be less than 1:
            outputPhase %= 1;
        }
        
        var sampleIndex = Math.floor(outputPhase * OperatorData.waveLength);
        
        return waveform[sampleIndex] * this.envelope;
    }    

    Operator.prototype.keyOn = function()
    {
        if (ar > 0) {
            this.envelopeGenerator.keyOn();
            this.phaseGenerator.keyOn();
        } else {
            this.envelopeGenerator.stage = EnvelopeGenerator.Stage.OFF;
        }
    }
    
    Operator.prototype.keyOff = function()
    {
        this.envelopeGenerator.keyOff();
    }
 
    Operator.prototype.updateOperator = function(ksn, f_num, blk)
    {
        this.keyScaleNumber = ksn;
        this.f_number       = f_num;
        this.block          = blk;
        
        this.update_AM1_VIB1_EGT1_KSR1_MULT4();
        this.update_KSL2_TL6();
        this.update_AR4_DR4();
        this.update_SL4_RR4();     
        this.update_5_WS3();    
    }
    
    /**
     * Envelope generator
     */
    var EnvelopeGenerator = function()
    {
        this.stage              = EnvelopeGenerator.Stage.OFF;
        this.actualAttackRate   = this.actualDecayRate = this.actualReleaseRate = 0;
        this.xAttackIncrement   = this.xMinimumInAttack = 0;
        this.dBdecayIncrement   = 0;
        this.dBreleaseIncrement = 0;     
        this.attenuation        = this.totalLevel = this.sustainLevel = 0;
        this.x                  = this.dBtoX(-96);
        this.envelope           = -96;    
    }
    
    EnvelopeGenerator.Stage = {
        OFF:     'off',
        ATTACK:  'attack',
        DECAY:   'decay',
        SUSTAIN: 'sustay',
        RELEASE: 'release'
    };
    EnvelopeGenerator.INFINITY = null;
    
    EnvelopeGenerator.prototype.setActualSustainLevel = function(sl)
    {
        // If all SL bits are 1, sustain level is set to -93 dB:
        if (sl == 0x0f) {
            this.sustainLevel = -93;
            return;
        } 
        
        // The datasheet states that the SL formula is
        // sustainLevel = -24*d7 -12*d6 -6*d5 -3*d4,
        // translated as:
        this.sustainLevel = -3*sl;
    }

    EnvelopeGenerator.prototype.setTotalLevel = function(tl)
    {
        // The datasheet states that the TL formula is
        // TL = -(24*d5 + 12*d4 + 6*d3 + 3*d2 + 1.5*d1 + 0.75*d0),
        // translated as:
        this.totalLevel = this.tl * -0.75;
    }
    
    EnvelopeGenerator.prototype.setAtennuation = function(f_number, block, ksl)
    {
        var hi4bits = (f_number >> 6) & 0x0f;
        
        switch (this.ksl) {
            case 0:
                this.attenuation = 0;
                break;
                
            case 1:
                // ~3 dB/Octave
                this.attenuation = OperatorData.ksl3dBtable[hi4bits][block];
                break;
                
            case 2:
                // ~1.5 dB/Octave
                this.attenuation = OperatorData.ksl3dBtable[hi4bits][block] / 2;
                break;
                
            case 3:
                // ~6 dB/Octave
                this.attenuation = OperatorData.ksl3dBtable[hi4bits][block]*2;
                break;
        }
    }

    EnvelopeGenerator.prototype.setActualAttackRate = function(attackRate, ksr, keyScaleNumber)
    {
        // According to the YMF278B manual's OPL3 section, the attack curve is exponential,
        // with a dynamic range from -96 dB to 0 dB and a resolution of 0.1875 dB 
        // per level.
        //
        // This method sets an attack increment and attack minimum value 
        // that creates a exponential dB curve with 'period0to100' seconds in length
        // and 'period10to90' seconds between 10% and 90% of the curve total level.
        this.actualAttackRate = this.calculateActualRate(attackRate, ksr, keyScaleNumber);
        
        var period0to100inSeconds = EnvelopeGeneratorData.attackTimeValuesTable[actualAttackRate][0] / 1000;
        var period0to100inSamples = Math.floor(period0to100inSeconds * OPL3Data.sampleRate);       
        var period10to90inSeconds = EnvelopeGeneratorData.attackTimeValuesTable[actualAttackRate][1] / 1000;
        var period10to90inSamples = Math.floor(period10to90inSeconds * OPL3Data.sampleRate);
        
        // The x increment is dictated by the period between 10% and 90%:
        this.xAttackIncrement = OPL3Data.calculateIncrement(this.percentageToX(0.1), this.percentageToX(0.9), period10to90inSeconds);
        
        // Discover how many samples are still from the top.
        // It cannot reach 0 dB, since x is a logarithmic parameter and would be
        // negative infinity. So we will use -0.1875 dB as the resolution
        // maximum.
        //
        // percentageToX(0.9) + samplesToTheTop*xAttackIncrement = dBToX(-0.1875); ->
        // samplesToTheTop = (dBtoX(-0.1875) - percentageToX(0.9)) / xAttackIncrement); ->
        // period10to100InSamples = period10to90InSamples + samplesToTheTop; ->
        var period10to100inSamples = Math.floor(period10to90inSamples + (this.dBtoX(-0.1875) - this.percentageToX(0.9)) / this.xAttackIncrement);
        
        // Discover the minimum x that, through the attackIncrement value, keeps 
        // the 10%-90% period, and reaches 0 dB at the total period:
        this.xMinimumInAttack = this.percentageToX(0.1) - (period0to100inSamples - period10to100inSamples) * this.xAttackIncrement;
    } 
    
    EnvelopeGenerator.prototype.setActualDecayRate = function(decayRate, ksr, keyScaleNumber)
    {
        this.actualDecayRate = this.calculateActualRate(decayRate, ksr, keyScaleNumber);
        
        var period10to90inSeconds = EnvelopeGeneratorData.decayAndReleaseTimeValuesTable[actualDecayRate][1] / 1000;
        
        // Differently from the attack curve, the decay/release curve is linear.        
        // The dB increment is dictated by the period between 10% and 90%:
        this.dBdecayIncrement = OPL3Data.calculateIncrement(this.percentageToDB(0.1), this.percentageToDB(0.9), period10to90inSeconds);
    }
    
    EnvelopeGenerator.prototype.setActualReleaseRate = function(releaseRate, ksr, keyScaleNumber)
    {
        this.actualReleaseRate = this.calculateActualRate(releaseRate, ksr, keyScaleNumber);
        
        var period10to90inSeconds = EnvelopeGeneratorData.decayAndReleaseTimeValuesTable[actualReleaseRate][1] / 1000;
        
        this.dBreleaseIncrement = OPL3Data.calculateIncrement(this.percentageToDB(0.1), this.percentageToDB(0.9), period10to90inSeconds);
    } 
    
    EnvelopeGenerator.prototype.calculateActualRate = function(rate, ksr, keyScaleNumber)
    {
        var rof        = EnvelopeGeneratorData.rateOffset[ksr][keyScaleNumber];
        var actualRate = rate * 4 + rof;
        
        // If, as an example at the maximum, rate is 15 and the rate offset is 15, 
        // the value would
        // be 75, but the maximum allowed is 63:
        if (actualRate > 63) {
            actualRate = 63;
        }
        
        return actualRate;
    }
    
    EnvelopeGenerator.prototype.getEnvelope = function(egt, am)
    {
        // The datasheets attenuation values
        // must be halved to match the real OPL3 output.
        var envelopeSustainLevel = this.sustainLevel / 2;
        var envelopeTremolo      =  OPL3Data.tremoloTable[OPL3.dam][OPL3.tremoloIndex] / 2;
        var envelopeAttenuation  = this.attenuation / 2;
        var envelopeTotalLevel   = this.totalLevel / 2;
        var envelopeMinimum      = -96;
        var envelopeResolution   = 0.1875;
        var outputEnvelope;
        
        // Envelope generation
        switch(this.stage) {
            case EnvelopeGenerator.Stage.ATTACK:
                // Since the attack is exponential, it will never reach 0 dB, so
                // we'll work with the next to maximum in the envelope resolution.
                if (this.envelope < -envelopeResolution && this.xAttackIncrement != -EnvelopeGeneratorData.INFINITY) {
                    // The attack is exponential.
                    this.envelope = -Math.pow(2, x);
                    this.x       += this.xAttackIncrement;
                    break;
                } else {
                    // It is needed here to explicitly set envelope = 0, since
                    // only the attack can have a period of
                    // 0 seconds and produce an infinity envelope increment.
                    this.envelope = 0;
                    this.stage    = EnvelopeGenerator.Stage.DECAY;
                }
                // Break intentionally omitted.
                
            case EnvelopeGenerator.Stage.DECAY:   
                // The decay and release are linear.                
                if (this.envelope > envelopeSustainLevel) {
                    this.envelope -= this.dBdecayIncrement;
                    break;
                } else {
                    this.stage = EnvelopeGenerator.Stage.SUSTAIN;
                }
                // Break intentionally omitted.
                
            case EnvelopeGenerator.Stage.SUSTAIN:
                // The Sustain stage is mantained all the time of the Key ON,
                // even if we are in non-sustaining mode.
                // This is necessary because, if the key is still pressed, we can
                // change back and forth the state of EGT, and it will release and
                // hold again accordingly.
                if (egt==1) {
                    break;                
                } else {
                    if (this.envelope > envelopeMinimum) {
                        this.envelope -= this.dBreleaseIncrement;
                    } else {
                        this.stage = EnvelopeGenerator.Stage.OFF;
                    }
                }
                break;
                
            case EnvelopeGenerator.Stage.RELEASE:
                // If we have Key OFF, only here we are in the Release stage.
                // Now, we can turn EGT back and forth and it will have no effect,i.e.,
                // it will release inexorably to the Off stage.
                if (this.envelope > envelopeMinimum) {
                    this.envelope -= this.dBreleaseIncrement;
                } else {
                    this.stage = EnvelopeGenerator.Stage.OFF;
                }
        }
        
        // Ongoing original envelope
        outputEnvelope = this.envelope;    
        
        //Tremolo
        if (am == 1) {
            outputEnvelope += envelopeTremolo;
        }

        //Attenuation
        outputEnvelope += envelopeAttenuation;

        //Total Level
        outputEnvelope += envelopeTotalLevel;

        return outputEnvelope;
    }

    EnvelopeGenerator.prototype.keyOn = function()
    {
        // If we are taking it in the middle of a previous envelope, 
        // start to rise from the current level:
        // envelope = - (2 ^ x); ->
        // 2 ^ x = -envelope ->
        // x = log2(-envelope); ->
        var xCurrent = OperatorData.log2(-envelope);
        
        this.x     = xCurrent < xMinimumInAttack ? xCurrent : xMinimumInAttack;
        this.stage = EnvelopeGenerator.Stage.ATTACK;
    }
    
    EnvelopeGenerator.prototype.keyOff = function()
    {
        if (this.stage != EnvelopeGenerator.Stage.OFF) {
            this.stage = EnvelopeGenerator.Stage.RELEASE;
        }
    }
    
    EnvelopeGenerator.prototype.dBtoX = function(dB)
    {
        return OperatorData.log2(-dB);
    }

    EnvelopeGenerator.prototype.percentageToDB = function(percentage)
    {
        return Math.log10(percentage) * 10;
    }    
    
    EnvelopeGenerator.prototype.percentageToX = function(percentage)
    {
        return this.dBtoX(this.percentageToDB(percentage));
    }  
    
    /**
     * Phase generator
     */
    var PhaseGenerator = function()
    {
        this.phase = this.phaseIncrement = 0;
    }
    
    PhaseGenerator.prototype.setFrequency = function(f_number, block, mult)
    {
        // This frequency formula is derived from the following equation:
        // f_number = baseFrequency * pow(2,19) / sampleRate / pow(2,block-1);        
        var baseFrequency     = f_number * Math.pow(2, block - 1) * OPL3Data.sampleRate / Math.pow(2, 19);
        var operatorFrequency = baseFrequency * OperatorData.multTable[mult];
        
        // phase goes from 0 to 1 at 
        // period = (1/frequency) seconds ->
        // Samples in each period is (1/frequency)*sampleRate =
        // = sampleRate/frequency ->
        // So the increment in each sample, to go from 0 to 1, is:
        // increment = (1-0) / samples in the period -> 
        // increment = 1 / (OPL3Data.sampleRate/operatorFrequency) ->
        this.phaseIncrement = operatorFrequency / OPL3Data.sampleRate;
    }
    
    PhaseGenerator.prototype.getPhase = function(vib)
    {
        if (vib == 1) {
            // phaseIncrement = (operatorFrequency * vibrato) / sampleRate
            this.phase += this.phaseIncrement * OPL3Data.vibratoTable[OPL3.dvb][OPL3.vibratoIndex];
        } else {
            // phaseIncrement = operatorFrequency / sampleRate
            this.phase += this.phaseIncrement;
        }
        
        this.phase %= 1;
        
        return this.phase;
    }
    
    PhaseGenerator.prototype.keyOn = function()
    {
        this.phase = 0;
    }
    
    /**
     * Rhythm.
     * 
     * The getOperatorOutput() method in TopCymbalOperator, HighHatOperator and SnareDrumOperator 
     * were made through purely empyrical reverse engineering of the OPL3 output.
     */
    var RhythmChannel = function(baseAddress, o1, o2)
    {
        Channel2op.call(this, baseAddress, o1, o2);
    }
    
    RhythmChannel.prototype             = new Channel2op();
    RhythmChannel.prototype.constructor = RhythmChannel;
    
    RhythmChannel.prototype.getChannelOutput = function()
    {
        var channelOutput = 0, op1Output = 0, op2Output = 0;
        
        // Note that, different from the common channel,
        // we do not check to see if the Operator's envelopes are Off.
        // Instead, we always do the calculations, 
        // to update the publicly available phase.
        
        op1Output     = this.op1.getOperatorOutput(Operator.noModulator);
        op2Output     = this.op2.getOperatorOutput(Operator.noModulator);        
        channelOutput = (op1Output + op2Output) / 2;
        
        return getInFourChannels(channelOutput);        
    }
    
    RhythmChannel.prototype.keyOn  = function(){ }
    RhythmChannel.prototype.keyOff = function(){ }
    
    // HighHatSnareDrumChannel
    var HighHatSnareDrumChannel = function()
    {
        RhythmChannel.call(this, 7, OPL3.highHatOperator, OPL3.snareDrumOperator);
    }
    
    HighHatSnareDrumChannel.prototype             = new RhythmChannel();
    HighHatSnareDrumChannel.prototype.constructor = HighHatSnareDrumChannel;
    
    // TomTomTopCymbalChannel
    var TomTomTopCymbalChannel = function()
    {
        RhythmChannel.call(this, 8, OPL3.tomTomOperator, OPL3.topCymbalOperator);
    }
    
    TomTomTopCymbalChannel.prototype             = new RhythmChannel();
    TomTomTopCymbalChannel.prototype.constructor = TomTomTopCymbalChannel;
    
    // TopCymbalOperator
    var TopCymbalOperator = function(baseAddress)
    {
        Operator.call(this, typeof(baseAddress) == 'undefined' ? 0x15 : baseAddress);
    }
    
    TopCymbalOperator.prototype             = new Operator();
    TopCymbalOperator.prototype.constructor = TopCymbalOperator;
    
    TopCymbalOperator.prototype.getOperatorOutput = function(modulator)
    {
        var highHatOperatorPhase =  OPL3.highHatOperator.phase * OperatorData.multTable[OPL3.highHatOperator.mult];
        
        // The Top Cymbal operator uses his own phase together with the High Hat phase.
        return this.getOperatorOutput(modulator, highHatOperatorPhase);
    }

    TopCymbalOperator.prototype.getOperatorOutput = function(modulator, externalPhase)
    {
        var envelopeInDB = envelopeGenerator.getEnvelope(this.egt, this.am);
        this.envelope = Math.pow(10, envelopeInDB / 10.0);
        
        this.phase = this.phaseGenerator.getPhase(this.vib);
        
        var waveIndex = this.ws & ((OPL3._new << 2) + 3); 
        var waveform  = OperatorData.waveforms[waveIndex];
        
        // Empirically tested multiplied phase for the Top Cymbal:
        var carrierPhase    = (8 * this.phase) % 1;
        var modulatorPhase  = externalPhase;
        var modulatorOutput = this.getOutput(Operator.noModulator, modulatorPhase, waveform);
        var carrierOutput   = this.getOutput(modulatorOutput, carrierPhase, waveform);
        
        var cycles = 4; 
        
        if ((carrierPhase * cycles) % cycles > 0.1) {
            carrierOutput = 0;
        }
        
        return carrierOutput * 2;  
    }    

    // HighHatOperator
    var HighHatOperator = function()
    {
        TopCymbalOperator.call(this, 0x11);
    }
    
    HighHatOperator.prototype             = new OpeTopCymbalOperatorrator();
    HighHatOperator.prototype.constructor = HighHatOperator;
    
    HighHatOperator.prototype.getOperatorOutput = function(modulator)
    {
        var topCymbalOperatorPhase = OPL3.topCymbalOperator.phase * OperatorData.multTable[OPL3.topCymbalOperator.mult];

        var operatorOutput = TopCymbalOperator.prototype.getOperatorOutput.call(this, modulator, topCymbalOperatorPhase);
        
        if (operatorOutput == 0) {
            operatorOutput = Math.random() * this.envelope;
        }
        
        return operatorOutput;
    }

    // SnareDrumOperator
    var SnareDrumOperator = function()
    {
        Operator.call(this, 0x14);
    }
    
    SnareDrumOperator.prototype             = new Operator();
    SnareDrumOperator.prototype.constructor = SnareDrumOperator;
    
    SnareDrumOperator.prototype.getOperatorOutput = function(modulator)
    {
        if (this.envelopeGenerator.stage == EnvelopeGenerator.Stage.OFF) {
            return 0;
        }
        
        var envelopeInDB = this.envelopeGenerator.getEnvelope(this.egt, this.am);
        this.envelope    = Math.pow(10, envelopeInDB / 10.0);
        
        // If it is in OPL2 mode, use first four waveforms only:
        var waveIndex = this.ws & ((OPL3._new << 2) + 3); 
        var waveform  = OperatorData.waveforms[waveIndex];
        
        this.phase = OPL3.highHatOperator.phase * 2;
        
        this.operatorOutput = this.getOutput(modulator, phase, waveform);

        var noise = Math.random() * this.envelope;        
        
        if (operatorOutput / this.envelope != 1 && operatorOutput / this.envelope != -1) {
            if (operatorOutput > 0) {
                operatorOutput = noise;
            } else if (operatorOutput < 0) {
                operatorOutput = -noise;
            } else {
                operatorOutput = 0;            
            }
        }
        
        return operatorOutput * 2;
    }

    // TomTomOperator
    var TomTomOperator = function()
    {
        Operator.call(this, 0x12);
    }
    
    TomTomOperator.prototype             = new Operator();
    TomTomOperator.prototype.constructor = TomTomOperator;

    // BassDrumChannel
    var BassDrumChannel = function()
    {
        Channel2op.call(this, 6, new Operator(0x10), new Operator(0x13));
    }
    
    BassDrumChannel.prototype             = new Channel2op();
    BassDrumChannel.prototype.constructor = BassDrumChannel;

    BassDrumChannel.prototype.getChannelOutput = function()
    {
        // Bass Drum ignores first operator, when it is in series.
        if (this.cnt == 1) {
            this.op1.ar = 0;
        }
        
        return Channel2op.prototype.getChannelOutput.call(this);
    }    
    
    // Key ON and OFF are unused in rhythm channels.
    BassDrumChannel.prototype.keyOn  = function(){ }    
    BassDrumChannel.prototype.keyOff = function(){ }    

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
            return (end - begin) / OPL3Data.sampleRate * (1 / period);
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
