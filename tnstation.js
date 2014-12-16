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
	this.address = elements[5];

	//初期位置、係数
	this.absX = 0;
	this.absY = 0;
	this.scale = 1.0;

	//大きさ
	this.size = 10;

	//オブジェクトの参照
	this.prevRail = null;
	this.nextRail = null;
	this.prevPoint = null;
	this.nextPoint = null;

	//描画オブジェクトの参照
	this.cj = null;
	this.stage = null;
	this.shape = null;

	//駅名
	this.shapeEkimei = null;

	//現在stageに登録中かどうか
	this.onStage = false;

	//キャッシュしてみる
	this.pNobori = null;
	this.pKudari = null;
}

TNStation.prototype = {
	makeObject : function(cj, stage, absX, absY, scale){
		if(this.shape){
			if(this.scale <= 64.0) stage.removeChild(this.shape);
			if(this.scale <= 16.0) stage.removeChild(this.shapeEkimei);
			this.shape = null;
		} else {
			this.stage = stage;
			this.cj = cj;
		}
		this.scale = scale;
		var sha = new cj.Shape()
		this.shape = sha;
		sha.alpha = 0.8;
		var gr = sha.graphics;
		//描画
		gr.beginStroke(this.line.lineColor).beginFill(this.line.lineColor).drawRect(-this.size/2, -this.size/2, this.size, this.size, 1);
		//駅名
		var shaEki = new cj.Text(this.stationName, this.size.toString(10) + "px ＭＳ Ｐゴシック", "#696969");
		shaEki.alpha = 0.4;
		this.shapeEkimei = shaEki;
		//stageに追加
		//2014/11/30 画面上にある場合のみ
		if(this.inCanvas()){
			if(this.scale <= 64.0) stage.addChild(sha);
			if(this.scale <= 16.0) stage.addChild(shaEki);
			this.onStage = true;
		}

		this.absX = absX;
		this.absY = absY;
	},
	//trainに絶対XY座標をセット
	setXY : function(train){
		var p = this.calcNormalVector(train);
		train.absX = this.absX + p.x*TNView.tdist;
		train.absY = this.absY + p.y*TNView.tdist;
		//さらに行先の文字列にも位置をセット
		for(var i=0; i<train.destText.length; i++){
			var factor = i+1;
			if(p.x + p.y < 0) factor = (train.destText.length-i+1);
			var dist = TNView.tdist + (factor * train.size * 1.5);
			train.destText[i].absX = this.absX + p.x * dist - train.destTextWidth[i]/2;
			train.destText[i].absY = this.absY + p.y * dist - train.destTextHeight[i]/2;
		}
	},
	//trainの位置のための単位ベクトルを算出
	calcNormalVector : function(train){
		var p;
		var route = train.currentRoute;
		var railNext = this.getNextRail(train.isNobori);
		var railPrev = this.getPrevRail(train.isNobori);
		//始発駅かどうか
		if(this == train.firstStation()){
			if(train.prevTrain){
				//乗り入れがあった場合は、駅に接続する線路との角の二等分線上の値を計算する
				var railPrevPrev = train.prevTrain.lastStation().getPrevRail(train.prevTrain.isNobori);
				if(railPrevPrev == null){
					var test = 0;
					test = 1;
				}
				p = TNFuncs.calcBisectUnitVector(
						railPrevPrev.secondLastPoint(train.prevTrain.isNobori),
						{x: this.absX, y:this.absY},
						railNext.secondPoint(train.isNobori)
				);
			} else {
				//乗り入れがなければ、法線ベクトルを足す
				p = TNFuncs.calcNormalUnitVector(
						{x: this.absX, y:this.absY},
						railNext.secondPoint(train.isNobori)
				);
			}
		}
		//終着駅かどうか
		else if(this == train.lastStation()){
			if(train.nextTrain){
				//乗り入れがある場合は、駅から伸びる線路との角の二等分線上の値を計算する
				var railNextNext = train.nextTrain.firstStation().getNextRail(train.nextTrain.isNobori);
				p = TNFuncs.calcBisectUnitVector(
						railPrev.secondLastPoint(train.isNobori),
						{x: train.nextTrain.firstStation().absX, y:train.nextTrain.firstStation().absY},
						railNextNext.secondPoint(train.nextTrain.isNobori)
					);
			} else {
				//乗り入れがなければ、法線ベクトルを足す
				p = TNFuncs.calcNormalUnitVector(
						railPrev.secondLastPoint(train.isNobori),
						{x: this.absX, y:this.absY}
				);
			}
		}
		//それ以外は途中駅
		else{
			if(train.isNobori && this.pNobori) p = this.pNobori;
			else if(!train.isNobori && this.pKudari) p = this.pKudari;
			else
			{
				if(railNext == null)
				{
					var test = 0;
					test = 1;
				}
				var p1 = railPrev.secondLastPoint(train.isNobori);
				var p2 = {x: this.absX, y:this.absY};
				p = TNFuncs.calcBisectUnitVector(
						railPrev.secondLastPoint(train.isNobori),
						{x: this.absX, y:this.absY},
						railNext.secondPoint(train.isNobori)
				);
				if(train.isNobori) this.pNobori = p;
				else this.pKudari = p;
			}
		}
		return p;
	},
	getPrevRail : function(isNobori){
		return isNobori? this.nextRail : this.prevRail;
	},
	getNextRail : function(isNobori){
		return isNobori? this.prevRail : this.nextRail;
	},
	getNextPoint : function(isNobori){
		return isNobori? this.prevPoint : this.nextPoint;
	},
	//オブジェクト移動 スクロール時など
	moveObject : function(relX, relY){
		this.shape.x = this.absX/* * this.scale */+ relX;
		this.shape.y = this.absY/* * this.scale */+ relY;
		this.shapeEkimei.x = this.shape.x - 10;
		this.shapeEkimei.y = this.shape.y + 10;
		//shapeが画面上から消える場合はstageから消す
		if(this.onStage){
			if(!this.inCanvas()){
				if(this.scale <= 64.0) this.stage.removeChild(this.shape);
				if(this.scale >= 16.0) this.stage.removeChild(this.shapeEkimei);
				this.onStage = false;
			}
		} else{
			if(this.inCanvas()){
				if(this.scale <= 64.0) this.stage.addChild(this.shape);
				if(this.scale <= 16.0) this.stage.addChild(this.shapeEkimei)
				this.onStage = true;
			}
		}
	},
	inCanvas : function(){
		return TNFuncs.isRectOverlapped(
				this.shape.x - this.size/2,
				this.shape.y - this.size/2,
				this.shape.x + this.size/2,
				this.shape.y + this.size/2,
				0, 0, TNView.width, TNView.height
		);
	}
}