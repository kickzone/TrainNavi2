/*列車、路線などのオブジェクトを保持し、状態遷移や、TNViewのために計算などを行うモジュール*/
var TNModel = (function(){

	//private

	//路線オブジェクト
	var lines = [];
	//列車オブジェクト
	var trains = [];

	//TNViewの参照
	var View;
	//TNDbへの参照
	var DB;

	//fps
	var fps = 10;
	//倍速
	var speed = 1;
	//平日休日
	var service = 1;

	//startをコールしたPC時間を保存、これを基準にしてあらゆる処理を行う
	var stdTime;
	//ブラウザから設定された開始時間 stdTimeと現在時間の差にspeedを掛けた値を画面表示に使用する
	var startTime = new Date();
	var currentTime;
	var dbReadTime;

	//何秒ごとに読み直すか
	var reloadSec = 60;

	var onInit = true;

	//プロパティ表示中のobj
	var propObj = null;

	//路線、駅などの静的オブジェクト読み込み
	function readLines(aStrLines)
	{
		DB.clearValidLines();
		$.each(aStrLines, function(i, val){
			DB.addValidLines(val);
		});
		DB.readLines();
	}

	function makeLines(aStrLines)
	{
		readLines(aStrLines);
		//路線オブジェクト作成
		var csvLines = DB.getSectionData("line");
		$.each(csvLines, function(i, val){
			lines.push(new TNLine(val));
		});
		//列車種類オブジェクト作成
		csvLines = DB.getSectionData("trainkind");
		var currentLine = null;
		$.each(csvLines, function(i, val){
			if(val.indexOf("-") == 0)
			{
				var lineid = val.substring(1, val.indexOf(","));
				currentLine = lines[lineid-1];
			}
			else
			{
				currentLine.trainKinds.push(new TNTrainKind(currentLine, val));
			}
		});
		//駅オブジェクト作成
		csvLines = DB.getSectionData("station");
		currentLine = null;
		$.each(csvLines, function(i, val){
			if(val.indexOf("-") == 0)
			{
				var lineid = val.substring(1, val.indexOf(","));
				currentLine = lines[lineid-1];
			}
			else
			{
				currentLine.stations.push(new TNStation(currentLine, val));
			}
		});
		//通過点オブジェクト作成
		csvLines = DB.getSectionData("halfway");
		currentLine = null;
		if(csvLines)
		{
			$.each(csvLines, function(i, val){
				if(val.length != 0){
					if(val.indexOf("-") == 0)
					{
						var lineid = val.substring(1, val.indexOf(","));
						currentLine = lines[lineid-1];
					}
					else
					{
						currentLine.halfways.push(new TNHalfway(currentLine, val));
					}
				}
			});
		}
		//線路オブジェクト作成
		$.each(lines, function(i, line){
			var beforePoint = null;
			//stationとhalfwayをpointとして同格に扱って、それを結ぶオブジェクトを作成
			$.each(line.getSortedPoints(), function(j, point){
				if(beforePoint != null)
				{
					var rail = new TNRailroad(line, beforePoint, point);
					line.railroads.push(rail);
					beforePoint.nextRail = rail;
					point.prevRail = rail;
					//ついでにpoint同士の参照も追加
					beforePoint.nextPoint = point;
					point.prevPoint = beforePoint;
				}
				beforePoint = point;
			});
			//halfwayのkiloを再設定
			$.each(line.halfways, function(j, halfway){
				var startStation = halfway, endStation = halfway;
				while(startStation){
					startStation = startStation.prevPoint;
					if(line.stations.indexOf(startStation) != -1) break;
				}
				while(endStation){
					endStation = endStation.nextPoint;
					if(line.stations.indexOf(endStation) != -1) break;
				}
				var thisDistance = 0, allDistance = 0;
				var point = startStation;
				while(point != endStation){
					var distance = point.nextRail.calcDistance();
					allDistance += distance;
					point = point.nextPoint;
					if(point == halfway) thisDistance = allDistance;
				}
				halfway.kilo = startStation.kilo + (endStation.kilo - startStation.kilo) * (thisDistance / allDistance);
			});
		});
		RecalcHalfwayKilo();
	}
	//halfwayのkiloを再設定
	function RecalcHalfwayKilo(){
		$.each(lines, function(i, line){
			$.each(line.halfways, function(j, halfway){
				var startStation = halfway, endStation = halfway;
				while(startStation){
					startStation = startStation.prevPoint;
					if(line.stations.indexOf(startStation) != -1) break;
				}
				while(endStation){
					endStation = endStation.nextPoint;
					if(line.stations.indexOf(endStation) != -1) break;
				}
				var thisDistance = 0, allDistance = 0;
				var point = startStation;
				while(point != endStation){
					var distance = point.nextRail.calcDistance();
					allDistance += distance;
					point = point.nextPoint;
					if(point == halfway) thisDistance = allDistance;
				}
				halfway.kilo = startStation.kilo + (endStation.kilo - startStation.kilo) * (thisDistance / allDistance);
			});
		});
	}

	//メイン処理
	function OnTickMain(){
		DeleteEndTrains();
		var now = new Date();
		currentTime = new Date(startTime.getTime() + (now - stdTime) * speed);
		//現在時間をtrainに送信
		$.each(trains, function(i, train){
			train.setTime(currentTime);
			if(train == propObj){
				if(train.ended){
					propObj = null;
				}
			}
		});
		//Viewを更新
		//描画
		View.drawTrains();
		//一定時間すぎたら(1分ごと)DBを読む
		var spanDBTime = dbReadTime - currentTime;
		if(spanDBTime < reloadSec * 1000 * speed){
			dbToReadTime = new Date(dbReadTime.getTime() + reloadSec * 1000 * speed * 2)
			DB.readTrains(dbReadTime, dbToReadTime, service, trains, AddTrains);
			dbReadTime = dbToReadTime;
		}
		$("#status").text(currentTime.toTimeString().substr(0, 8));
		//2014/12/07 プロパティ表示
		if(propObj){
			$("#prop").text(propObj.viewPropStr());
		}
	}

	//削除フラグがたった列車を消す
	function DeleteEndTrains()
	{
		for(var i=0; i<trains.length; i++){
			if(trains[i].toDelete){
				trains.splice(i, 1);
				i--;
			}
		}
	}


	//列車データがajaxでゲットされたときのコールバック用関数
	function AddTrains()
	{
		//TNDbから読み込んだデータをゲットして、Trainを作成
		var strTrains = DB.getSectionData("train");
		var currentLine = null;
		var trainPool = [];
		$.each(strTrains, function(i, val){
			if(val.indexOf("-") == 0)
			{
				var lineid = val.substring(1, val.indexOf(","));
				currentLine = lines[lineid-1];
			}
			else
			{
				//オブジェクト作成
				var train = new TNTrain(currentLine, val);
				//直通先を検索して関連付ける
				$.each(trainPool, function(j, trainInPool){
					if(trainInPool.nextLineID && !trainInPool.nextTrain){
						if(trainInPool.nextLineID == train.line.lineID && trainInPool.nextTrainName == train.trainName){
							trainInPool.nextTrain = train;
							train.prevTrain = trainInPool;
							//2014/12/02 直通前後で1秒も止まらない場合に対処
							if(trainInPool.routes[trainInPool.routes.length-1].endTime.getTime() == train.routes[0].startTime.getTime() && trainInPool.passage != 1)
							{
								trainInPool.routes[trainInPool.routes.length-1].endTime.setSeconds(-15);
								train.routes[0].startTime.setSeconds(15);
							}
						}
					}
					if(train.nextLineID && !train.nextTrain){
						if(train.nextLineID == trainInPool.line.lineID && train.nextTrainName == trainInPool.trainName){
							train.nextTrain = trainInPool;
							trainInPool.prevTrain = train;
							//2014/12/02 直通前後で1秒も止まらない場合に対処
							if(train.routes[train.routes.length-1].endTime.getTime() == trainInPool.routes[0].startTime.getTime() && train.passage != 1)
							{
								train.routes[train.routes.length-1].endTime.setSeconds(-15);
								train.routes[0].startTime.setSeconds(15);
							}
						}
					}
				});
				trainPool.push(train);
			}
		});
		//trainsに追加
		trains = trains.concat(trainPool);
		onInit = false;
	}


	//public
	return{
		//初期化
		init : function(aStrLines, option)
		{
			$("#status").text("路線情報読み込み中...");
			lines = [];
			trains = [];
			DB = TNDb;
			View = TNView;
			makeLines(aStrLines);
			speed = option.speed;
			fps = option.fps;
			startTime = option.startTime;
			service = option.service;
			this.viewProp(null);
			$("#status").text("路線情報読み込み終了");
			$("#prop").text("");
		},
		getLines : function(){
			return lines;
		},
		Speed : speed,
		FPS : fps,
		getStartTime : function(){
			return new Date(startTime.getTime());
		},
		getTrains : function(){
			return trains;
		},
		getCurrentTime : function(){
			return new Date(currentTime.getTime());
		},
		//処理開始
		start : function(){
			$("#status").text("列車読み込み中...");
			//開始時の列車情報読み込み
			dbReadTime = new Date(startTime.getTime() + reloadSec * 1000 * speed * 2)
			DB.readTrains(startTime, dbReadTime, service, trains, AddTrains);
			//読み込み処理が終わるまで待つ
			var wait = setInterval(function() {
			    if (!onInit) {
			    	//初期化が終わった
			    	clearInterval(wait);
					//初期状態の列車をセット
					stdTime = new Date();
					$("#status").text("列車描画中...");
					OnTickMain();
					//基準時間をセットしなおす
					stdTime = new Date();
					//イベント登録、開始
			    	createjs.Ticker.addEventListener("tick", OnTickMain);
			    	createjs.Ticker.setFPS(fps);
			    }
			}, 100);
		},
		//2014/12/07 objの内容をプロパティ画面に表示
		//objにはviewPropStr()を実装しておくこと
		viewProp : function(obj){
			propObj = obj;
			TNView.setCenterObj(obj);
		},
		recalcHalfwayKilo : RecalcHalfwayKilo,
	};

})();