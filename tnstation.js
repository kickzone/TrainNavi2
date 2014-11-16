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

	//初期位置、係数
	this.initLatView = 0;
	this.initLonView = 0;
	this.coefXY = 0;
	this.scale = 1.0;

	//オブジェクトの参照
	this.prevRail = null;
	this.nextRail = null;
	this.prevPoint = null;
	this.nextPoint = null;

	//描画オブジェクトの参照
	this.cj = null;
	this.stage = null;
	this.shape = null;
}

TNStation.prototype = {
	makeObject : function(cj, stage, coefXY, latView, lonView){
		this.stage = stage;
		this.cj = cj;
		var sha = new cj.Shape()
		this.shape = sha;
		var gr = sha.graphics;
		//描画
		gr.beginStroke(this.line.lineColor).beginFill(this.line.lineColor).drawRect(-5, -5, 10, 10, 1);
		//stageに追加
		stage.addChild(sha);

		//初期位置、係数を保存しておく
		this.initLatView = latView;
		this.initLonView = lonView;
		this.coefXY = coefXY;
	},
	setScale : function(scale){
		this.scale = scale;
		this.shape.scaleX = scale;
		this.shape.scaleY = scale;
	},
	moveObject : function(latView, lonView, centerX, centerY){
		var x = ((this.longitude - this.initLonView) * this.coefXY + (lonView - this.initLonView) * this.coefXY) * this.scale + centerX;
		var y = ((this.initLatView - this.latitude) * this.coefXY + (this.initLatView - latView) * this.coefXY) * this.scale + centerY;
		this.shape.x = x;
		this.shape.y = y;
	}
}