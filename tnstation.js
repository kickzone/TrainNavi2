/*駅オブジェクト*/
var TNStation = function(line, text){
	//csv形式の駅情報をオブジェクトに変換する
	this.line = line;
	var elements = text.split(",");
	this.stationID = parseInt(elements[0]);
	this.stationName = elements[1];
	this.kilo = parseFloat(elements[2]);
	this.latitude = parseFloat(elements[3]);
	this.longitude = parseFloat(elements[4]);
}