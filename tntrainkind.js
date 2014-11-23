/*列車種類オブジェクト*/
var TNTrainKind = function(line, text){
	//csv形式の駅情報をオブジェクトに変換する
	this.line = line;
	var elements = text.split(",");
	this.trainKindID = parseInt(elements[0]);
	this.trainKindName = elements[1];
	this.trainKindColor = elements[2];
}