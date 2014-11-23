/*線路オブジェクト*/
var TNRailroad = function(line, start, end){
	this.line = line;
	this.start = start;
	this.end = end;
	this.bezier = null;
	if(start.nextBezier) this.bezier = start.nextBezier;
	if(end.prevBezire) this.bezier = end.prevBezier;

	//初期位置、係数
	this.absX = 0;
	this.absY = 0;
	this.scale = 1.0;

	//描画オブジェクトの参照
	this.cj = null;
	this.stage = null;
	this.shape = null;
}

TNRailroad.prototype = {
	makeObject : function(cj, stage, x, y){
		this.cj = cj;
		this.stage = stage;
		var gr = new cj.Graphics();
		//ベジエの場合 未実装
		if(this.bezire){

		//直線の場合
		}else{
			 //線の太さ3
			//路線を描画
			gr.setStrokeStyle(3).beginStroke(this.line.lineColor).moveTo(0, 0).lineTo(x, y).endStroke();
		}
		this.absX = this.start.absX;
		this.absY = this.start.absY;
		var sha = new cj.Shape(gr);
		this.shape = sha;
		sha.alpha = 0.8;
		//stageに追加
		stage.addChild(sha);
	},
	//2番目の点
	secondPoint : function(isNobori){
		//ベジエの場合 未実装
		if(this.bezire){

		}else{
			if(isNobori){
				return {x: this.start.absX, y: this.start.absY}
			}else{
				return {x: this.end.absX, y: this.end.absY}
			}
		}
	},
	//最後から2番目の点
	secondLastPoint : function(isNobori){
		if(this.bezire){
			//ベジエの場合 未実装
		}else{
			if(isNobori){
				return {x: this.end.absX, y: this.end.absY}
			} else{
				return {x: this.start.absX, y: this.start.absY}
			}
		}
	},
	//trainに絶対XY座標をセット
	setXY : function(train){
		if(this.bezire){
			//ベジエの場合 未実装
		} else{
			//始点と終点を決定
			//下りならstart→endの順
			var start = train.isNobori? this.end : this.start;
			var startPos = this.start.calcXY(train);
			var end = train.isNobori? this.start : this.end;
			var endPos = this.end.calcXY(train);

			//trainのkiloを見て位置を判断
			var kiloStartEnd = this.end.kilo - this.start.kilo;
			var kiloThis = train.kilo - this.start.kilo;
			var vecX = endPos.x - startPos.x;
			var vecY = endPos.y - startPos.y;
			train.absX = startPos.x + vecX * kiloThis / kiloStartEnd;
			train.absY = startPos.y + vecY * kiloThis / kiloStartEnd;
		}
	},
	//倍率設定
	setScale : function(scale){
		this.scale = scale;
		this.shape.scaleX = scale;
		this.shape.scaleY = scale;
	},
	//オブジェクト移動 スクロール時など
	moveObject : function(relX, relY){
		this.shape.x = this.absX * this.scale + relX;
		this.shape.y = this.absY * this.scale + relY;
	}
}