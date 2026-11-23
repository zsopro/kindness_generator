// qr.js – QR-kód kódoló (bájt mód, L/M/Q/H hibajavítás, automatikus verzió) + a modulmátrix-leíró a megjelenítőknek.
// A kódoló Kazuhiko Arase "QRCode for JavaScript" könyvtára (MIT licenc, Copyright (c) 2009 Kazuhiko Arase, http://www.d-project.com/),
// a qrcode-terminal csomag módosított változatából egyetlen ES modulba csomagolva. A "QR Code" a DENSO WAVE INCORPORATED bejegyzett védjegye.
// Licenc: http://www.opensource.org/licenses/mit-license.php – az ingyenes használat feltétele a fenti szerzői jogi közlemény megtartása.
const __defs = {};
const __req = p => __defs[p.replace('./', '')];
function __file(name, fn) { const module = { exports: {} }; fn(module, __req); __defs[name] = module.exports; }
__file('QRMode', function (module, require) {
module.exports = {
    MODE_NUMBER :       1 << 0,
    MODE_ALPHA_NUM :    1 << 1,
    MODE_8BIT_BYTE :    1 << 2,
    MODE_KANJI :        1 << 3
};

});
__file('QRErrorCorrectLevel', function (module, require) {
module.exports = {
	L : 1,
	M : 0,
	Q : 3,
	H : 2
};


});
__file('QRMaskPattern', function (module, require) {
module.exports = {
	PATTERN000 : 0,
	PATTERN001 : 1,
	PATTERN010 : 2,
	PATTERN011 : 3,
	PATTERN100 : 4,
	PATTERN101 : 5,
	PATTERN110 : 6,
	PATTERN111 : 7
};

});
__file('QRMath', function (module, require) {
var QRMath = {

	glog : function(n) {
	
		if (n < 1) {
			throw new Error("glog(" + n + ")");
		}
		
		return QRMath.LOG_TABLE[n];
	},
	
	gexp : function(n) {
	
		while (n < 0) {
			n += 255;
		}
	
		while (n >= 256) {
			n -= 255;
		}
	
		return QRMath.EXP_TABLE[n];
	},
	
	EXP_TABLE : new Array(256),
	
	LOG_TABLE : new Array(256)

};
	
for (var i = 0; i < 8; i++) {
	QRMath.EXP_TABLE[i] = 1 << i;
}
for (var i = 8; i < 256; i++) {
	QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4]
		^ QRMath.EXP_TABLE[i - 5]
		^ QRMath.EXP_TABLE[i - 6]
		^ QRMath.EXP_TABLE[i - 8];
}
for (var i = 0; i < 255; i++) {
	QRMath.LOG_TABLE[QRMath.EXP_TABLE[i] ] = i;
}

module.exports = QRMath;

});
__file('QRPolynomial', function (module, require) {
var QRMath = require('./QRMath');

function QRPolynomial(num, shift) {
	if (num.length === undefined) {
		throw new Error(num.length + "/" + shift);
	}

	var offset = 0;

	while (offset < num.length && num[offset] === 0) {
		offset++;
	}

	this.num = new Array(num.length - offset + shift);
	for (var i = 0; i < num.length - offset; i++) {
		this.num[i] = num[i + offset];
	}
}

QRPolynomial.prototype = {

	get : function(index) {
		return this.num[index];
	},
	
	getLength : function() {
		return this.num.length;
	},
	
	multiply : function(e) {
	
		var num = new Array(this.getLength() + e.getLength() - 1);
	
		for (var i = 0; i < this.getLength(); i++) {
			for (var j = 0; j < e.getLength(); j++) {
				num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i) ) + QRMath.glog(e.get(j) ) );
			}
		}
	
		return new QRPolynomial(num, 0);
	},
	
	mod : function(e) {
	
		if (this.getLength() - e.getLength() < 0) {
			return this;
		}
	
		var ratio = QRMath.glog(this.get(0) ) - QRMath.glog(e.get(0) );
	
		var num = new Array(this.getLength() );
		
		for (var i = 0; i < this.getLength(); i++) {
			num[i] = this.get(i);
		}
		
		for (var x = 0; x < e.getLength(); x++) {
			num[x] ^= QRMath.gexp(QRMath.glog(e.get(x) ) + ratio);
		}
	
		// recursive call
		return new QRPolynomial(num, 0).mod(e);
	}
};

module.exports = QRPolynomial;

});
__file('QRRSBlock', function (module, require) {
var QRErrorCorrectLevel = require('./QRErrorCorrectLevel');

function QRRSBlock(totalCount, dataCount) {
	this.totalCount = totalCount;
	this.dataCount  = dataCount;
}

QRRSBlock.RS_BLOCK_TABLE = [

	// L
	// M
	// Q
	// H

	// 1
	[1, 26, 19],
	[1, 26, 16],
	[1, 26, 13],
	[1, 26, 9],
	
	// 2
	[1, 44, 34],
	[1, 44, 28],
	[1, 44, 22],
	[1, 44, 16],

	// 3
	[1, 70, 55],
	[1, 70, 44],
	[2, 35, 17],
	[2, 35, 13],

	// 4		
	[1, 100, 80],
	[2, 50, 32],
	[2, 50, 24],
	[4, 25, 9],
	
	// 5
	[1, 134, 108],
	[2, 67, 43],
	[2, 33, 15, 2, 34, 16],
	[2, 33, 11, 2, 34, 12],
	
	// 6
	[2, 86, 68],
	[4, 43, 27],
	[4, 43, 19],
	[4, 43, 15],
	
	// 7		
	[2, 98, 78],
	[4, 49, 31],
	[2, 32, 14, 4, 33, 15],
	[4, 39, 13, 1, 40, 14],
	
	// 8
	[2, 121, 97],
	[2, 60, 38, 2, 61, 39],
	[4, 40, 18, 2, 41, 19],
	[4, 40, 14, 2, 41, 15],
	
	// 9
	[2, 146, 116],
	[3, 58, 36, 2, 59, 37],
	[4, 36, 16, 4, 37, 17],
	[4, 36, 12, 4, 37, 13],
	
	// 10		
	[2, 86, 68, 2, 87, 69],
	[4, 69, 43, 1, 70, 44],
	[6, 43, 19, 2, 44, 20],
	[6, 43, 15, 2, 44, 16],

	// 11
	[4, 101, 81],
	[1, 80, 50, 4, 81, 51],
	[4, 50, 22, 4, 51, 23],
	[3, 36, 12, 8, 37, 13],

	// 12
	[2, 116, 92, 2, 117, 93],
	[6, 58, 36, 2, 59, 37],
	[4, 46, 20, 6, 47, 21],
	[7, 42, 14, 4, 43, 15],

	// 13
	[4, 133, 107],
	[8, 59, 37, 1, 60, 38],
	[8, 44, 20, 4, 45, 21],
	[12, 33, 11, 4, 34, 12],

	// 14
	[3, 145, 115, 1, 146, 116],
	[4, 64, 40, 5, 65, 41],
	[11, 36, 16, 5, 37, 17],
	[11, 36, 12, 5, 37, 13],

	// 15
	[5, 109, 87, 1, 110, 88],
	[5, 65, 41, 5, 66, 42],
	[5, 54, 24, 7, 55, 25],
	[11, 36, 12],

	// 16
	[5, 122, 98, 1, 123, 99],
	[7, 73, 45, 3, 74, 46],
	[15, 43, 19, 2, 44, 20],
	[3, 45, 15, 13, 46, 16],

	// 17
	[1, 135, 107, 5, 136, 108],
	[10, 74, 46, 1, 75, 47],
	[1, 50, 22, 15, 51, 23],
	[2, 42, 14, 17, 43, 15],

	// 18
	[5, 150, 120, 1, 151, 121],
	[9, 69, 43, 4, 70, 44],
	[17, 50, 22, 1, 51, 23],
	[2, 42, 14, 19, 43, 15],

	// 19
	[3, 141, 113, 4, 142, 114],
	[3, 70, 44, 11, 71, 45],
	[17, 47, 21, 4, 48, 22],
	[9, 39, 13, 16, 40, 14],

	// 20
	[3, 135, 107, 5, 136, 108],
	[3, 67, 41, 13, 68, 42],
	[15, 54, 24, 5, 55, 25],
	[15, 43, 15, 10, 44, 16],

	// 21
	[4, 144, 116, 4, 145, 117],
	[17, 68, 42],
	[17, 50, 22, 6, 51, 23],
	[19, 46, 16, 6, 47, 17],

	// 22
	[2, 139, 111, 7, 140, 112],
	[17, 74, 46],
	[7, 54, 24, 16, 55, 25],
	[34, 37, 13],

	// 23
	[4, 151, 121, 5, 152, 122],
	[4, 75, 47, 14, 76, 48],
	[11, 54, 24, 14, 55, 25],
	[16, 45, 15, 14, 46, 16],

	// 24
	[6, 147, 117, 4, 148, 118],
	[6, 73, 45, 14, 74, 46],
	[11, 54, 24, 16, 55, 25],
	[30, 46, 16, 2, 47, 17],

	// 25
	[8, 132, 106, 4, 133, 107],
	[8, 75, 47, 13, 76, 48],
	[7, 54, 24, 22, 55, 25],
	[22, 45, 15, 13, 46, 16],

	// 26
	[10, 142, 114, 2, 143, 115],
	[19, 74, 46, 4, 75, 47],
	[28, 50, 22, 6, 51, 23],
	[33, 46, 16, 4, 47, 17],

	// 27
	[8, 152, 122, 4, 153, 123],
	[22, 73, 45, 3, 74, 46],
	[8, 53, 23, 26, 54, 24],
	[12, 45, 15, 28, 46, 16],

	// 28
	[3, 147, 117, 10, 148, 118],
	[3, 73, 45, 23, 74, 46],
	[4, 54, 24, 31, 55, 25],
	[11, 45, 15, 31, 46, 16],

	// 29
	[7, 146, 116, 7, 147, 117],
	[21, 73, 45, 7, 74, 46],
	[1, 53, 23, 37, 54, 24],
	[19, 45, 15, 26, 46, 16],

	// 30
	[5, 145, 115, 10, 146, 116],
	[19, 75, 47, 10, 76, 48],
	[15, 54, 24, 25, 55, 25],
	[23, 45, 15, 25, 46, 16],

	// 31
	[13, 145, 115, 3, 146, 116],
	[2, 74, 46, 29, 75, 47],
	[42, 54, 24, 1, 55, 25],
	[23, 45, 15, 28, 46, 16],

	// 32
	[17, 145, 115],
	[10, 74, 46, 23, 75, 47],
	[10, 54, 24, 35, 55, 25],
	[19, 45, 15, 35, 46, 16],

	// 33
	[17, 145, 115, 1, 146, 116],
	[14, 74, 46, 21, 75, 47],
	[29, 54, 24, 19, 55, 25],
	[11, 45, 15, 46, 46, 16],

	// 34
	[13, 145, 115, 6, 146, 116],
	[14, 74, 46, 23, 75, 47],
	[44, 54, 24, 7, 55, 25],
	[59, 46, 16, 1, 47, 17],

	// 35
	[12, 151, 121, 7, 152, 122],
	[12, 75, 47, 26, 76, 48],
	[39, 54, 24, 14, 55, 25],
	[22, 45, 15, 41, 46, 16],

	// 36
	[6, 151, 121, 14, 152, 122],
	[6, 75, 47, 34, 76, 48],
	[46, 54, 24, 10, 55, 25],
	[2, 45, 15, 64, 46, 16],

	// 37
	[17, 152, 122, 4, 153, 123],
	[29, 74, 46, 14, 75, 47],
	[49, 54, 24, 10, 55, 25],
	[24, 45, 15, 46, 46, 16],

	// 38
	[4, 152, 122, 18, 153, 123],
	[13, 74, 46, 32, 75, 47],
	[48, 54, 24, 14, 55, 25],
	[42, 45, 15, 32, 46, 16],

	// 39
	[20, 147, 117, 4, 148, 118],
	[40, 75, 47, 7, 76, 48],
	[43, 54, 24, 22, 55, 25],
	[10, 45, 15, 67, 46, 16],

	// 40
	[19, 148, 118, 6, 149, 119],
	[18, 75, 47, 31, 76, 48],
	[34, 54, 24, 34, 55, 25],
	[20, 45, 15, 61, 46, 16]
];

QRRSBlock.getRSBlocks = function(typeNumber, errorCorrectLevel) {
	
	var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
	
	if (rsBlock === undefined) {
		throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectLevel:" + errorCorrectLevel);
	}

	var length = rsBlock.length / 3;
	
	var list = [];
	
	for (var i = 0; i < length; i++) {

		var count = rsBlock[i * 3 + 0];
		var totalCount = rsBlock[i * 3 + 1];
		var dataCount  = rsBlock[i * 3 + 2];

		for (var j = 0; j < count; j++) {
			list.push(new QRRSBlock(totalCount, dataCount) );	
		}
	}
	
	return list;
};

QRRSBlock.getRsBlockTable = function(typeNumber, errorCorrectLevel) {

	switch(errorCorrectLevel) {
	case QRErrorCorrectLevel.L :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
	case QRErrorCorrectLevel.M :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
	case QRErrorCorrectLevel.Q :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
	case QRErrorCorrectLevel.H :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
	default :
		return undefined;
	}
};

module.exports = QRRSBlock;

});
__file('QRUtil', function (module, require) {
var QRMode = require('./QRMode');
var QRPolynomial = require('./QRPolynomial');
var QRMath = require('./QRMath');
var QRMaskPattern = require('./QRMaskPattern');

var QRUtil = {

    PATTERN_POSITION_TABLE : [
        [],
        [6, 18],
        [6, 22],
        [6, 26],
        [6, 30],
        [6, 34],
        [6, 22, 38],
        [6, 24, 42],
        [6, 26, 46],
        [6, 28, 50],
        [6, 30, 54],        
        [6, 32, 58],
        [6, 34, 62],
        [6, 26, 46, 66],
        [6, 26, 48, 70],
        [6, 26, 50, 74],
        [6, 30, 54, 78],
        [6, 30, 56, 82],
        [6, 30, 58, 86],
        [6, 34, 62, 90],
        [6, 28, 50, 72, 94],
        [6, 26, 50, 74, 98],
        [6, 30, 54, 78, 102],
        [6, 28, 54, 80, 106],
        [6, 32, 58, 84, 110],
        [6, 30, 58, 86, 114],
        [6, 34, 62, 90, 118],
        [6, 26, 50, 74, 98, 122],
        [6, 30, 54, 78, 102, 126],
        [6, 26, 52, 78, 104, 130],
        [6, 30, 56, 82, 108, 134],
        [6, 34, 60, 86, 112, 138],
        [6, 30, 58, 86, 114, 142],
        [6, 34, 62, 90, 118, 146],
        [6, 30, 54, 78, 102, 126, 150],
        [6, 24, 50, 76, 102, 128, 154],
        [6, 28, 54, 80, 106, 132, 158],
        [6, 32, 58, 84, 110, 136, 162],
        [6, 26, 54, 82, 110, 138, 166],
        [6, 30, 58, 86, 114, 142, 170]
    ],

    G15 : (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
    G18 : (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
    G15_MASK : (1 << 14) | (1 << 12) | (1 << 10)    | (1 << 4) | (1 << 1),

    getBCHTypeInfo : function(data) {
        var d = data << 10;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
            d ^= (QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) ) );    
        }
        return ( (data << 10) | d) ^ QRUtil.G15_MASK;
    },

    getBCHTypeNumber : function(data) {
        var d = data << 12;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
            d ^= (QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) ) );    
        }
        return (data << 12) | d;
    },

    getBCHDigit : function(data) {

        var digit = 0;

        while (data !== 0) {
            digit++;
            data >>>= 1;
        }

        return digit;
    },

    getPatternPosition : function(typeNumber) {
        return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
    },

    getMask : function(maskPattern, i, j) {
        
        switch (maskPattern) {
            
        case QRMaskPattern.PATTERN000 : return (i + j) % 2 === 0;
        case QRMaskPattern.PATTERN001 : return i % 2 === 0;
        case QRMaskPattern.PATTERN010 : return j % 3 === 0;
        case QRMaskPattern.PATTERN011 : return (i + j) % 3 === 0;
        case QRMaskPattern.PATTERN100 : return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 === 0;
        case QRMaskPattern.PATTERN101 : return (i * j) % 2 + (i * j) % 3 === 0;
        case QRMaskPattern.PATTERN110 : return ( (i * j) % 2 + (i * j) % 3) % 2 === 0;
        case QRMaskPattern.PATTERN111 : return ( (i * j) % 3 + (i + j) % 2) % 2 === 0;

        default :
            throw new Error("bad maskPattern:" + maskPattern);
        }
    },

    getErrorCorrectPolynomial : function(errorCorrectLength) {

        var a = new QRPolynomial([1], 0);

        for (var i = 0; i < errorCorrectLength; i++) {
            a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0) );
        }

        return a;
    },

    getLengthInBits : function(mode, type) {

        if (1 <= type && type < 10) {

            // 1 - 9

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 10;
            case QRMode.MODE_ALPHA_NUM  : return 9;
            case QRMode.MODE_8BIT_BYTE  : return 8;
            case QRMode.MODE_KANJI      : return 8;
            default :
                throw new Error("mode:" + mode);
            }

        } else if (type < 27) {

            // 10 - 26

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 12;
            case QRMode.MODE_ALPHA_NUM  : return 11;
            case QRMode.MODE_8BIT_BYTE  : return 16;
            case QRMode.MODE_KANJI      : return 10;
            default :
                throw new Error("mode:" + mode);
            }

        } else if (type < 41) {

            // 27 - 40

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 14;
            case QRMode.MODE_ALPHA_NUM  : return 13;
            case QRMode.MODE_8BIT_BYTE  : return 16;
            case QRMode.MODE_KANJI      : return 12;
            default :
                throw new Error("mode:" + mode);
            }

        } else {
            throw new Error("type:" + type);
        }
    },

    getLostPoint : function(qrCode) {
        
        var moduleCount = qrCode.getModuleCount();
        var lostPoint = 0;
        var row = 0; 
        var col = 0;

        
        // LEVEL1
        
        for (row = 0; row < moduleCount; row++) {

            for (col = 0; col < moduleCount; col++) {

                var sameCount = 0;
                var dark = qrCode.isDark(row, col);

                for (var r = -1; r <= 1; r++) {

                    if (row + r < 0 || moduleCount <= row + r) {
                        continue;
                    }

                    for (var c = -1; c <= 1; c++) {

                        if (col + c < 0 || moduleCount <= col + c) {
                            continue;
                        }

                        if (r === 0 && c === 0) {
                            continue;
                        }

                        if (dark === qrCode.isDark(row + r, col + c) ) {
                            sameCount++;
                        }
                    }
                }

                if (sameCount > 5) {
                    lostPoint += (3 + sameCount - 5);
                }
            }
        }

        // LEVEL2

        for (row = 0; row < moduleCount - 1; row++) {
            for (col = 0; col < moduleCount - 1; col++) {
                var count = 0;
                if (qrCode.isDark(row,     col    ) ) count++;
                if (qrCode.isDark(row + 1, col    ) ) count++;
                if (qrCode.isDark(row,     col + 1) ) count++;
                if (qrCode.isDark(row + 1, col + 1) ) count++;
                if (count === 0 || count === 4) {
                    lostPoint += 3;
                }
            }
        }

        // LEVEL3

        for (row = 0; row < moduleCount; row++) {
            for (col = 0; col < moduleCount - 6; col++) {
                if (qrCode.isDark(row, col) && 
                        !qrCode.isDark(row, col + 1) && 
                         qrCode.isDark(row, col + 2) && 
                         qrCode.isDark(row, col + 3) && 
                         qrCode.isDark(row, col + 4) && 
                        !qrCode.isDark(row, col + 5) && 
                         qrCode.isDark(row, col + 6) ) {
                    lostPoint += 40;
                }
            }
        }

        for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount - 6; row++) {
                if (qrCode.isDark(row, col) &&
                        !qrCode.isDark(row + 1, col) &&
                         qrCode.isDark(row + 2, col) &&
                         qrCode.isDark(row + 3, col) &&
                         qrCode.isDark(row + 4, col) &&
                        !qrCode.isDark(row + 5, col) &&
                         qrCode.isDark(row + 6, col) ) {
                    lostPoint += 40;
                }
            }
        }

        // LEVEL4
        
        var darkCount = 0;

        for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount; row++) {
                if (qrCode.isDark(row, col) ) {
                    darkCount++;
                }
            }
        }
        
        var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
        lostPoint += ratio * 10;

        return lostPoint;       
    }

};

module.exports = QRUtil;

});
__file('QR8bitByte', function (module, require) {
var QRMode = require('./QRMode');

function QR8bitByte(data) {
	this.mode = QRMode.MODE_8BIT_BYTE;
	this.data = data;
}

QR8bitByte.prototype = {

	getLength : function() {
		return this.data.length;
	},
	
	write : function(buffer) {
		for (var i = 0; i < this.data.length; i++) {
			// not JIS ...
			buffer.put(this.data.charCodeAt(i), 8);
		}
	}
};

module.exports = QR8bitByte;

});
__file('QRBitBuffer', function (module, require) {
function QRBitBuffer() {
	this.buffer = [];
	this.length = 0;
}

QRBitBuffer.prototype = {

	get : function(index) {
		var bufIndex = Math.floor(index / 8);
		return ( (this.buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
	},
	
	put : function(num, length) {
		for (var i = 0; i < length; i++) {
			this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
		}
	},
	
	getLengthInBits : function() {
		return this.length;
	},
	
	putBit : function(bit) {
	
		var bufIndex = Math.floor(this.length / 8);
		if (this.buffer.length <= bufIndex) {
			this.buffer.push(0);
		}
	
		if (bit) {
			this.buffer[bufIndex] |= (0x80 >>> (this.length % 8) );
		}
	
		this.length++;
	}
};

module.exports = QRBitBuffer;

});
__file('index', function (module, require) {
//---------------------------------------------------------------------
// QRCode for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//   http://www.opensource.org/licenses/mit-license.php
//
// The word "QR Code" is registered trademark of 
// DENSO WAVE INCORPORATED
//   http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------
// Modified to work in node for this project (and some refactoring)
//---------------------------------------------------------------------

var QR8bitByte = require('./QR8bitByte');
var QRUtil = require('./QRUtil');
var QRPolynomial = require('./QRPolynomial');
var QRRSBlock = require('./QRRSBlock');
var QRBitBuffer = require('./QRBitBuffer');

function QRCode(typeNumber, errorCorrectLevel) {
	this.typeNumber = typeNumber;
	this.errorCorrectLevel = errorCorrectLevel;
	this.modules = null;
	this.moduleCount = 0;
	this.dataCache = null;
	this.dataList = [];
}

QRCode.prototype = {
	
	addData : function(data) {
		var newData = new QR8bitByte(data);
		this.dataList.push(newData);
		this.dataCache = null;
	},
	
	isDark : function(row, col) {
		if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
			throw new Error(row + "," + col);
		}
		return this.modules[row][col];
	},

	getModuleCount : function() {
		return this.moduleCount;
	},
	
	make : function() {
		// Calculate automatically typeNumber if provided is < 1
		if (this.typeNumber < 1 ){
			var typeNumber = 1;
			for (typeNumber = 1; typeNumber < 40; typeNumber++) {
				var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel);

				var buffer = new QRBitBuffer();
				var totalDataCount = 0;
				for (var i = 0; i < rsBlocks.length; i++) {
					totalDataCount += rsBlocks[i].dataCount;
				}

				for (var x = 0; x < this.dataList.length; x++) {
					var data = this.dataList[x];
					buffer.put(data.mode, 4);
					buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
					data.write(buffer);
				}
				if (buffer.getLengthInBits() <= totalDataCount * 8)
					break;
			}
			this.typeNumber = typeNumber;
		}
		this.makeImpl(false, this.getBestMaskPattern() );
	},
	
	makeImpl : function(test, maskPattern) {
		
		this.moduleCount = this.typeNumber * 4 + 17;
		this.modules = new Array(this.moduleCount);
		
		for (var row = 0; row < this.moduleCount; row++) {
			
			this.modules[row] = new Array(this.moduleCount);
			
			for (var col = 0; col < this.moduleCount; col++) {
				this.modules[row][col] = null;//(col + row) % 3;
			}
		}
	
		this.setupPositionProbePattern(0, 0);
		this.setupPositionProbePattern(this.moduleCount - 7, 0);
		this.setupPositionProbePattern(0, this.moduleCount - 7);
		this.setupPositionAdjustPattern();
		this.setupTimingPattern();
		this.setupTypeInfo(test, maskPattern);
		
		if (this.typeNumber >= 7) {
			this.setupTypeNumber(test);
		}
	
		if (this.dataCache === null) {
			this.dataCache = QRCode.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
		}
	
		this.mapData(this.dataCache, maskPattern);
	},

	setupPositionProbePattern : function(row, col)  {
		
		for (var r = -1; r <= 7; r++) {
			
			if (row + r <= -1 || this.moduleCount <= row + r) continue;
			
			for (var c = -1; c <= 7; c++) {
				
				if (col + c <= -1 || this.moduleCount <= col + c) continue;
				
				if ( (0 <= r && r <= 6 && (c === 0 || c === 6) ) || 
                     (0 <= c && c <= 6 && (r === 0 || r === 6) ) || 
                     (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
					this.modules[row + r][col + c] = true;
				} else {
					this.modules[row + r][col + c] = false;
				}
			}		
		}		
	},
	
	getBestMaskPattern : function() {
	
		var minLostPoint = 0;
		var pattern = 0;
	
		for (var i = 0; i < 8; i++) {
			
			this.makeImpl(true, i);
	
			var lostPoint = QRUtil.getLostPoint(this);
	
			if (i === 0 || minLostPoint >  lostPoint) {
				minLostPoint = lostPoint;
				pattern = i;
			}
		}
	
		return pattern;
	},
	
	createMovieClip : function(target_mc, instance_name, depth) {
	
		var qr_mc = target_mc.createEmptyMovieClip(instance_name, depth);
		var cs = 1;
	
		this.make();

		for (var row = 0; row < this.modules.length; row++) {
			
			var y = row * cs;
			
			for (var col = 0; col < this.modules[row].length; col++) {
	
				var x = col * cs;
				var dark = this.modules[row][col];
			
				if (dark) {
					qr_mc.beginFill(0, 100);
					qr_mc.moveTo(x, y);
					qr_mc.lineTo(x + cs, y);
					qr_mc.lineTo(x + cs, y + cs);
					qr_mc.lineTo(x, y + cs);
					qr_mc.endFill();
				}
			}
		}
		
		return qr_mc;
	},

	setupTimingPattern : function() {
		
		for (var r = 8; r < this.moduleCount - 8; r++) {
			if (this.modules[r][6] !== null) {
				continue;
			}
			this.modules[r][6] = (r % 2 === 0);
		}
	
		for (var c = 8; c < this.moduleCount - 8; c++) {
			if (this.modules[6][c] !== null) {
				continue;
			}
			this.modules[6][c] = (c % 2 === 0);
		}
	},
	
	setupPositionAdjustPattern : function() {
	
		var pos = QRUtil.getPatternPosition(this.typeNumber);
		
		for (var i = 0; i < pos.length; i++) {
		
			for (var j = 0; j < pos.length; j++) {
			
				var row = pos[i];
				var col = pos[j];
				
				if (this.modules[row][col] !== null) {
					continue;
				}
				
				for (var r = -2; r <= 2; r++) {
				
					for (var c = -2; c <= 2; c++) {
					
						if (Math.abs(r) === 2 || 
                            Math.abs(c) === 2 ||
                            (r === 0 && c === 0) ) {
							this.modules[row + r][col + c] = true;
						} else {
							this.modules[row + r][col + c] = false;
						}
					}
				}
			}
		}
	},
	
	setupTypeNumber : function(test) {
	
		var bits = QRUtil.getBCHTypeNumber(this.typeNumber);
        var mod;
	
		for (var i = 0; i < 18; i++) {
			mod = (!test && ( (bits >> i) & 1) === 1);
			this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
		}
	
		for (var x = 0; x < 18; x++) {
			mod = (!test && ( (bits >> x) & 1) === 1);
			this.modules[x % 3 + this.moduleCount - 8 - 3][Math.floor(x / 3)] = mod;
		}
	},
	
	setupTypeInfo : function(test, maskPattern) {
	
		var data = (this.errorCorrectLevel << 3) | maskPattern;
		var bits = QRUtil.getBCHTypeInfo(data);
        var mod;
	
		// vertical		
		for (var v = 0; v < 15; v++) {
	
			mod = (!test && ( (bits >> v) & 1) === 1);
	
			if (v < 6) {
				this.modules[v][8] = mod;
			} else if (v < 8) {
				this.modules[v + 1][8] = mod;
			} else {
				this.modules[this.moduleCount - 15 + v][8] = mod;
			}
		}
	
		// horizontal
		for (var h = 0; h < 15; h++) {
	
			mod = (!test && ( (bits >> h) & 1) === 1);
			
			if (h < 8) {
				this.modules[8][this.moduleCount - h - 1] = mod;
			} else if (h < 9) {
				this.modules[8][15 - h - 1 + 1] = mod;
			} else {
				this.modules[8][15 - h - 1] = mod;
			}
		}
	
		// fixed module
		this.modules[this.moduleCount - 8][8] = (!test);
	
	},
	
	mapData : function(data, maskPattern) {
		
		var inc = -1;
		var row = this.moduleCount - 1;
		var bitIndex = 7;
		var byteIndex = 0;
		
		for (var col = this.moduleCount - 1; col > 0; col -= 2) {
	
			if (col === 6) col--;
	
			while (true) {
	
				for (var c = 0; c < 2; c++) {
					
					if (this.modules[row][col - c] === null) {
						
						var dark = false;
	
						if (byteIndex < data.length) {
							dark = ( ( (data[byteIndex] >>> bitIndex) & 1) === 1);
						}
	
						var mask = QRUtil.getMask(maskPattern, row, col - c);
	
						if (mask) {
							dark = !dark;
						}
						
						this.modules[row][col - c] = dark;
						bitIndex--;
	
						if (bitIndex === -1) {
							byteIndex++;
							bitIndex = 7;
						}
					}
				}
								
				row += inc;
	
				if (row < 0 || this.moduleCount <= row) {
					row -= inc;
					inc = -inc;
					break;
				}
			}
		}
		
	}

};

QRCode.PAD0 = 0xEC;
QRCode.PAD1 = 0x11;

QRCode.createData = function(typeNumber, errorCorrectLevel, dataList) {
	
	var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
	
	var buffer = new QRBitBuffer();
	
	for (var i = 0; i < dataList.length; i++) {
		var data = dataList[i];
		buffer.put(data.mode, 4);
		buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
		data.write(buffer);
	}

	// calc num max data.
	var totalDataCount = 0;
	for (var x = 0; x < rsBlocks.length; x++) {
		totalDataCount += rsBlocks[x].dataCount;
	}

	if (buffer.getLengthInBits() > totalDataCount * 8) {
		throw new Error("code length overflow. (" + 
            buffer.getLengthInBits() + 
            ">" +  
            totalDataCount * 8 + 
            ")");
	}

	// end code
	if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
		buffer.put(0, 4);
	}

	// padding
	while (buffer.getLengthInBits() % 8 !== 0) {
		buffer.putBit(false);
	}

	// padding
	while (true) {
		
		if (buffer.getLengthInBits() >= totalDataCount * 8) {
			break;
		}
		buffer.put(QRCode.PAD0, 8);
		
		if (buffer.getLengthInBits() >= totalDataCount * 8) {
			break;
		}
		buffer.put(QRCode.PAD1, 8);
	}

	return QRCode.createBytes(buffer, rsBlocks);
};

QRCode.createBytes = function(buffer, rsBlocks) {

	var offset = 0;
	
	var maxDcCount = 0;
	var maxEcCount = 0;
	
	var dcdata = new Array(rsBlocks.length);
	var ecdata = new Array(rsBlocks.length);
	
	for (var r = 0; r < rsBlocks.length; r++) {

		var dcCount = rsBlocks[r].dataCount;
		var ecCount = rsBlocks[r].totalCount - dcCount;

		maxDcCount = Math.max(maxDcCount, dcCount);
		maxEcCount = Math.max(maxEcCount, ecCount);
		
		dcdata[r] = new Array(dcCount);
		
		for (var i = 0; i < dcdata[r].length; i++) {
			dcdata[r][i] = 0xff & buffer.buffer[i + offset];
		}
		offset += dcCount;
		
		var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
		var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);

		var modPoly = rawPoly.mod(rsPoly);
		ecdata[r] = new Array(rsPoly.getLength() - 1);
		for (var x = 0; x < ecdata[r].length; x++) {
            var modIndex = x + modPoly.getLength() - ecdata[r].length;
			ecdata[r][x] = (modIndex >= 0)? modPoly.get(modIndex) : 0;
		}

	}
	
	var totalCodeCount = 0;
	for (var y = 0; y < rsBlocks.length; y++) {
		totalCodeCount += rsBlocks[y].totalCount;
	}

	var data = new Array(totalCodeCount);
	var index = 0;

	for (var z = 0; z < maxDcCount; z++) {
		for (var s = 0; s < rsBlocks.length; s++) {
			if (z < dcdata[s].length) {
				data[index++] = dcdata[s][z];
			}
		}
	}

	for (var xx = 0; xx < maxEcCount; xx++) {
		for (var t = 0; t < rsBlocks.length; t++) {
			if (xx < ecdata[t].length) {
				data[index++] = ecdata[t][xx];
			}
		}
	}

	return data;

};

module.exports = QRCode;

});

const QRCode = __defs['index'], QRUtil = __defs['QRUtil'], QRErrorCorrectLevel = __defs['QRErrorCorrectLevel'];

/** Mátrix a megadott szövegből. level: 'L' | 'M' | 'Q' | 'H'. Túl hosszú szövegnél hibát dob. */
export function qrMatrix(text, level = 'M') {
    const bytes = new TextEncoder().encode(String(text)); let bin = '';
    bytes.forEach(b => { bin += String.fromCharCode(b); });                  // UTF-8 bájtok (az ékezetes szöveg is jó)
    const q = new QRCode(0, QRErrorCorrectLevel[level] ?? QRErrorCorrectLevel.M);
    q.addData(bin); q.make();
    const n = q.getModuleCount(), ver = q.typeNumber, fn = Array.from({ length: n }, () => new Uint8Array(n));
    const mark = (r0, r1, c0, c1) => { for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) fn[r][c] = 1; };
    mark(0, 8, 0, 8); mark(0, 8, n - 8, n); mark(n - 8, n, 0, 8);            // keresőminták + elválasztók
    mark(8, 9, 0, 9); mark(8, 9, n - 8, n); mark(0, 9, 8, 9); mark(n - 8, n, 8, 9);   // formátum-információ
    for (let i = 0; i < n; i++) { fn[6][i] = 1; fn[i][6] = 1; }              // időzítő sávok
    const pos = QRUtil.getPatternPosition(ver);
    for (const i of pos) for (const j of pos) { if (fn[i][j]) continue; mark(i - 2, i + 3, j - 2, j + 3); }   // igazító minták
    if (ver >= 7) { mark(0, 6, n - 11, n - 8); mark(n - 11, n - 8, 0, 6); }  // verzió-információ
    return { size: n, version: ver, level, dark: (r, c) => !!q.isDark(r, c), isFn: (r, c) => fn[r][c] === 1 };
}
{
  "schemaVersion": 1,
  "languages": [
    {
      "id": "hu",
      "label": "Magyar",
      "flag": "🇭🇺"
    },
    {
      "id": "en",
      "label": "English",
      "flag": "🇬🇧"
    }
  ],
  "strings": [
    {
      "key": "betutipus",
      "hu": "+ Betűtípus",
      "en": "+ Font"
    },
    {
      "key": "uj_emoji",
      "hu": "+ ÚJ EMOJI",
      "en": "+ NEW EMOJI"
    },
    {
      "key": "uj_emoji_x",
      "hu": "+ ÚJ EMOJI ({x})",
      "en": "+ NEW EMOJI ({x})"
    },
    {
      "key": "uj_kep",
      "hu": "+ ÚJ KÉP",
      "en": "+ NEW IMAGE"
    },
    {
      "key": "uj_kep_x",
      "hu": "+ ÚJ KÉP ({x})",
      "en": "+ NEW IMAGE ({x})"
    },
    {
      "key": "uj_szoveg",
      "hu": "+ ÚJ SZÖVEG",
      "en": "+ NEW TEXT"
    },
    {
      "key": "uj_szoveg_x",
      "hu": "+ ÚJ SZÖVEG ({x})",
      "en": "+ NEW TEXT ({x})"
    },
    {
      "key": "uj_x",
      "hu": "+ ÚJ {x}",
      "en": "+ NEW {x}"
    },
    {
      "key": "a_fekvo_nezet_uresen_hagyva_automatikusan_az_all",
      "hu": "A fekvő nézet üresen hagyva automatikusan az álló nézetből számolódik.",
      "en": "Left blank, the landscape view is calculated automatically from the portrait view."
    },
    {
      "key": "a_github_taroloba_mentes_a_beallitasok_oldalon_m",
      "hu": "A GitHub tárolóba mentés a Beállítások oldalon megadott tulajdonosra és repóra történik.",
      "en": "Saving to GitHub uses the owner and repository set on the Settings page."
    },
    {
      "key": "a_githubra_mentes_nem_sikerult_x_a_sablon_json_j",
      "hu": "A GitHubra mentés nem sikerült ({x}). A sablon JSON-ját letöltöttük helyette.",
      "en": "Saving to GitHub failed ({x}). The template JSON was downloaded instead."
    },
    {
      "key": "a_tiktok_hivatalos_beagyazott_lejatszoja_toltodi",
      "hu": "A TikTok hivatalos beágyazott lejátszója töltődik be (a rövid vm.tiktok.com linkek nem működnek, a teljes linket add meg). A szolgáltató a beágyazást korlátozhatja, a lejátszás sütiket és adatokat kezelhet. A videó tulajdonosának engedélye szükséges.",
      "en": "The official TikTok embedded player is loaded (short vm.tiktok.com links do not work, enter the full link). The provider may restrict embedding, and playback may use cookies and data. The video owner's permission is required."
    },
    {
      "key": "admin_minden",
      "hu": "Admin (minden)",
      "en": "Admin (everything)"
    },
    {
      "key": "ai",
      "hu": "AI",
      "en": "AI"
    },
    {
      "key": "ai_szerver_cime_aiendpoint_https",
      "hu": "AI szerver címe (aiEndpoint, https)",
      "en": "AI server address (aiEndpoint, https)"
    },
    {
      "key": "aktiv",
      "hu": "Aktív",
      "en": "Active"
    },
    {
      "key": "alapertekek",
      "hu": "Alapértékek",
      "en": "Defaults"
    },
    {
      "key": "alkategoria",
      "hu": "Alkategória",
      "en": "Subcategory"
    },
    {
      "key": "az_ai_most_nem_erheto_el",
      "hu": "Az AI most nem érhető el.",
      "en": "The AI is not available right now."
    },
    {
      "key": "az_ai_szolgaltatas_meg_nincs_beallitva_beallitas",
      "hu": "Az AI szolgáltatás még nincs beállítva (Beállítások → AI szerver címe).",
      "en": "The AI service is not configured yet (Settings → AI server address)."
    },
    {
      "key": "az_inditas_gombra_kattintva_a_z_x_szolgaltatotol",
      "hu": "Az Indítás gombra kattintva a(z) {x} szolgáltatótól töltődik be tartalom, amely sütiket és adatokat (pl. IP-cím) kezelhet.",
      "en": "By clicking Start, content is loaded from {x}, which may use cookies and process data (e.g. IP address)."
    },
    {
      "key": "azonosito",
      "hu": "Azonosító",
      "en": "ID"
    },
    {
      "key": "beillesztes_ctrl_v",
      "hu": "Beillesztés (Ctrl+V)",
      "en": "Paste (Ctrl+V)"
    },
    {
      "key": "betutipus_2",
      "hu": "Betűtípus",
      "en": "Font"
    },
    {
      "key": "betutipusok_google_fonts_nev",
      "hu": "Betűtípusok (Google Fonts név)",
      "en": "Fonts (Google Fonts name)"
    },
    {
      "key": "bezar",
      "hu": "Bezár",
      "en": "Close"
    },
    {
      "key": "beall",
      "hu": "Beáll.",
      "en": "Setup"
    },
    {
      "key": "beallitasok",
      "hu": "Beállítások",
      "en": "Settings"
    },
    {
      "key": "buborekok",
      "hu": "Buborékok",
      "en": "Bubbles"
    },
    {
      "key": "csak_hang",
      "hu": "Csak hang",
      "en": "Audio only"
    },
    {
      "key": "csak_sajat_keszitesu_vagy_jogtiszta_felhasznalas",
      "hu": "Csak saját készítésű vagy jogtiszta (felhasználási engedéllyel rendelkező, pl. CC0) fájl használható. Szerzői jogvédett tartalmat engedély nélkül ne tölts fel. A fájlnak https címről, a saját tárhelyedről kell elérhetőnek lennie. Jogi nyilatkozat nélkül nem játszódik le.",
      "en": "Only your own or properly licensed files (with usage permission, e.g. CC0) may be used. Do not upload copyrighted content without permission. The file must be available over https from your own hosting. It will not play without the legal declaration."
    },
    {
      "key": "csillagok",
      "hu": "Csillagok",
      "en": "Stars"
    },
    {
      "key": "csomag",
      "hu": "Csomag",
      "en": "Plan"
    },
    {
      "key": "effekt",
      "hu": "Effekt",
      "en": "Effect"
    },
    {
      "key": "effekt_szine",
      "hu": "Effekt színe",
      "en": "Effect color"
    },
    {
      "key": "effektek",
      "hu": "Effektek",
      "en": "Effects"
    },
    {
      "key": "elem_muveletek",
      "hu": "Elem műveletek",
      "en": "Element actions"
    },
    {
      "key": "elmentve_a_githubra",
      "hu": "Elmentve a GitHubra.",
      "en": "Saved to GitHub."
    },
    {
      "key": "elmentve_a_githubra_az_oldal_frissulese_1_2_perc",
      "hu": "Elmentve a GitHubra. Az oldal frissülése 1–2 percet vehet igénybe.",
      "en": "Saved to GitHub. The site may take 1–2 minutes to update."
    },
    {
      "key": "elerted_a_csomag_korlatjat_nem_illesztheto_be_to",
      "hu": "Elérted a csomag korlátját, nem illeszthető be több elem.",
      "en": "You have reached your plan's limit, no more elements can be pasted."
    },
    {
      "key": "elorebb",
      "hu": "Előrébb",
      "en": "Bring forward"
    },
    {
      "key": "emoji",
      "hu": "Emoji",
      "en": "Emoji"
    },
    {
      "key": "emoji_2",
      "hu": "EMOJI",
      "en": "EMOJI"
    },
    {
      "key": "emoji_beszurasa",
      "hu": "Emoji beszúrása",
      "en": "Insert emoji"
    },
    {
      "key": "emoji_paletta_szokozzel_elvalasztva",
      "hu": "Emoji paletta (szóközzel elválasztva)",
      "en": "Emoji palette (separated by spaces)"
    },
    {
      "key": "emoji_valasztasa",
      "hu": "Emoji választása",
      "en": "Choose emoji"
    },
    {
      "key": "emojik",
      "hu": "Emojik",
      "en": "Emojis"
    },
    {
      "key": "engedelyezett",
      "hu": "Engedélyezett",
      "en": "Enabled"
    },
    {
      "key": "eszkozok",
      "hu": "Eszközök",
      "en": "Tools"
    },
    {
      "key": "eso",
      "hu": "Eső",
      "en": "Rain"
    },
    {
      "key": "fekvo_elonezet",
      "hu": "Fekvő előnézet",
      "en": "Landscape preview"
    },
    {
      "key": "fekvo_nezet",
      "hu": "FEKVŐ NÉZET",
      "en": "LANDSCAPE VIEW"
    },
    {
      "key": "felirat",
      "hu": "Felirat",
      "en": "Label"
    },
    {
      "key": "fizetos",
      "hu": "Fizetős",
      "en": "Paid"
    },
    {
      "key": "fizetos_effekt_lecserelve",
      "hu": "Fizetős effekt lecserélve.",
      "en": "Paid effect replaced."
    },
    {
      "key": "fizetos_elemet_tartalmaz",
      "hu": "Fizetős elemet tartalmaz",
      "en": "Contains a paid item"
    },
    {
      "key": "fizetos_vagy_hianyzo_betutipus_lecserelve",
      "hu": "Fizetős vagy hiányzó betűtípus lecserélve.",
      "en": "Paid or missing font replaced."
    },
    {
      "key": "fizetos_vagy_kikapcsolt_mediaforras_lecserelve",
      "hu": "Fizetős vagy kikapcsolt médiaforrás lecserélve.",
      "en": "Paid or disabled media source replaced."
    },
    {
      "key": "forgatas",
      "hu": "Forgatás °",
      "en": "Rotation °"
    },
    {
      "key": "forras",
      "hu": "Forrás",
      "en": "Source"
    },
    {
      "key": "github",
      "hu": "GitHub",
      "en": "GitHub"
    },
    {
      "key": "github_hozzaferesi_token_csak_ehhez_a_repohoz_co",
      "hu": "GitHub hozzáférési token (csak ehhez a repóhoz, Contents: írás). Nem kerül a kódba.",
      "en": "GitHub access token (this repository only, Contents: write). It is never stored in the code."
    },
    {
      "key": "gomb_felirata",
      "hu": "Gomb felirata",
      "en": "Button label"
    },
    {
      "key": "google_fonts_nev",
      "hu": "Google Fonts név",
      "en": "Google Fonts name"
    },
    {
      "key": "hivatalos_youtube_lejatszoval_adatvedelmi_moddal",
      "hu": "Hivatalos YouTube lejátszóval (adatvédelmi móddal) játszódik le. A videónak láthatónak kell maradnia (legalább 200×200 px), a hang külön nem választható le, és ne takard el más réteggel. Csak olyan videót használj, amelynek tulajdonosa engedi a beágyazást.",
      "en": "Played with the official YouTube player (privacy-enhanced mode). The video must stay visible (at least 200×200 px), its audio cannot be separated, and do not cover it with another layer. Only use videos whose owner allows embedding."
    },
    {
      "key": "https",
      "hu": "https://...",
      "en": "https://..."
    },
    {
      "key": "https_www_tiktok_com_nev_video_vagy_azonosito",
      "hu": "https://www.tiktok.com/@név/video/… vagy azonosító",
      "en": "https://www.tiktok.com/@name/video/… or ID"
    },
    {
      "key": "https_ures_kikapcsolva",
      "hu": "https://… (üres = kikapcsolva)",
      "en": "https://… (empty = disabled)"
    },
    {
      "key": "https_zene_mp3_vagy_video_mp4",
      "hu": "https://…/zene.mp3 vagy …/videó.mp4",
      "en": "https://…/music.mp3 or …/video.mp4"
    },
    {
      "key": "hatrebb",
      "hu": "Hátrébb",
      "en": "Send backward"
    },
    {
      "key": "hoeses",
      "hu": "Hóesés",
      "en": "Snowfall"
    },
    {
      "key": "ikon",
      "hu": "Ikon",
      "en": "Icon"
    },
    {
      "key": "inditas",
      "hu": "Indítás",
      "en": "Start"
    },
    {
      "key": "inditasi_hiba",
      "hu": "Indítási hiba:",
      "en": "Startup error:"
    },
    {
      "key": "inditasi_hiba_x_frissits_erovel_ctrl_f5_es_ellen",
      "hu": "Indítási hiba: {x} – frissíts erővel (Ctrl+F5), és ellenőrizd a feltöltött fájlokat.",
      "en": "Startup error: {x} – hard refresh (Ctrl+F5) and check the uploaded files."
    },
    {
      "key": "ingyenes",
      "hu": "Ingyenes",
      "en": "Free"
    },
    {
      "key": "ingyenes_2",
      "hu": "ingyenes",
      "en": "free"
    },
    {
      "key": "ismetles",
      "hu": "Ismétlés",
      "en": "Repeat"
    },
    {
      "key": "itt_dontod_el_melyik_betutipus_es_effekt_ingyene",
      "hu": "Itt döntöd el, melyik betűtípus és effekt ingyenes vagy fizetős, mennyi szöveg, kép és emoji fér egy kártyára, és mi legyen az emoji-palettán. A mentett fájl a többi JSON-hoz hasonlóan adatbázisba importálható.",
      "en": "Here you decide which fonts and effects are free or paid, how many texts, images and emojis fit on a card, and what is on the emoji palette. The saved file can be imported into a database like the other JSON files."
    },
    {
      "key": "jogi_megjegyzes",
      "hu": "Jogi megjegyzés",
      "en": "Legal notice"
    },
    {
      "key": "kategoria",
      "hu": "Kategória",
      "en": "Category"
    },
    {
      "key": "kattints_egy_elemre_az_allo_elonezetben_huzd_moz",
      "hu": "Kattints egy elemre az álló előnézetben: húzd mozgatáshoz, a pontokat méretezéshez, a felső kört forgatáshoz (Shift: 15°-os lépés). Fekvő nézet: automatikus.",
      "en": "Click an element in the portrait preview: drag to move, drag the dots to resize, drag the top circle to rotate (Shift: 15° steps). Landscape view: automatic."
    },
    {
      "key": "kijelentem_hogy_a_fajl_a_sajatom_vagy_jogom_van_",
      "hu": "Kijelentem, hogy a fájl a sajátom, vagy jogom van felhasználni.",
      "en": "I declare that the file is my own or I have the right to use it."
    },
    {
      "key": "kivagva",
      "hu": "Kivágva.",
      "en": "Cut."
    },
    {
      "key": "kivagas_ctrl_x",
      "hu": "Kivágás (Ctrl+X)",
      "en": "Cut (Ctrl+X)"
    },
    {
      "key": "konfetti",
      "hu": "Konfetti",
      "en": "Confetti"
    },
    {
      "key": "korlatok_ures_mezo_korlatlan",
      "hu": "Korlátok (üres mező = korlátlan)",
      "en": "Limits (empty field = unlimited)"
    },
    {
      "key": "kep",
      "hu": "Kép",
      "en": "Image"
    },
    {
      "key": "kep_2",
      "hu": "KÉP",
      "en": "IMAGE"
    },
    {
      "key": "kep_https_cim",
      "hu": "Kép (https:// cím)",
      "en": "Image (https:// address)"
    },
    {
      "key": "kep_x",
      "hu": "Kép {x}",
      "en": "Image {x}"
    },
    {
      "key": "kepek",
      "hu": "Képek",
      "en": "Images"
    },
    {
      "key": "kesz_nezd_meg_az_elonezetet_szabadon_modosithato",
      "hu": "Kész, nézd meg az előnézetet. Szabadon módosíthatod.",
      "en": "Done, check the preview. You can edit it freely."
    },
    {
      "key": "kiserleti_nincs_hivatalos_beagyazasi_dokumentaci",
      "hu": "Kísérleti: nincs hivatalos beágyazási dokumentáció, a működés nem garantált. Csak olyan videót használj, amelyet a tulajdonos beágyazhatóvá tett.",
      "en": "Experimental: there is no official embedding documentation, so it may not work. Only use videos that the owner has made embeddable."
    },
    {
      "key": "link",
      "hu": "Link",
      "en": "Link"
    },
    {
      "key": "magassag",
      "hu": "Magasság",
      "en": "Height"
    },
    {
      "key": "megjegyezzem_ezen_az_eszkozon",
      "hu": "Megjegyezzem ezen az eszközön?",
      "en": "Remember on this device?"
    },
    {
      "key": "megjeleno_nev",
      "hu": "Megjelenő név",
      "en": "Display name"
    },
    {
      "key": "mentes",
      "hu": "Mentés",
      "en": "Save"
    },
    {
      "key": "mentes_a_githubra",
      "hu": "Mentés a GitHubra…",
      "en": "Saving to GitHub…"
    },
    {
      "key": "mind",
      "hu": "Mind",
      "en": "All"
    },
    {
      "key": "masold_ki_a_linket",
      "hu": "Másold ki a linket:",
      "en": "Copy the link:"
    },
    {
      "key": "masolva",
      "hu": "Másolva.",
      "en": "Copied."
    },
    {
      "key": "masolas_ctrl_c",
      "hu": "Másolás (Ctrl+C)",
      "en": "Copy (Ctrl+C)"
    },
    {
      "key": "media",
      "hu": "Média",
      "en": "Media"
    },
    {
      "key": "mediaforrasok_a_jogi_megjegyzes_uresen_az_alapsz",
      "hu": "Médiaforrások (a jogi megjegyzés üresen az alapszöveget használja)",
      "en": "Media sources (an empty legal notice uses the default text)"
    },
    {
      "key": "meg_tobb",
      "hu": "Még több",
      "en": "More"
    },
    {
      "key": "meg_tobb_x",
      "hu": "Még több ({x}) ▾",
      "en": "More ({x}) ▾"
    },
    {
      "key": "meg_tobb_2",
      "hu": "Még több ▾",
      "en": "More ▾"
    },
    {
      "key": "megse",
      "hu": "Mégse",
      "en": "Cancel"
    },
    {
      "key": "meret",
      "hu": "Méret",
      "en": "Size"
    },
    {
      "key": "nem_talalhato_a_categories_json_toltsd_fel_az_ad",
      "hu": "Nem található a categories.json – töltsd fel az admin.html mellé.",
      "en": "categories.json not found – upload it next to admin.html."
    },
    {
      "key": "nincs",
      "hu": "Nincs",
      "en": "None"
    },
    {
      "key": "nincs_kijelolt_elem",
      "hu": "Nincs kijelölt elem",
      "en": "No element selected"
    },
    {
      "key": "nincs_masolt_elem",
      "hu": "Nincs másolt elem.",
      "en": "Nothing copied."
    },
    {
      "key": "nyelv",
      "hu": "Nyelv",
      "en": "Language"
    },
    {
      "key": "nemitva_indul",
      "hu": "Némítva indul",
      "en": "Starts muted"
    },
    {
      "key": "nezet_csomag_elonezete",
      "hu": "Nézet (csomag előnézete)",
      "en": "View (plan preview)"
    },
    {
      "key": "pl_romantikus_valentin_napi_kartya_sotet_hatter_",
      "hu": "Pl.: Romantikus Valentin-napi kártya, sötét háttér, szívek hullanak, „Szeretlek” felirat",
      "en": "E.g.: Romantic Valentine's card, dark background, falling hearts, \"I love you\" text"
    },
    {
      "key": "repo",
      "hu": "Repó",
      "en": "Repository"
    },
    {
      "key": "reteg",
      "hu": "Réteg",
      "en": "Layer"
    },
    {
      "key": "reteg_2",
      "hu": "Réteg:",
      "en": "Layer:"
    },
    {
      "key": "reteg_nagyobb_szam_feljebb_kep_alapbol_10_szoveg",
      "hu": "Réteg: nagyobb szám = feljebb (kép alapból 10, szöveg 20, videó 0). A „Mentés sablonként” a GitHub tárolóban lévő templates.json fájlba ment (ha nem sikerül, letölti).",
      "en": "Layer: higher number = on top (image default 10, text 20, video 0). “Save as template” saves into templates.json in the GitHub repository (it downloads the file if saving fails)."
    },
    {
      "key": "reteg_x",
      "hu": "Réteg: {x}",
      "en": "Layer: {x}"
    },
    {
      "key": "sablon_neve",
      "hu": "Sablon neve",
      "en": "Template name"
    },
    {
      "key": "sablonok",
      "hu": "Sablonok",
      "en": "Templates"
    },
    {
      "key": "sajat_fajl",
      "hu": "Saját fájl",
      "en": "Own file"
    },
    {
      "key": "szerkeszto_mod",
      "hu": "SZERKESZTŐ MÓD:",
      "en": "EDIT MODE:"
    },
    {
      "key": "szerkeszto_mod_be",
      "hu": "SZERKESZTŐ MÓD: BE",
      "en": "EDIT MODE: ON"
    },
    {
      "key": "szerkeszto_mod_ki",
      "hu": "SZERKESZTŐ MÓD: KI",
      "en": "EDIT MODE: OFF"
    },
    {
      "key": "szikrak",
      "hu": "Szikrák",
      "en": "Sparkles"
    },
    {
      "key": "szelesseg",
      "hu": "Szélesség",
      "en": "Width"
    },
    {
      "key": "szin",
      "hu": "Szín",
      "en": "Color"
    },
    {
      "key": "szivek",
      "hu": "Szívek",
      "en": "Hearts"
    },
    {
      "key": "szoveg",
      "hu": "Szöveg",
      "en": "Text"
    },
    {
      "key": "szoveg_2",
      "hu": "SZÖVEG",
      "en": "TEXT"
    },
    {
      "key": "szovegek",
      "hu": "Szövegek",
      "en": "Texts"
    },
    {
      "key": "suruseg_1_5",
      "hu": "Sűrűség (1–5)",
      "en": "Density (1–5)"
    },
    {
      "key": "tiktok",
      "hu": "TikTok",
      "en": "TikTok"
    },
    {
      "key": "token_torolve",
      "hu": "Token törölve.",
      "en": "Token removed."
    },
    {
      "key": "tulajdonos",
      "hu": "Tulajdonos",
      "en": "Owner"
    },
    {
      "key": "tipus",
      "hu": "Típus",
      "en": "Type"
    },
    {
      "key": "torles",
      "hu": "Törlés",
      "en": "Delete"
    },
    {
      "key": "torles_delete",
      "hu": "Törlés (Delete)",
      "en": "Delete (Delete key)"
    },
    {
      "key": "vezerlok",
      "hu": "Vezérlők",
      "en": "Controls"
    },
    {
      "key": "videa",
      "hu": "Videa",
      "en": "Videa"
    },
    {
      "key": "video",
      "hu": "Videó",
      "en": "Video"
    },
    {
      "key": "viragszirmok",
      "hu": "Virágszirmok",
      "en": "Flower petals"
    },
    {
      "key": "visszaallitod_az_alapertekeket",
      "hu": "Visszaállítod az alapértékeket?",
      "en": "Do you want to restore the defaults?"
    },
    {
      "key": "x",
      "hu": "X %",
      "en": "X %"
    },
    {
      "key": "x_vizszintes",
      "hu": "X vízszintes %",
      "en": "X horizontal %"
    },
    {
      "key": "y",
      "hu": "Y %",
      "en": "Y %"
    },
    {
      "key": "y_fuggoleges",
      "hu": "Y függőleges %",
      "en": "Y vertical %"
    },
    {
      "key": "youtube",
      "hu": "YouTube",
      "en": "YouTube"
    },
    {
      "key": "youtube_google",
      "hu": "YouTube (Google)",
      "en": "YouTube (Google)"
    },
    {
      "key": "ag_ures_alapertelmezett",
      "hu": "Ág (üres = alapértelmezett)",
      "en": "Branch (empty = default)"
    },
    {
      "key": "allo_elonezet",
      "hu": "Álló előnézet",
      "en": "Portrait preview"
    },
    {
      "key": "allo_nezet",
      "hu": "ÁLLÓ NÉZET",
      "en": "PORTRAIT VIEW"
    },
    {
      "key": "ervenytelen_json_fajl",
      "hu": "Érvénytelen JSON fájl.",
      "en": "Invalid JSON file."
    },
    {
      "key": "ervenytelen_vagy_nem_tamogatott_link",
      "hu": "Érvénytelen vagy nem támogatott link",
      "en": "Invalid or unsupported link"
    },
    {
      "key": "ird_le_milyen_kartyat_szeretnel_alkalom_hangulat",
      "hu": "Írd le, milyen kártyát szeretnél (alkalom, hangulat, színek, szöveg). A javaslatot utána bármikor átszerkesztheted.",
      "en": "Describe the card you want (occasion, mood, colors, text). You can edit the suggestion afterwards."
    },
    {
      "key": "oszi_levelek",
      "hu": "Őszi levelek",
      "en": "Autumn leaves"
    },
    {
      "key": "frissits_erovel_ctrl_f5_es_ellenorizd_a_feltolto",
      "hu": "– frissíts erővel (Ctrl+F5), és ellenőrizd a feltöltött fájlokat.",
      "en": "– hard refresh (Ctrl+F5) and check the uploaded files."
    },
    {
      "key": "link_vagy_azonosito",
      "hu": "– link vagy azonosító",
      "en": "– link or ID"
    },
    {
      "key": "admin",
      "hu": "← Admin",
      "en": "← Admin"
    },
    {
      "key": "szunet",
      "hu": "⏸ Szünet",
      "en": "⏸ Pause"
    },
    {
      "key": "lejatszas",
      "hu": "▶ Lejátszás",
      "en": "▶ Play"
    },
    {
      "key": "beallitasok_2",
      "hu": "⚙ Beállítások",
      "en": "⚙ Settings"
    },
    {
      "key": "beallitasok_settings_json",
      "hu": "⚙ Beállítások (settings.json)",
      "en": "⚙ Settings (settings.json)"
    },
    {
      "key": "masolva_2",
      "hu": "✔ Másolva",
      "en": "✔ Copied"
    },
    {
      "key": "ai_tervezo",
      "hu": "✨ AI tervező",
      "en": "✨ AI designer"
    },
    {
      "key": "generalas",
      "hu": "✨ Generálás",
      "en": "✨ Generate"
    },
    {
      "key": "ures_kartya",
      "hu": "⬜ Üres kártya",
      "en": "⬜ Blank card"
    },
    {
      "key": "video_2",
      "hu": "🎬 Videó",
      "en": "🎬 Video"
    },
    {
      "key": "mentes_settings_json",
      "hu": "💾 Mentés (settings.json)",
      "en": "💾 Save (settings.json)"
    },
    {
      "key": "mentes_githubra",
      "hu": "💾 Mentés GitHubra",
      "en": "💾 Save to GitHub"
    },
    {
      "key": "mentes_sablonkent",
      "hu": "💾 Mentés sablonként",
      "en": "💾 Save as template"
    },
    {
      "key": "betoltes_fajlbol",
      "hu": "📂 Betöltés fájlból",
      "en": "📂 Load from file"
    },
    {
      "key": "frissites",
      "hu": "🔄 Frissítés",
      "en": "🔄 Refresh"
    },
    {
      "key": "github_token_torlese",
      "hu": "🔑 GitHub token törlése",
      "en": "🔑 Remove GitHub token"
    },
    {
      "key": "az_athuzott_halvany_elemek_elofizetessel_erhetok",
      "hu": "🔒 Az áthúzott, halvány elemek előfizetéssel érhetők el.",
      "en": "🔒 Struck-through, dimmed items are available with a subscription."
    },
    {
      "key": "fizetos_2",
      "hu": "🔒 fizetős",
      "en": "🔒 paid"
    },
    {
      "key": "tobb_emoji_fizetos",
      "hu": "🔒 TÖBB EMOJI (FIZETŐS)",
      "en": "🔒 MORE EMOJI (PAID)"
    },
    {
      "key": "tobb_kep_fizetos",
      "hu": "🔒 TÖBB KÉP (FIZETŐS)",
      "en": "🔒 MORE IMAGES (PAID)"
    },
    {
      "key": "tobb_szoveg_fizetos",
      "hu": "🔒 TÖBB SZÖVEG (FIZETŐS)",
      "en": "🔒 MORE TEXT (PAID)"
    },
    {
      "key": "tobb_x_fizetos",
      "hu": "🔒 TÖBB {x} (FIZETŐS)",
      "en": "🔒 MORE {x} (PAID)"
    },
    {
      "key": "link_masolasa",
      "hu": "🔗 Link másolása",
      "en": "🔗 Copy link"
    },
    {
      "key": "kep_3",
      "hu": "🖼️ Kép",
      "en": "🖼️ Image"
    },
    {
      "key": "kep_x_2",
      "hu": "🖼️ Kép {x}",
      "en": "🖼️ Image {x}"
    },
    {
      "key": "kartya",
      "hu": "Kártya",
      "en": "Card"
    },
    {
      "key": "uj_mappa",
      "hu": "+ Új mappa",
      "en": "+ New folder"
    },
    {
      "key": "1_lepes",
      "hu": "1. LÉPÉS",
      "en": "STEP 1"
    },
    {
      "key": "2_lepes",
      "hu": "2. LÉPÉS",
      "en": "STEP 2"
    },
    {
      "key": "3_lepes",
      "hu": "3. LÉPÉS",
      "en": "STEP 3"
    },
    {
      "key": "a_jogosultsagi_nyilatkozat_nelkul_a_fajl_nem_has",
      "hu": "A jogosultsági nyilatkozat nélkül a fájl nem használható.",
      "en": "The file cannot be used without the rights declaration."
    },
    {
      "key": "a_kuka_ures",
      "hu": "A kuka üres.",
      "en": "The trash is empty."
    },
    {
      "key": "a_link_tul_hosszu_a_qr_kodhoz_hasznalj_rovidebb_",
      "hu": "A link túl hosszú a QR-kódhoz. Használj rövidebb linket.",
      "en": "The link is too long for a QR code. Use a shorter link."
    },
    {
      "key": "a_link_x_bajt_kb_y_bajt_az_nfc_rekordban_hosszu_",
      "hu": "A link {x} bájt (kb. {y} bájt az NFC-rekordban). Hosszú linkhez rövidlink ajánlott.",
      "en": "The link is {x} bytes (about {y} bytes in the NFC record). A short link is recommended for long links."
    },
    {
      "key": "a_qr_kod_letrehozasahoz_internetkapcsolat_kell",
      "hu": "A QR-kód létrehozásához internetkapcsolat kell.",
      "en": "An internet connection is needed to create the QR code."
    },
    {
      "key": "adj_hozza_szoveget_kepet_emojit_videot_vagy_zene",
      "hu": "Adj hozzá szöveget, képet, emojit, videót vagy zenét a bal oldali eszköztárból.",
      "en": "Add text, images, emojis, video or music from the toolbar on the left."
    },
    {
      "key": "ai_tervezo_2",
      "hu": "AI tervező",
      "en": "AI designer"
    },
    {
      "key": "aktualis_kartya_a_szerkesztoben",
      "hu": "Aktuális kártya a szerkesztőben",
      "en": "Current card in the editor"
    },
    {
      "key": "arculat",
      "hu": "Arculat",
      "en": "Brand"
    },
    {
      "key": "arculati_betutipusok",
      "hu": "Arculati betűtípusok",
      "en": "Brand fonts"
    },
    {
      "key": "arculati_csomag",
      "hu": "Arculati csomag",
      "en": "Brand kit"
    },
    {
      "key": "arculati_hang_beallitva",
      "hu": "Arculati hang beállítva.",
      "en": "Brand audio set."
    },
    {
      "key": "arculati_hangok",
      "hu": "Arculati hangok",
      "en": "Brand audio"
    },
    {
      "key": "arculati_ikonok",
      "hu": "Arculati ikonok",
      "en": "Brand icons"
    },
    {
      "key": "arculati_szinek",
      "hu": "Arculati színek",
      "en": "Brand colors"
    },
    {
      "key": "az_arculat_oldalon_mentett_szineid_betutipusaid_",
      "hu": "Az Arculat oldalon mentett színeid, betűtípusaid és logóid egy kattintással beilleszthetők.",
      "en": "On the Brand page, your saved colors, fonts and logos can be inserted with one click."
    },
    {
      "key": "az_arculati_csomagban_egy_helyen_keszitheted_elo",
      "hu": "Az arculati csomagban egy helyen készítheted elő a logóidat, színeidet, betűtípusaidat és hangjaidat, és egy kattintással beillesztheted őket a kártyáidba.",
      "en": "In the brand kit you can prepare your logos, colors, fonts and sounds in one place, and insert them into your cards with one click."
    },
    {
      "key": "az_nfc_chip_megirva",
      "hu": "Az NFC-chip megírva.",
      "en": "The NFC chip has been written."
    },
    {
      "key": "az_nfc_iras_nem_sikerult",
      "hu": "Az NFC-írás nem sikerült.",
      "en": "NFC writing failed."
    },
    {
      "key": "betutipusok",
      "hu": "Betűtípusok",
      "en": "Fonts"
    },
    {
      "key": "barmire_rakereshetsz",
      "hu": "Bármire rákereshetsz",
      "en": "You can search for anything"
    },
    {
      "key": "chip",
      "hu": "Chip",
      "en": "Chip"
    },
    {
      "key": "csomagok",
      "hu": "Csomagok",
      "en": "Plans"
    },
    {
      "key": "csomagok_korlatok_betutipusok_es_effektek_kezele",
      "hu": "Csomagok, korlátok, betűtípusok és effektek kezelése.",
      "en": "Manage plans, limits, fonts and effects."
    },
    {
      "key": "dream_lab",
      "hu": "Dream Lab",
      "en": "Dream Lab"
    },
    {
      "key": "egy_kattintassal_elkeszul_a_qr_kod_es_kiderul_me",
      "hu": "Egy kattintással elkészül a QR-kód, és kiderül, melyik NFC-chipre fér rá a link.",
      "en": "With one click the QR code is created, and you see which NFC chip the link fits on."
    },
    {
      "key": "egyeb",
      "hu": "Egyéb",
      "en": "More"
    },
    {
      "key": "elegans",
      "hu": "Elegáns",
      "en": "Elegant"
    },
    {
      "key": "elerted_a_csomag_korlatjat_nem_adhato_hozza_tobb",
      "hu": "Elérted a csomag korlátját, nem adható hozzá több.",
      "en": "You have reached your plan's limit, no more can be added."
    },
    {
      "key": "elerted_a_csomag_korlatjat_nem_mentheto_tobb_pro",
      "hu": "Elérted a csomag korlátját, nem menthető több projekt.",
      "en": "You have reached your plan's limit, no more projects can be saved."
    },
    {
      "key": "fiok_es_beallitasok",
      "hu": "Fiók és beállítások",
      "en": "Account and settings"
    },
    {
      "key": "fotok",
      "hu": "Fotók",
      "en": "Photos"
    },
    {
      "key": "futurisztikus",
      "hu": "Futurisztikus",
      "en": "Futuristic"
    },
    {
      "key": "fajl_cime_https_mp3_m4a_ogg_wav",
      "hu": "Fájl címe (https, .mp3 .m4a .ogg .wav)",
      "en": "File address (https, .mp3 .m4a .ogg .wav)"
    },
    {
      "key": "fo_navigacio",
      "hu": "Fő navigáció",
      "en": "Main navigation"
    },
    {
      "key": "gyors_otlet_keszult_szabaly_alapu_ai_szerver_nel",
      "hu": "Gyors ötlet készült (szabály alapú, AI-szerver nélkül). Szabadon módosíthatod.",
      "en": "A quick idea was created (rule-based, without an AI server). You can edit it freely."
    },
    {
      "key": "gyorsbillentyuk_ctrl_c_ctrl_x_ctrl_v_delete_nyil",
      "hu": "Gyorsbillentyűk: Ctrl+C, Ctrl+X, Ctrl+V, Delete, nyilak.",
      "en": "Shortcuts: Ctrl+C, Ctrl+X, Ctrl+V, Delete, arrow keys."
    },
    {
      "key": "hang",
      "hu": "Hang",
      "en": "Audio"
    },
    {
      "key": "hangok",
      "hu": "Hangok",
      "en": "Sounds"
    },
    {
      "key": "hozzaadas",
      "hu": "Hozzáadás",
      "en": "Add"
    },
    {
      "key": "ikonok",
      "hu": "Ikonok",
      "en": "Icons"
    },
    {
      "key": "itt_meg_nincs_semmi",
      "hu": "Itt még nincs semmi.",
      "en": "There is nothing here yet."
    },
    {
      "key": "jelolj_ki_egy_szoveget_az_elonezetben",
      "hu": "Jelölj ki egy szöveget az előnézetben.",
      "en": "Select a text in the preview first."
    },
    {
      "key": "kattints_egy_elemre_az_elonezetben_es_huzassal_m",
      "hu": "Kattints egy elemre az előnézetben, és húzással mozgasd, méretezd, forgasd.",
      "en": "Click an element in the preview, then drag it to move, resize and rotate it."
    },
    {
      "key": "kb_hasznos_hely",
      "hu": "Kb. hasznos hely",
      "en": "Approx. usable space"
    },
    {
      "key": "kereses_a_sablonok_kozott",
      "hu": "Keresés a sablonok között",
      "en": "Search among templates"
    },
    {
      "key": "kezdes_x_ingyenes_szinnel",
      "hu": "Kezdés {x} ingyenes színnel",
      "en": "Start with {x} free colors"
    },
    {
      "key": "kezdolap",
      "hu": "Kezdőlap",
      "en": "Home"
    },
    {
      "key": "kiemelt_lehetosegek",
      "hu": "Kiemelt lehetőségek",
      "en": "Featured options"
    },
    {
      "key": "kuka",
      "hu": "Kuka",
      "en": "Trash"
    },
    {
      "key": "kartya_kivalasztasa",
      "hu": "Kártya kiválasztása",
      "en": "Choose a card"
    },
    {
      "key": "kep_cime_https",
      "hu": "Kép címe (https://…)",
      "en": "Image address (https://…)"
    },
    {
      "key": "keparany",
      "hu": "Képarány",
      "en": "Aspect ratio"
    },
    {
      "key": "keszul",
      "hu": "Készül…",
      "en": "Working…"
    },
    {
      "key": "legutobbi_otletek",
      "hu": "Legutóbbi ötletek",
      "en": "Recent ideas"
    },
    {
      "key": "legutobbiak",
      "hu": "Legutóbbiak",
      "en": "Recent"
    },
    {
      "key": "logok",
      "hu": "Logók",
      "en": "Logos"
    },
    {
      "key": "letrehozas",
      "hu": "Létrehozás",
      "en": "Create"
    },
    {
      "key": "ma_mit_fogsz_tervezni",
      "hu": "Ma mit fogsz tervezni?",
      "en": "What will you design today?"
    },
    {
      "key": "mappa_neve",
      "hu": "Mappa neve:",
      "en": "Folder name:"
    },
    {
      "key": "mappaba",
      "hu": "Mappába",
      "en": "Move to folder"
    },
    {
      "key": "melyik_kartyahoz",
      "hu": "Melyik kártyához?",
      "en": "Which card?"
    },
    {
      "key": "mentsd_el_a_kartyat_a_projektek_koze_majd_a_nyom",
      "hu": "Mentsd el a kártyát a Projektek közé, majd a Nyomdában készíts belőle QR-kódot vagy NFC-linket.",
      "en": "Save the card among your Projects, then create a QR code or NFC link from it in Print."
    },
    {
      "key": "minden_projekt",
      "hu": "Minden projekt",
      "en": "All projects"
    },
    {
      "key": "minden_tervedben_eletre_kelthetsz_az_arculatodat",
      "hu": "Minden tervedben életre kelthetsz az arculatodat",
      "en": "Bring your brand to life in all your designs"
    },
    {
      "key": "mit_tartalmaz_az_ingyenes_es_a_fizetos_csomag",
      "hu": "Mit tartalmaz az ingyenes és a fizetős csomag?",
      "en": "What do the free and paid plans include?"
    },
    {
      "key": "masolas",
      "hu": "Másolás",
      "en": "Copy"
    },
    {
      "key": "meg_nincs_elem_add_hozza_az_elsot",
      "hu": "Még nincs elem. Add hozzá az elsőt!",
      "en": "No items yet. Add the first one!"
    },
    {
      "key": "meg_nincs_mentett_projekted_hozz_letre_egy_karty",
      "hu": "Még nincs mentett projekted. Hozz létre egy kártyát, és mentsd el!",
      "en": "You have no saved projects yet. Create a card and save it!"
    },
    {
      "key": "meg_nincs_otlet_ird_le_az_elsot",
      "hu": "Még nincs ötlet. Írd le az elsőt!",
      "en": "No ideas yet. Describe the first one!"
    },
    {
      "key": "modositva_x",
      "hu": "Módosítva: {x}",
      "en": "Modified: {x}"
    },
    {
      "key": "modositas_datuma_regi_elol",
      "hu": "Módosítás dátuma (régi elöl)",
      "en": "Date modified (oldest first)"
    },
    {
      "key": "modositas_datuma_uj_elol",
      "hu": "Módosítás dátuma (új elöl)",
      "en": "Date modified (newest first)"
    },
    {
      "key": "navigacio_szukitese",
      "hu": "Navigáció szűkítése",
      "en": "Collapse navigation"
    },
    {
      "key": "nfc_chip_kivalasztasa",
      "hu": "NFC-chip kiválasztása",
      "en": "Choose an NFC chip"
    },
    {
      "key": "nincs_mappa",
      "hu": "Nincs mappa",
      "en": "No folder"
    },
    {
      "key": "nincs_talalat",
      "hu": "Nincs találat.",
      "en": "No results."
    },
    {
      "key": "nincs_uj_ertesites",
      "hu": "Nincs új értesítés.",
      "en": "No new notifications."
    },
    {
      "key": "nyelv_es_nezet",
      "hu": "Nyelv és nézet",
      "en": "Language and view"
    },
    {
      "key": "nyomda",
      "hu": "Nyomda",
      "en": "Print"
    },
    {
      "key": "nyomtatas_vagy_iras_chipre",
      "hu": "Nyomtatás vagy írás chipre",
      "en": "Print or write to a chip"
    },
    {
      "key": "nepszeru_sablonok",
      "hu": "Népszerű sablonok",
      "en": "Popular templates"
    },
    {
      "key": "nev",
      "hu": "Név",
      "en": "Name"
    },
    {
      "key": "nev_a_z",
      "hu": "Név (A–Z)",
      "en": "Name (A–Z)"
    },
    {
      "key": "nevjegy",
      "hu": "Névjegy",
      "en": "Business card"
    },
    {
      "key": "nevtelen_kartya",
      "hu": "Névtelen kártya",
      "en": "Untitled card"
    },
    {
      "key": "png_letoltese",
      "hu": "PNG letöltése",
      "en": "Download PNG"
    },
    {
      "key": "projekt_elmentve",
      "hu": "Projekt elmentve.",
      "en": "Project saved."
    },
    {
      "key": "projekt_neve",
      "hu": "Projekt neve",
      "en": "Project name"
    },
    {
      "key": "projektek",
      "hu": "Projektek",
      "en": "Projects"
    },
    {
      "key": "projektek_keresese",
      "hu": "Projektek keresése",
      "en": "Search projects"
    },
    {
      "key": "qr_kod_es_nfc_link",
      "hu": "QR-kód és NFC-link",
      "en": "QR code and NFC link"
    },
    {
      "key": "retro",
      "hu": "Retro",
      "en": "Retro"
    },
    {
      "key": "romantikus",
      "hu": "Romantikus",
      "en": "Romantic"
    },
    {
      "key": "sablonkategoriak_bongeszese",
      "hu": "Sablonkategóriák böngészése",
      "en": "Browse template categories"
    },
    {
      "key": "stilus",
      "hu": "Stílus",
      "en": "Style"
    },
    {
      "key": "svg_letoltese",
      "hu": "SVG letöltése",
      "en": "Download SVG"
    },
    {
      "key": "szerkeszto",
      "hu": "Szerkesztő",
      "en": "Editor"
    },
    {
      "key": "sugo",
      "hu": "Súgó",
      "en": "Help"
    },
    {
      "key": "tanulokozpont",
      "hu": "Tanulóközpont",
      "en": "Learning center"
    },
    {
      "key": "tartsd_az_nfc_chipet_a_telefon_hatuljahoz",
      "hu": "Tartsd az NFC-chipet a telefon hátuljához…",
      "en": "Hold the NFC chip to the back of your phone…"
    },
    {
      "key": "tervezz_tovabb",
      "hu": "Tervezz tovább",
      "en": "Continue designing"
    },
    {
      "key": "tulajdonsagok",
      "hu": "Tulajdonságok",
      "en": "Properties"
    },
    {
      "key": "toltsd_le_a_qr_kodot_nyomtasd_ki_vagy_ird_ra_a_l",
      "hu": "Töltsd le a QR-kódot, nyomtasd ki, vagy írd rá a linket az NFC-chipre.",
      "en": "Download the QR code, print it, or write the link to the NFC chip."
    },
    {
      "key": "vidam",
      "hu": "Vidám",
      "en": "Playful"
    },
    {
      "key": "visszaallitas",
      "hu": "Visszaállítás",
      "en": "Restore"
    },
    {
      "key": "valassz_sablont_a_sablonok_oldalon_vagy_kezdj_ur",
      "hu": "Válassz sablont a Sablonok oldalon, vagy kezdj üres kártyával.",
      "en": "Choose a template on the Templates page, or start with a blank card."
    },
    {
      "key": "valaszd_ki_a_szerkesztoben_levo_vagy_egy_mentett",
      "hu": "Válaszd ki a szerkesztőben lévő vagy egy mentett kártyádat.",
      "en": "Pick the card from the editor or one of your saved cards."
    },
    {
      "key": "vegleges_torles",
      "hu": "Végleges törlés",
      "en": "Delete permanently"
    },
    {
      "key": "x_masolat",
      "hu": "{x} (másolat)",
      "en": "{x} (copy)"
    },
    {
      "key": "atnevezes",
      "hu": "Átnevezés",
      "en": "Rename"
    },
    {
      "key": "ertesitesek",
      "hu": "Értesítések",
      "en": "Notifications"
    },
    {
      "key": "igy_mukodik",
      "hu": "Így működik",
      "en": "How it works"
    },
    {
      "key": "igy_tervezhetsz_kartyat_lepesrol_lepesre",
      "hu": "Így tervezhetsz kártyát lépésről lépésre.",
      "en": "This is how you design a card step by step."
    },
    {
      "key": "ird_le_az_elkepzelt_kartyat_en_pedig_eletre_kelt",
      "hu": "Írd le az elképzelt kártyát, én pedig életre keltem",
      "en": "Describe the card you imagine, and I will bring it to life"
    },
    {
      "key": "osszes_megtekintese",
      "hu": "Összes megtekintése",
      "en": "View all"
    },
    {
      "key": "osszes_sablon_x",
      "hu": "Összes sablon: {x}",
      "en": "All templates: {x}"
    },
    {
      "key": "uj_nev",
      "hu": "Új név:",
      "en": "New name:"
    },
    {
      "key": "udvozol_a_nyomda",
      "hu": "Üdvözöl a Nyomda",
      "en": "Welcome to Print"
    },
    {
      "key": "unnepek",
      "hu": "Ünnepek",
      "en": "Holidays"
    },
    {
      "key": "unnepi",
      "hu": "Ünnepi",
      "en": "Festive"
    },
    {
      "key": "ures_kartya_2",
      "hu": "Üres kártya",
      "en": "Blank card"
    },
    {
      "key": "ragyogo_effektek_minden_alkalomra",
      "hu": "✨ Ragyogó effektek minden alkalomra",
      "en": "✨ Brilliant effects for every occasion"
    },
    {
      "key": "szinek",
      "hu": "🎨 Színek",
      "en": "🎨 Colors"
    },
    {
      "key": "arculati_hang",
      "hu": "🎵 Arculati hang",
      "en": "🎵 Brand audio"
    },
    {
      "key": "a_sajat_arculatod_minden_kartyan",
      "hu": "🏷️ A saját arculatod minden kártyán",
      "en": "🏷️ Your own brand on every card"
    },
    {
      "key": "logok_2",
      "hu": "🏷️ Logók",
      "en": "🏷️ Logos"
    },
    {
      "key": "elofizetes",
      "hu": "👑 Előfizetés",
      "en": "👑 Subscribe"
    },
    {
      "key": "elofizetes_hamarosan",
      "hu": "👑 Előfizetés (hamarosan)",
      "en": "👑 Subscribe (coming soon)"
    },
    {
      "key": "mentes_2",
      "hu": "💾 Mentés",
      "en": "💾 Save"
    },
    {
      "key": "qr_kod_es_nfc_chip_a_kartyadhoz",
      "hu": "📲 QR-kód és NFC-chip a kártyádhoz",
      "en": "📲 QR code and NFC chip for your card"
    },
    {
      "key": "iras_nfc_chipre",
      "hu": "📲 Írás NFC chipre",
      "en": "📲 Write to NFC chip"
    },
    {
      "key": "fizetos_betutipusok",
      "hu": "🔒 Fizetős betűtípusok",
      "en": "🔒 Paid fonts"
    },
    {
      "key": "fizetos_effektek",
      "hu": "🔒 Fizetős effektek",
      "en": "🔒 Paid effects"
    },
    {
      "key": "fizetos_mediaforrasok",
      "hu": "🔒 Fizetős médiaforrások",
      "en": "🔒 Paid media sources"
    },
    {
      "key": "betutipus_3",
      "hu": "🔤 Betűtípus",
      "en": "🔤 Font"
    },
    {
      "key": "legutobbiak_2",
      "hu": "🕘 Legutóbbiak",
      "en": "🕘 Recent"
    },
    {
      "key": "nyomtatas",
      "hu": "🖨️ Nyomtatás",
      "en": "🖨️ Print"
    },
    {
      "key": "fotok_2",
      "hu": "🖼️ Fotók",
      "en": "🖼️ Photos"
    },
    {
      "key": "minden_projekt_2",
      "hu": "🗂 Minden projekt",
      "en": "🗂 All projects"
    },
    {
      "key": "kuka_2",
      "hu": "🗑 Kuka",
      "en": "🗑 Trash"
    },
    {
      "key": "ikonok_2",
      "hu": "😀 Ikonok",
      "en": "😀 Icons"
    },
    {
      "key": "betoltes",
      "hu": "Betöltés…",
      "en": "Loading…"
    },
    {
      "key": "a_kep_a_kod_mogott_latszik_a_qr_pontjai_raulnek_",
      "hu": "A kép a kód mögött látszik, a QR pontjai ráülnek. Látványos, de kevésbé biztonságos: mindig próbáld ki telefonnal.",
      "en": "The image shows behind the code, and the QR dots sit on top of it. Spectacular, but less safe: always test it with a phone."
    },
    {
      "key": "a_kepet_nem_sikerult_betolteni_ha_idegen_kiszolg",
      "hu": "A képet nem sikerült betölteni. Ha idegen kiszolgálóról való, töltsd fel a fájlt a gépedről.",
      "en": "The image could not be loaded. If it comes from another server, upload the file from your computer."
    },
    {
      "key": "a_link_tul_hosszu_ehhez_a_modhoz_ezert_egyszeru_",
      "hu": "A link túl hosszú ehhez a módhoz, ezért egyszerű kód készült. Használj rövidebb linket.",
      "en": "The link is too long for this mode, so a plain code was created. Use a shorter link."
    },
    {
      "key": "a_logo_a_kod_kozepen_van_a_magas_hibajavitas_mia",
      "hu": "A logó a kód közepén van, a magas hibajavítás miatt a kód így is olvasható marad. A logó legyen egyszerű és jól látható.",
      "en": "The logo is in the middle of the code; thanks to the high error correction the code stays readable. Keep the logo simple and clearly visible."
    },
    {
      "key": "a_logo_a_kozepen",
      "hu": "A) Logó a közepén",
      "en": "A) Logo in the middle"
    },
    {
      "key": "arculati_foto",
      "hu": "Arculati fotó",
      "en": "Brand photo"
    },
    {
      "key": "arculati_logo",
      "hu": "Arculati logó",
      "en": "Brand logo"
    },
    {
      "key": "az_olvashatosagert_a_program_finomitotta_a_beall",
      "hu": "Az olvashatóságért a program finomította a beállítást.",
      "en": "The program refined the setting to keep the code readable."
    },
    {
      "key": "az_svg_nem_keszitheto_ehhez_a_kephez_toltsd_fel_",
      "hu": "Az SVG nem készíthető ehhez a képhez. Töltsd fel a fájlt a gépedről, vagy használd a PNG-t.",
      "en": "The SVG cannot be created for this image. Upload the file from your computer, or use the PNG."
    },
    {
      "key": "b_kep_a_mintazatban",
      "hu": "B) Kép a mintázatban",
      "en": "B) Image in the pattern"
    },
    {
      "key": "hagyomanyos_qr_kod_a_legbiztonsagosabban_olvasha",
      "hu": "Hagyományos QR-kód. A legbiztonságosabban olvasható.",
      "en": "A traditional QR code. The most reliably readable."
    },
    {
      "key": "hibajavitas",
      "hu": "Hibajavítás",
      "en": "Error correction"
    },
    {
      "key": "hatter_szine",
      "hu": "Háttér színe",
      "en": "Background color"
    },
    {
      "key": "hatterparna",
      "hu": "Háttérpárna",
      "en": "Background pad"
    },
    {
      "key": "kep_fajl",
      "hu": "Kép (fájl)",
      "en": "Image (file)"
    },
    {
      "key": "kep_erossege",
      "hu": "Kép erőssége",
      "en": "Image strength"
    },
    {
      "key": "kor",
      "hu": "Kör",
      "en": "Circle"
    },
    {
      "key": "lekerekitett",
      "hu": "Lekerekített",
      "en": "Rounded"
    },
    {
      "key": "logo_fajl",
      "hu": "Logó (fájl)",
      "en": "Logo (file)"
    },
    {
      "key": "logo_merete",
      "hu": "Logó mérete",
      "en": "Logo size"
    },
    {
      "key": "minta_szine",
      "hu": "Minta színe",
      "en": "Pattern color"
    },
    {
      "key": "modulforma",
      "hu": "Modulforma",
      "en": "Module shape"
    },
    {
      "key": "negyzet",
      "hu": "Négyzet",
      "en": "Square"
    },
    {
      "key": "png_merete_px",
      "hu": "PNG mérete (px)",
      "en": "PNG size (px)"
    },
    {
      "key": "pont",
      "hu": "Pont",
      "en": "Dot"
    },
    {
      "key": "pontmeret",
      "hu": "Pontméret",
      "en": "Dot size"
    },
    {
      "key": "standard",
      "hu": "Standard",
      "en": "Standard"
    },
    {
      "key": "szinek_2",
      "hu": "Színek",
      "en": "Colors"
    },
    {
      "key": "szines_kep",
      "hu": "Színes kép",
      "en": "Color image"
    },
    {
      "key": "valassz_kepet_addig_a_standard_kod_latszik",
      "hu": "Válassz képet, addig a standard kód látszik.",
      "en": "Choose an image; until then the standard code is shown."
    },
    {
      "key": "valassz_logot_addig_a_standard_kod_latszik",
      "hu": "Válassz logót, addig a standard kód látszik.",
      "en": "Choose a logo; until then the standard code is shown."
    },
    {
      "key": "ebben_a_bongeszoben_nincs_automatikus_ellenorzes",
      "hu": "ℹ Ebben a böngészőben nincs automatikus ellenőrzés. Nyomtatás előtt próbáld ki telefonnal.",
      "en": "ℹ This browser has no automatic check. Test it with a phone before printing."
    },
    {
      "key": "az_automatikus_ellenorzes_nem_tudta_beolvasni_cs",
      "hu": "⚠ Az automatikus ellenőrzés nem tudta beolvasni. Csökkentsd a logó méretét vagy erősítsd a mintát, és próbáld ki telefonnal.",
      "en": "⚠ The automatic check could not read it. Reduce the logo size or strengthen the pattern, and test it with a phone."
    },
    {
      "key": "olvashato_automatikusan_ellenorizve",
      "hu": "✔ Olvasható (automatikusan ellenőrizve).",
      "en": "✔ Readable (verified automatically)."
    },
    {
      "key": "nincs_2",
      "hu": "– nincs –",
      "en": "– none –"
    }
  ]
}
