/*列車オブジェクト*/
var TNTrain = function(line, text){
	//csv形式の情報をオブジェクトに変換する
	this.line = line;
	var elements = text.split(",");
	this.trainName = elements[0];
	this.lineName = elements[1];
	this.lineColor = elements[2];
	this.routes = [];

}