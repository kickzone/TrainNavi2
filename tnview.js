/*画面表示担当のモジュール*/
var TNView = (function(cj){

	//private

	//stage
	var stage;

	//路線オブジェクト TNModelと共有する
	var lines;

	//TNModelの参照
	var Model;

	//基準値 左上の点 山梨県上野原市棡原
	var latitude_base_lu = 35.687787;
	var longitude_base_lu = 139.099490;
	//基準値 右下の点 神奈川県横須賀市浦賀５
	var latitude_base_rd = 35.247455;
	var longitude_base_rd = 139.709413

	//canvasの幅と高さ
	var width, height;

	//現在の相対X, Y座標
	var relX = 0, relY = 0;

	//現在の倍率
	var scale = 1.0;

	//各オブジェクト北緯・東経からx-y座標を求める際に掛ける係数
	var coefXY;

	//列車を何ピクセル分線路から離すか
	var tdist = 10;

	//スキンファイル
	var skinFile = null;

	//緯度経度で初期化
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
	}

	//線路のオブジェクトを作成
	function DrawLines(){
		$.each(lines, function(i, line){
			var beforePoint = null;
			$.each(line.stations, function(j, station){
				if(skinFile){

				}else{
					//緯度経度からの計算
					var absX = (station.longitude - longitude_base_lu) * coefXY;
					var absY = (latitude_base_lu - station.latitude) * coefXY;
					station.makeObject(cj, stage, absX, absY);
				}
			});
			$.each(line.railroads, function(j, railroad){
				if(skinFile){

				}else{
					//緯度経度からの計算
					var x = (railroad.end.longitude - railroad.start.longitude) * coefXY;
					var y = (railroad.start.latitude - railroad.end.latitude) * coefXY;
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
	function SetScale(){
		$.each(lines, function(i, line){
			var beforePoint = null;
			$.each(line.stations, function(j, station){
				station.setScale(scale);
			});
			$.each(line.railroads, function(j, railroad){
				railroad.setScale(scale);
			});
		});
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
				if(!train.shape){
					train.makeObject(cj, stage);
				}
				if(!train.onStage && !train.ended){
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
							//train.started = true;
							//train.shape.text = "●";
						}
					}
					else if(train.startTime() <= currentTimePlus1Min && currentTime < train.endTime()){
						//位置を更新
						train.onObject.setXY(train);
						train.moveObject(relX, relY);
						train.putToStage();
						if(train.startTime() <= currentTime){
							train.start();
							//train.started = true;
							//train.shape.text = "●";
						}
					}
				}
				else{
					//rail上に乗ってる場合
					if(train.startTime() <= currentTimePlus1Min && currentTime <= train.endTime()){
						if(train.startTime() <= currentTime && currentTime <= train.endTime())
						{
							if(!train.started){
								//発車したらテキストを変える
								//train.started = true;
								//train.shape.text = "●";
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
								//train.ended = true;
								train.end();
								train.removeFromStage();
								train.toDelete = true;
							}
						}else{
							if(!train.ended){
								//train.ended = true;
								//終点まで来たらテキストを変える
								//train.shape.text = "◎";
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
			}
		});
		stage.update();
	}

	//public
	return{
		//初期化
		init: function(){
			//必要なオブジェクトをゲットするなど
			Model = TNModel;
			lines = Model.getLines();
			stage = new cj.Stage($("canvas")[0]);
			stage.removeAllChildren();
			width = $("canvas")[0].width;
			height = $("canvas")[0].height;
			if(skinFile){

			}else{
				//スキンなし 緯度経度から路線を作成する
				InitLatLon();
			}
			//路線描画
			DrawLines();
			MoveObjects();
			stage.update();
		},
		drawTrains : function(){
			DrawTrains();
		},
		//x-yに掛ける係数
		coefXY: coefXY,
		tdist: tdist
	};

})(createjs);