/*線路オブジェクト*/
var TNRailroad = function(line, start, end){
	this.line = line;
	this.start = start;
	this.end = end;
	this.trains = [];
	this.bezier = null;
	if(start.nextBezier) this.bezier = start.nextBezier;
	if(end.prevBezire) this.bezier = end.prevBezier;

	//初期位置、係数
	this.initLatView = 0;
	this.initLonView = 0;
	this.coefXY = 0;
	this.scale = 1.0;

	//描画オブジェクトの参照
	this.cj = null;
	this.stage = null;
	this.shape = null;
}

TNRailroad.prototype = {
	makeObject : function(cj, stage, coefXY, latView, lonView){
		this.cj = cj;
		this.stage = stage;
		var gr = new cj.Graphics();
		//ベジエの場合 未実装
		if(this.bezirer){

		//直線の場合
		}else{
			 //線の太さ3
			//XY座標計算
			var x = (this.end.longitude - this.start.longitude) * coefXY;
			var y = (this.start.latitude - this.end.latitude) * coefXY;
			//路線を描画
			gr.setStrokeStyle(3).beginStroke(this.line.lineColor).moveTo(0, 0).lineTo(x, y).endStroke();
		}
		var sha = new cj.Shape(gr);
		this.shape = sha;
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
		var x = ((this.start.longitude - this.initLonView) * this.coefXY + (lonView - this.initLonView) * this.coefXY) * this.scale + centerX;
		var y = ((this.initLatView - this.start.latitude) * this.coefXY + (this.initLatView - latView) * this.coefXY) * this.scale + centerY;
		this.shape.x = x;
		this.shape.y = y;
	}
}