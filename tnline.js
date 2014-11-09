/*路線オブジェクト*/
var TNLine = function(text){
	//csv形式の情報をオブジェクトに変換する
	var elements = text.split(",");
	this.lineID = parseInt(elements[0]);
	this.lineName = elements[1];
	this.lineColor = elements[2];
	this.trainKinds = [];
	this.stations = [];
	this.halfways = [];
}

TNLine.prototype = {
	GetStation: function(stationID){
		$.each(stations, function(i, val){
			if(val.stationID == stationID) return val;
		});
		return null;
	}

}