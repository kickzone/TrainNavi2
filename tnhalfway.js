/*通過点オブジェクト*/
var TNHalfway = function(line, text){
	this.line = line;
	var elements = text.split(",");
	this.kilo = parseFloat(elements[0]);
	this.latitude = parseFloat(elements[1]);
	this.longitude = parseFloat(elements[2]);
	this.prevBezier = null;
	if(parseFloat(elements[3]) != 0){
		this.prevBezire = new TNBezier(parseFloat(elements[3]), parseFloat(elements[4]), parseFloat(elements[5]), parseFloat(elements[6]))
	}
	this.nextBezier = null;
	if(parseFloat(elements[7]) != 0){
		this.nextBezier = new TNBezier(parseFloat(elements[7]), parseFloat(elements[8]), parseFloat(elements[9]), parseFloat(elements[10]))
	}
	this.prevRail = null;
	this.nextRail = null;
	this.prevPoint = null;
	this.nextPoint = null;

	this.absX = 0;
	this.absY = 0;
	this.shape = {x:0, y:0};
	this.size = 0;

	//TNStationを継承
	this.__proto__= TNStation.prototype;

	//この関数だけ変える
	this.makeObject = function(cj, stage, absX, absY, scale){
		this.scale = scale;
		this.absX = absX;
		this.absY = absY;
	},
	this.moveObject = function(relX, relY){
		this.shape.x = this.absX + relX;
		this.shape.y = this.absY + relY;
	};
}
