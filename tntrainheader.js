/*パッケージファイル用 tntrainのヘッダ*/
var TNTrainHeader = function(text){

	var elements = text.split(",");
	//列車名
	this.trainName = elements[0];
	//平日休日区分
	this.service = parseInt(elements[1]);
	//直通先情報
	this.nextLineID = parseInt(elements[4]) || 0;
	this.nextTrainName = elements[5];

	//開始時間、終了時間
	this.startTime = null;
	this.endTime = null;
	var i;
	for(i=7; i<elements.length-1; i+=4)
	{
		if(i == 7) this.startTime = TNFuncs.makeTime(elements[i+1]);
		if(i+4 >= elements.length-1) this.endTime = TNFuncs.makeTime(elements[i+3]);
	}
}
TNTrainHeader.prototype = {
	isMatch : function(fromTime, toTime, service, trains, lineName){
		if(this.startTime <= toTime && fromTime <= this.endTime && this.service == service){
			var alreadyLoaded = false;
			for(var i=0; i<trains.length; i++){
				if(trains[i].line,lineName == lineName && trains[i].trainName == this.trainName){
					alreadyLoaded = true;
					break;
				}
			}
			if(!alreadyLoaded) return true;
		}
		return false;
	}
};