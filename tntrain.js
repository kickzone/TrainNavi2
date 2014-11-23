/*列車オブジェクト*/
var TNTrain = function(line, text){
	//サンプル
	//7901,1,1,,,,唐木田,1,5:35,2,5:37,,,3,5:38,,5:39,4,5:40,,5:41,5,5:42,,5:43,6,5:44,,,7,5:45,,5:46,8,5:47,,,9,5:49,,,10,5:50,,5:51,11,5:52,,5:53,12,5:54,,5:55,13,5:56,,5:57,14,5:58,,6:00,15,6:01,,6:02,16,6:03,,6:04,17,6:05,,,18,6:07,,,19,6:08,,6:09,20,6:11,,,21,6:13,,,22,6:15,,,23,6:17
	//csv形式の情報をオブジェクトに変換する
	this.line = line;
	var elements = text.split(",");
	//列車名
	this.trainName = elements[0];
	//平日休日区分
	this.service = parseInt(elements[1]);
	//列車種類(オブジェクト)
	this.trainKind = line.getTrainKind(parseInt(elements[2]));
	//列車種類名(はこね1号、など)
	this.trainKindName = elements[3];
	//直通先情報
	this.nextLineID = parseInt(elements[4]) || 0;
	this.nextTrainName = elements[5];
	this.nextTrain = null;
	this.prevTrain = null;
	//行先(直通先が読み込み対象でなかった場合のみ)
	this.terminal = elements[6];

	//以降、終点までの経路情報
	this.routes = [];
	var i;
	for(i=7; i<elements.length; i+=4)
	{
		var route = {};
		var startStationID = elements[i];
		if(startStationID == "")
		{
			startStationID = elements[i-2];
		}
		route.startStation = line.getStation(parseInt(startStationID));
		route.startTime = MakeTime(elements[i+1]);
		if(elements[i+1] == "")
		{
			route.startTime = MakeTime(elements[i-1]);
		}
		//ToDo:路線の一部の駅だけ読み込んだ場合に対応する必要がある
		route.endStation = line.getStation(parseInt(elements[i+2]));
		route.endTime = MakeTime(elements[i+3]);
		this.routes.push(route);
	}

	//routesの値を調整
	//1秒も止まらないのはあり得ないので30秒停車させる
	for(i=1; i<this.routes.length; i++)
	{
		if(this.routes[i-1].endTime.getTime() == this.routes[i].startTime.getTime())
		{
			this.routes[i-1].endTime.setSeconds(-15);
			this.routes[i].startTime.setSeconds(15);
		}
	}
	//上りか下りか
	//上り = 駅番号が大→小
	this.isNobori = false;
	if(this.routes.length > 0)
	{
		if(this.routes[0].startStation.stationID > this.routes[0].endStation.stationID) this.isNobori = true;
	}
	else
	{
		this.isNobori = false;
	}

	//絶対位置、倍率
	this.absX = 0;
	this.absY = 0;
	this.scale = 1.0;

	//描画オブジェクトの参照
	this.cj = null;
	this.stage = null;
	this.shape = null;

	//現在の営業キロ
	this.kilo = null;
	//対応するオブジェクト
	this.onObject = null;
	//現在のroute
	this.currentRoute = this.routes[0];

	//加減速にかかる時間(秒) デフォルトは30秒
	this.accTime = 30;
	this.decTime = 30;

	//現在時速(km/h)
	this.velocity = 0;

	//stageに乗っているかどうかのフラグ Viewでチェックする
	this.onStage = false;
	//運行が終わったので配列から除去するべきかどうかのフラグ
	this.toDelete = false;
	//発車したかどうか
	this.started = false;
	//終点まで来たかどうか
	this.ended = false;

	//時刻をDateオブジェクトに変換
	function MakeTime(timeStr)
	{
		var hhmm = timeStr.split(":");
		var h = parseInt(hhmm[0]);
		var m = parseInt(hhmm[1]);
		//StartTime基準で
		var ret = TNModel.getStartTime();

		//3時台までは深夜列車とみなす
		if(h < 4)
		{
			ret.setDate(ret.getDate()+1);
		}
		ret.setHours(h);
		ret.setMinutes(m);
		ret.setSeconds(0);
		ret.setMilliseconds(0);
		return ret;
	}
}

//メンバ関数
TNTrain.prototype = {
	makeObject : function(cj, stage){
		this.stage = stage;
		this.cj = cj;
		//ToDo:倍率によって大きさを変える必要がある
		var sha = new cj.Text("○", "12px ＭＳ Ｐゴシック", this.trainKind.trainKindColor);
		this.shape = sha;
		//sha.alpha = 0.8;
		//var gr = sha.graphics;
	},
	setTime : function(time){
		//現在時刻timeを得て、kiloと属するオブジェクトを決定する
		if(time <= this.routes[0].startTime)
		{
			//始点以前
			this.kilo = this.routes[0].startStation.kilo;
			this.onObject = this.routes[0].startStation;
			this.currentRoute = this.routes[0];
			this.velocity = 0;
		}
		else if(time >= this.routes[this.routes.length-1].endTime)
		{
			//終点以降
			this.kilo = this.routes[this.routes.length-1].endStation.kilo;
			this.onObject = this.routes[this.routes.length-1].endStation;
			this.currentRoute = this.routes[this.routes.length-1];
			this.velocity = 0;
		}
		else
		{
			//運行中
			for(var i=0; i<this.routes.length; i++){
				if(this.routes[i].startTime < time && this.routes[i].endTime > time){
					//路線の上
					this.kilo = this.calcKilo(this.routes[i], time);
					//通過駅も含めて所属路線を計算
					for(var point = this.routes[i].startStation; point != this.routes[i].endStation; point = point.getNextPoint(this.isNobori))
					{
						var rail = point.getNextRail(this.isNobori);
						if(rail.start.kilo <= this.kilo && this.kilo <= rail.end.kilo){
							this.onObject = rail;
							break;
						}
					}
					this.currentRoute = this.routes[i];
					//velocityはcalcKiloの中で計算する
					break;
				}
				else if(i < this.routes.length-1){
					if(this.routes[i].endTime <= time && this.routes[i+1].startTime >= time){
						//駅の上
						this.kilo = this.routes[i+1].startStation.kilo;
						this.onObject = this.routes[i+1].startStation;
						this.currentRoute = this.routes[i+1];
						this.velocity = 0;
						break;
					}
				}
			}
		}

	},
	//加速減速を考慮してkiloを決める
	calcKilo : function(route, time){
		//2駅間の距離
		var distance = route.endStation.kilo - route.startStation.kilo;
		//所要時間(秒)
		var timeReq = (route.endTime - route.startTime) / 1000;
		//現在時刻(秒)
		var current = (time - route.startTime) / 1000;
		if(timeReq < this.accTime + this.decTime)
		{
			//加減速にかかる時間よりも所要時間が短い場合

			//所要時間を加速時間・減速時間の比で掛けて加減速時間を求める
			var accDash = timeReq * this.accTime / (this.accTime + this.decTime);
			var decDash = timeReq * this.decTime / (this.accTime + this.decTime);
			//最高速(km/s)を求める
			var Vmax = distance / (timeReq/2);
			if(accDash >= current)
			{
				//加速中
				this.velocity = Vmax * current / accDash * 3600;
				var ret = Vmax / accDash * current * current / 2;
				return route.startStation.kilo + ret;
			}
			else
			{
				//減速中
				this.velocity = Vmax * (timeReq - current) / decDash * 3600;
				var ret = distance - Vmax / decDash * (timeReq - current) * (timeReq - current) / 2;
				return route.startStation.kilo + ret;
			}
		}
		else
		{
			//加速-最高速-減速のパターン

			//最高速(km/s)を求める
			var Vmax = distance / (timeReq - this.accTime/2 - this.decTime/2);
			if(this.accTime >= current)
			{
				//加速中
				this.velocity = Vmax * current / this.accTime * 3600;
				var ret = Vmax / this.accTime * current * current / 2;
				return route.startStation.kilo + ret;
			}
			else if(timeReq - this.decTime >= current)
			{
				//最高速運転中
				this.velocity = Vmax * 3600;
				var ret = Vmax * (2*current - this.accTime) / 2;
				return route.startStation.kilo + ret;
			}
			else
			{
				//減速中
				this.velocity = Vmax * (timeReq - current) / this.decTime * 3600;
				var ret = distance - Vmax / this.decTime * (timeReq - current) * (timeReq - current) / 2;
				return route.startStation.kilo + ret;
			}
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
	},
	putToStage : function(){
		this.stage.addChild(this.shape);
		this.onStage = true;
	},
	removeFromStage : function(){
		this.stage.removeChild(this.shape);
		this.onStage = false;
	},
	//始発駅
	firstStation : function(){
		return this.routes[0].startStation;
	},
	//終着駅
	lastStation : function(){
		return this.routes[this.routes.length-1].endStation;
	},
	//開始時間
	startTime : function(){
		if(!this.prevTrain){
			return this.routes[0].startTime;
		}
		//乗り入れがあった場合は前の電車の到着時間を返す
		return this.prevTrain.routes[this.prevTrain.routes.length-1].endTime;
	},
	//終了時間
	endTime : function(){
		return this.routes[this.routes.length-1].endTime;
	},
}
