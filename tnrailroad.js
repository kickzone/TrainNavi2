/*線路オブジェクト*/
var TNRailroad = function(line, start, end){
	this.line = line;
	this.start = start;
	this.end = end;

	//初期位置、係数
	this.absX = 0;
	this.absY = 0;
	this.scale = 1.0;

	//描画オブジェクトの参照
	this.cj = null;
	this.stage = null;
	this.shape = null;

	//サイズ(直線の方向)
	this.sizeX = 0;
	this.sizeY = 0;
}

TNRailroad.prototype = {
	makeObject : function(cj, stage, x, y){
		if(this.shape){
			stage.removeChild(this.shape);
			this.shape = null;
		} else {
			this.stage = stage;
			this.cj = cj;
		}
		var gr = new cj.Graphics();
		 //線の太さ3
		//路線を描画
		gr.setStrokeStyle(3).beginStroke(this.line.lineColor).moveTo(0, 0).lineTo(x, y).endStroke();
		this.sizeX = x;
		this.sizeY = y;
		this.absX = this.start.absX;
		this.absY = this.start.absY;
		var sha = new cj.Shape(gr);
		this.shape = sha;
		sha.alpha = 0.8;
		//stageに追加
		stage.addChild(sha);
		//エディットモード用の対処
		if(TNView.getEditMode()){
			TNEdit.setRailHandlers(this);
		}
	},
	//2番目の点
	secondPoint : function(isNobori){
		if(isNobori){
			return {x: this.start.absX, y: this.start.absY}
		}else{
			return {x: this.end.absX, y: this.end.absY}
		}

	},
	//最後から2番目の点
	secondLastPoint : function(isNobori){
		if(isNobori){
			return {x: this.end.absX, y: this.end.absY}
		} else{
			return {x: this.start.absX, y: this.start.absY}
		}
	},
	//trainに絶対XY座標をセット
	setXY : function(train){
		//始点と終点を決定
		//下りならstart→endの順
		var npStart = this.start.calcNormalVector(train);
		var startX = this.start.absX + npStart.x*TNView.tdist;
		var startY = this.start.absY + npStart.y*TNView.tdist;
		var npEnd = this.end.calcNormalVector(train);
		var endX = this.end.absX + npEnd.x*TNView.tdist
		var endY = this.end.absY + npEnd.y*TNView.tdist;

		//trainのkiloを見て位置を判断
		var kiloStartEnd = this.end.kilo - this.start.kilo;
		var kiloThis = train.kilo - this.start.kilo;
		var vecX = endX - startX;
		var vecY = endY - startY;
		train.absX = startX + vecX * kiloThis / kiloStartEnd;
		train.absY = startY + vecY * kiloThis / kiloStartEnd;
		//さらに行先の文字列にも位置をセット
		for(var i=0; i<train.destText.length; i++){
			var factor = i+1;
			if(npStart.x + npStart.y < 0) factor = (train.destText.length-i+1);
			var dist = TNView.tdist + (factor * train.size * 1.5);
			startX = this.start.absX + npStart.x * dist;
			startY = this.start.absY + npStart.y * dist;

			factor = i+1;
			if(npEnd.x + npEnd.y < 0) factor = (train.destText.length-i+1);
			dist = TNView.tdist + (factor * train.size * 1.5);
			endX = this.end.absX + npEnd.x * dist;
			endY = this.end.absY + npEnd.y * dist;

			vecX = endX - startX;
			vecY = endY - startY;

			train.destText[i].absX = startX + vecX * kiloThis / kiloStartEnd - train.destTextWidth[i]/2;
			train.destText[i].absY = startY + vecY * kiloThis / kiloStartEnd - train.destTextHeight[i]/2;
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
		//shapeが画面上から消える場合はstageから消す
		if(this.onStage){
			if(!this.inCanvas()){
				this.stage.removeChild(this.shape);
				this.onStage = false;
			}
		} else{
			if(this.inCanvas()){
				this.stage.addChild(this.shape);
				this.onStage = true;
			}
		}
	},
	//長さ
	calcDistance : function(){
		return Math.sqrt(Math.pow(this.end.latitude - this.start.latitude, 2) + Math.pow(this.end.longitude - this.start.longitude, 2));
	},
	inCanvas : function(){
		var xmin = this.sizeX >= 0? this.shape.x : this.shape.x + this.sizeX;
		var xmax = this.sizeX >= 0? this.shape.x + this.sizeX : this.shape.x;
		var ymin = this.sizeY >= 0? this.shape.y : this.shape.y + this.sizeY;
		var ymax = this.sizeY >= 0? this.shape.y + this.sizeY : this.shape.y;
		return TNFuncs.isRectOverlapped(
				xmin, ymin, xmax, ymax,
				0, 0, TNView.width, TNView.height
		);
	}
}