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

	//現在の北緯東経 デフォルト値は基準値の左上
	//廃止
	//var latitude = (latitude_base_lu + latitude_base_rd) / 2;
	//var longitude = (longitude_base_lu + longitude_base_rd) / 2;

	//canvasの幅と高さ
	var width, height;

	//現在の相対X, Y座標
	var relX = 0, relY = 0;

	//現在の倍率
	var scale = 1.0;

	//各オブジェクト北緯・東経からx-y座標を求める際に掛ける係数
	var coefXY;

	//スキンファイル
	var skinFile = null;

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

	//線路のX-Y座標を移動
	function MoveLines(){
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


	//列車を描画
	function DrawTrains()
	{

	}

	//public
	return{
		//初期化
		init: function(){
			Model = TNModel;
			lines = Model.GetLines();
			stage = new cj.Stage($("canvas")[0]);
			stage.removeAllChildren();
			width = $("canvas")[0].width;
			height = $("canvas")[0].height;
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
			DrawLines();
			MoveLines();
			stage.update();
		},
		//x-yに掛ける係数
		coefXY: coefXY,
	};

})(createjs);