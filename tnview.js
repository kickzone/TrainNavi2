/*画面表示担当のモジュール*/
var TNView = (function(cj){

	//private

	//stage
	var stage;

	//canvas
	var canvas;

	//路線オブジェクト TNModelと共有する
	var lines;

	//TNModelの参照
	var Model;

	//基準値 左上の点 山梨県上野原市棡原
	//var latitude_base_lu = 35.687787;
	//var longitude_base_lu = 139.099490;
	//基準値 右下の点 神奈川県横須賀市浦賀５
	//var latitude_base_rd = 35.247455;
	//var longitude_base_rd = 139.709413

	var latitude_base, longitude_base;

	//canvasの幅と高さ
	var width, height;

	//現在の相対X, Y座標
	var relX = 0, relY = 0;

	//現在の倍率
	var scale = 16.0;

	//各オブジェクト北緯・東経からx-y座標を求める際に掛ける係数
	//var coefXY;
	var coef;

	//列車を何ピクセル分線路から離すか
	var tdist = 10;

	//駅名表示するかどうか
	var destView;

	//スキンファイル
	var skinFile = null;


	//緯度経度で初期化
	/*function InitLatLon(){
		//すべての駅・中継点の座標からmaxとminを算出し、係数と基準値を算出
		var minLat = 180, maxLat = 0, minLon = 360, maxLon = 0;
		$.each(lines, function(i, line){
			$.each(line.getSortedPoints(), function(j, point){
				if(minLat > point.latitude) minLat = point.latitude;
				if(maxLat < point.latitude) maxLat = point.latitude;
				if(minLon > point.longitude) minLon = point.longitude;
				if(maxLon < point.longitude) maxLon = point.longitude;
			});
		});
		//端の調整
		minLat -= 0.01;
		minLon -= 0.01;
		maxLat += 0.01;
		maxLon += 0.01;

		//canvasの幅、高さと基準値を使って、X-Y座標に掛けるための係数を得る
		var coefW = width / (maxLon - minLon);
		var coefH = height / (maxLat - minLat);
		coefXY = Math.min(coefW, coefH);
		//latitude = (maxLat + minLat) / 2;
		//longitude = (maxLon + minLon) / 2;
		latitude_base_lu = maxLat;
		longitude_base_lu = minLon;
		latitude_base_rd = minLat;
		longitude_base_rd = maxLon;
	}*/

	function InitLatLon(){
		//すべての駅・中継点の座標からmaxとminを算出し、係数と基準値を算出
		var minLat = 180, maxLat = 0, minLon = 360, maxLon = 0;
		$.each(lines, function(i, line){
			$.each(line.getSortedPoints(), function(j, point){
				if(minLat > point.latitude) minLat = point.latitude;
				if(maxLat < point.latitude) maxLat = point.latitude;
				if(minLon > point.longitude) minLon = point.longitude;
				if(maxLon < point.longitude) maxLon = point.longitude;
			});
		});

		//中心点を基準とする
		latitude_base = (minLat + maxLat) / 2;
		longitude_base = (minLon + maxLon) / 2;

		//XY係数を算出
		//すべての駅が収まるsizeにする
		var scaleTry, coefTry;
		for(scaleTry = 1; scaleTry < 1024; scaleTry *= 2){
			coefTry = TNFuncs.calcCoefXY(latitude_base, scaleTry);
			if((maxLat - minLat) * coefTry.X <= width
				&& (maxLon - minLon) * coefTry.Y <= height) break;
		}
		scale = scaleTry;
		coef = coefTry;
	}

	//線路のオブジェクトを作成
	function DrawLines(){
		$.each(lines, function(i, line){
			var beforePoint = null;
			$.each(line.stations, function(j, station){
				if(skinFile){

				}else{
					//緯度経度からの計算
					var absX = (station.longitude - longitude_base) * coef.X + (width/2);
					var absY = (latitude_base - station.latitude) * coef.Y + (height/2);
					station.makeObject(cj, stage, absX, absY);
				}
			});
			$.each(line.railroads, function(j, railroad){
				if(skinFile){

				}else{
					//緯度経度からの計算
					var x = (railroad.end.longitude - railroad.start.longitude) * coef.X;
					var y = (railroad.start.latitude - railroad.end.latitude) * coef.Y;
					railroad.makeObject(cj, stage, x, y);
				}
			});
		});
	}

	//線路や列車などの相対X-Y座標を移動
	function MoveObjects(){
		$.each(lines, function(i, line){
			var beforePoint = null;
			$.each(line.stations, function(j, station){
				station.moveObject(relX, relY);
			});
			$.each(line.railroads, function(j, railroad){
				railroad.moveObject(relX, relY);
			});
		});
	}

	//倍率変更
	function SetScale(toScale){
		relX *= (scale / toScale);
		relY *= (scale / toScale);
		scale = toScale;
		coef = TNFuncs.calcCoefXY(latitude_base, scale);
		DrawLines();
		MoveObjects();
	}

	//列車を描画
	function DrawTrains()
	{
		var trains = Model.getTrains();
		var currentTime = Model.getCurrentTime();
		var currentTimeMinus1Min = new Date(currentTime.getTime() - 60 * 1000);
		var currentTimePlus1Min = new Date(currentTime.getTime() + 60 * 1000);
		$.each(trains, function(i, train){
			if(train.onObject){
				if(train.onObject.onStage){
					if(!train.shape){
						train.makeObject(cj, stage);
					}
					if(!train.started){
						//rail上に乗ってない場合
						//開始1分前ならstageに乗せる
						//ただし、直通列車はギリギリで載せる
						if(train.prevTrain){
							if(train.prevTrain.endTime() <= currentTime && currentTime < train.endTime()){
								//位置を更新
								train.onObject.setXY(train);
								train.moveObject(relX, relY);
								train.start();
								train.putToStage();
							}
						}
						else if(train.startTime() <= currentTimePlus1Min && currentTime < train.endTime()){
							//位置を更新
							train.onObject.setXY(train);
							train.moveObject(relX, relY);
							train.putToStage();
							if(train.startTime() <= currentTime){
								train.start();
							}
						}
					}
					else{
						//rail上に乗ってる場合
						if(!train.onStage){
							if(!train.shape){
								train.makeObject(cj, stage);
							}
							train.putToStage();
						}
						if(train.startTime() <= currentTimePlus1Min && currentTime <= train.endTime()){
							if(train.startTime() <= currentTime && currentTime <= train.endTime())
							{
								if(!train.started){
									train.start();
								}
							}
						}
						else{
							//終了時間になった
							//1分たったら削除
							//ただし直通先がある場合は即時削除
							if(train.nextTrain){
								if(!train.ended){
									train.end();
									train.removeFromStage();
									train.toDelete = true;
								}
							}else{
								if(!train.ended){
									train.end();
								}
								if(train.endTime() <= currentTimeMinus1Min){
									train.removeFromStage();
									train.toDelete = true;
								}
							}
						}
						//位置を更新
						train.onObject.setXY(train);
						train.moveObject(relX, relY);
					}
				}else{
					//2014/11/30 onObjectがstage上に乗ってない場合はオブジェクトをstage上から消す
					train.removeFromStage();
					//終了時間を1分すぎていたら削除
					if(currentTime >= train.endTime()){
						if(train.nextTrain){
							if(!train.ended){
								train.end();
								train.removeFromStage();
								train.toDelete = true;
							}
						}else{
							if(!train.ended){
								train.end();
							}
							if(train.endTime() <= currentTimeMinus1Min){
								train.removeFromStage();
								train.toDelete = true;
							}
						}
					}
				}

			}
		});
		stage.update();
	}

	//マウスイベント
	var dragEvents = {
		onDrag : false,
		startX : 0,
		startY : 0,
		currentX : 0,
		currentY : 0}
	;

	//クリック、ドラッグ開始
	function OnCanvasMouseDown(evt){
		dragEvents.onDrag = true;
		dragEvents.startX = evt.pageX;
		dragEvents.startY = evt.pageY;
		dragEvents.currentX = evt.pageX;
		dragEvents.currentY = evt.pageY;
	}

	//ドラッグ中
	function OnCanvasMouseMove(evt){
		if(dragEvents.onDrag){
			if(dragEvents.currentX != evt.pageX || dragEvents.currentY != evt.pageY){
				relX += (evt.pageX - dragEvents.currentX);
				relY += (evt.pageY - dragEvents.currentY);
				MoveObjects();
				stage.update();
				dragEvents.currentX = evt.pageX;
				dragEvents.currentY = evt.pageY;
			}
		}
	}

	//ドラッグ終了
	function OnCanvasMouseUp(evt){
		dragEvents.onDrag = false;
	}

	function OnCanvasMouseWheel(e){
		var toScale = scale;
		 e.preventDefault();
		 var delta = e.originalEvent.deltaY ? -(e.originalEvent.deltaY) : e.originalEvent.wheelDelta ? e.originalEvent.wheelDelta : -(e.originalEvent.detail);
		 if (delta > 0){
			 toScale /= 2;
		 } else {
			 toScale *= 2;
		 }
		SetScale(toScale);

		return false;
	}

	//public
	return{
		//初期化
		init: function(option){
			//必要なオブジェクトをゲットするなど
			Model = TNModel;
			lines = Model.getLines();
			canvas = $("canvas")[0];
			stage = new cj.Stage(canvas);
			stage.removeAllChildren();
			width = canvas.width;
			height = canvas.height;
			this.destView = option.dest;
			if(skinFile){

			}else{
				//スキンなし 緯度経度から路線を作成する
				InitLatLon();
			}
			//路線描画
			DrawLines();
			MoveObjects();
			stage.update();

			//二重にイベントが発生しないようにする
			canvas.removeEventListener('mousedown', OnCanvasMouseDown, false);
			canvas.removeEventListener('mousemove', OnCanvasMouseMove, false);
			canvas.removeEventListener('mouseup', OnCanvasMouseUp, false);
			canvas.removeEventListener("mousewheel" , OnCanvasMouseWheel, false);
			var mousewheelevent = 'onwheel' in document ? 'wheel' : 'onmousewheel' in document ? 'mousewheel' : 'DOMMouseScroll';
			$("canvas").off(mousewheelevent, OnCanvasMouseWheel);

			//canvasのマウスイベントを作成
			canvas.addEventListener('mousedown', OnCanvasMouseDown, false);
			canvas.addEventListener('mousemove', OnCanvasMouseMove, false);
			canvas.addEventListener('mouseup', OnCanvasMouseUp, false);
			canvas.addEventListener("mousewheel" , OnCanvasMouseWheel, false);
			$("canvas").on(mousewheelevent, OnCanvasMouseWheel);
		},
		drawTrains : function(){
			DrawTrains();
		},
		tdist: tdist,
		destView : destView
	};

})(createjs);