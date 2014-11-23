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
	this.railroads = [];
}

TNLine.prototype = {
	getStation: function(stationID){
		var ret = null;
		$.each(this.stations, function(i, val){
			if(val.stationID == stationID) ret = val;
		});
		return ret;
	},
	getTrainKind: function(trainKindID){
		var ret = null;
		$.each(this.trainKinds, function(i, val){
			if(val.trainKindID == trainKindID) ret = val;
		});
		return ret;
	},
	getSortedPoints: function(){
		var ret = [];
		ret = ret.concat(this.stations).concat(this.halfways);
		ret.sort(
			function(a, b){
				return a.kilo - b.kilo;
			});
		return ret;
	}
}