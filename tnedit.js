//エディットモード専用のハンドラ、関数を集めたモジュール
var TNEdit = (function(){

	//マウスイベント
	var railEvents = {
		onClick : false,
		target : null,
		startX : 0,
		startY : 0,
		currentX : 0,
		currentY : 0,
		stage : null,
		newRail1 : null,
		newRail2 : null,
		newHalfway : null,
	};

	//クリック、処理開始
	function OnRailMouseDown(evt){
		if(railEvents.onClick){
			return false;
		}else{
			railEvents.onClick = true;
			railEvents.startX = evt.stageX;
			railEvents.startY = evt.stageY;
			railEvents.currentX = evt.stageX;
			railEvents.currentY = evt.stageY;
			railEvents.target = evt.target;
			railEvents.stage = evt.target.getStage();

			var stage = railEvents.stage;

			//halfwayオブジェクトを作成
			//railroadオブジェクトも2つ作成
			var rail = evt.target.rail;
			var gmap = TNView.getGmap();
			var newHalfway = new TNHalfway(rail.line, "0,0,0,0,0,0,0,0,0,0,0");
			var latlng = TNFuncs.fromPointToLatLng(new google.maps.Point(evt.stageX, evt.stageY), gmap);
			newHalfway.latitude = latlng.lat();
			newHalfway.longitude = latlng.lng();
			//kiloは仮の値、後で再設定する
			newHalfway.kilo = (rail.start.kilo + rail.end.kilo) / 2;

			var newRail1 = new TNRailroad(rail.line, rail.start, newHalfway);
			var newRail2 = new TNRailroad(rail.line, newHalfway, rail.end);

			railEvents.newRail1 = newRail1;
			railEvents.newRail2 = newRail2;
			railEvents.newHalfway = newHalfway;

			//ポインタを修正
			newHalfway.prevRail = newRail1;
			newHalfway.nextRail = newRail2;
			newHalfway.prevPoint = rail.start;
			newHalfway.nextPoint = rail.end;
			rail.start.nextRail = newRail1;
			rail.start.nextPoint = newHalfway;
			rail.end.prevRail = newRail2;
			rail.end.prevPoint = newHalfway;

			//canvasにのせる
			var point = TNFuncs.fromLatLngToPoint(latlng, gmap)
			var rel = TNView.getRelativePos();
			newHalfway.makeObject(createjs, stage, point.x, point.y, TNView.getScale());
			newHalfway.moveObject(rel.x, rel.y);
			newRail1.makeObject(createjs, stage, newRail1.end.absX - newRail1.start.absX, newRail1.end.absY - newRail1.start.absY);
			newRail1.moveObject(rel.x, rel.y);
			newRail2.makeObject(createjs, stage, newRail2.end.absX - newRail2.start.absX, newRail2.end.absY - newRail2.start.absY);
			newRail2.moveObject(rel.x, rel.y);
			stage.removeChild(rail.shape);
			stage.addChild(newRail1.shape);
			stage.addChild(newRail2.shape);

			//canvasのイベントを捨てて、独自のイベントを実行
			TNView.removeEvents();
			var canvas = $("canvas")[0];
			canvas.addEventListener('mousedown', OnRailMouseDown_After, false);
			canvas.addEventListener('mousemove', OnRailMouseMove, false);

			stage.update();
		}
	}

	//2回目のクリック、処理終了
	function OnRailMouseDown_After(evt){
		var rail = railEvents.target.rail;
		var line = rail.line;
		var stage = railEvents.stage;
		var newRail1 = railEvents.newRail1;
		var newRail2 = railEvents.newRail2;
		var newHalfway = railEvents.newHalfway;
		//右クリックならキャンセル、左クリックなら決定
		if(evt.button == 0){
			//左クリック、決定
			//lineにオブジェクトを追加
			for(var i=0; i<line.railroads.length; i++){
				if(line.railroads[i] == rail){
					line.railroads.splice(i, 1);
					line.railroads.splice(i, 0, newRail2);
					line.railroads.splice(i, 0, newRail1);
					break;
				}
			}
			var gmap = TNView.getGmap();
			var latlng = TNFuncs.fromPointToLatLng(new google.maps.Point(newHalfway.absX, newHalfway.absY), gmap);
			newHalfway.latitude = latlng.lat();
			newHalfway.longitude = latlng.lng();
			line.halfways.push(newHalfway);
			line.halfways.sort(
				function(a, b){
					return a.kilo - b.kilo;
				}
			);
			//新しい路線にもイベントハンドラを登録
			TNEdit.setRailHandlers(newRail1);
			TNEdit.setRailHandlers(newRail2);
			//kiloを設定しなおす
			TNModel.recalcHalfwayKilo();
			//修正したlineにマークを付ける
			line.modifiedHalfways = true;

		}else{
			//右クリック、キャンセル
			//オブジェクトを元の状態に戻す
			rail.start = newRail1.start;
			rail.end = newRail2.end;
			rail.start.nextRail = rail;
			rail.end.prevRail = rail;
			stage.addChild(rail.shape);
			stage.removeChild(newRail1.shape);
			stage.removeChild(newRail2.shape);
		}
		railEvents.onClick = false;
		//viewのイベントハンドラを元に戻す
		var canvas = $("canvas")[0];
		canvas.removeEventListener('mousedown', OnRailMouseDown_After, false);
		canvas.removeEventListener('mousemove', OnRailMouseMove, false);
		TNView.resetEvents();
	}

	//処理中
	function OnRailMouseMove(evt){
		 var rect = evt.target.getBoundingClientRect();
		 var x = evt.clientX - rect.left;
		 var y = evt.clientY - rect.top;
		if(railEvents.currentX != x || railEvents.currentY != y){
			var stage = railEvents.stage;
			var newRail1 = railEvents.newRail1;
			var newRail2 = railEvents.newRail2;
			var newHalfway = railEvents.newHalfway;

			var rel = TNView.getRelativePos();
			newHalfway.makeObject(createjs, stage, x, y, TNView.getScale());
			newHalfway.moveObject(rel.x, rel.y);
			newRail1.makeObject(createjs, stage, newRail1.end.absX - newRail1.start.absX, newRail1.end.absY - newRail1.start.absY);
			newRail1.moveObject(rel.x, rel.y);
			newRail2.makeObject(createjs, stage, newRail2.end.absX - newRail2.start.absX, newRail2.end.absY - newRail2.start.absY);
			newRail2.moveObject(rel.x, rel.y);
			railEvents.currentX = evt.stageX;
			railEvents.currentY = evt.stageY;

			stage.update();
		}
	}

	//駅を移動するマウスイベント
	var stationEvents = {
		onDrag : false,
		target : null,
		startX : 0,
		startY : 0,
		currentX : 0,
		currentY : 0,
		stage : null,
	};


	//クリック、ドラッグ開始
	function OnStationMouseDown(evt){
		stationEvents.onDrag = true;
		stationEvents.target = evt.target;
		stationEvents.stage = evt.target.getStage();
		stationEvents.startX = evt.stageX;
		stationEvents.startY = evt.stageY;
		stationEvents.currentX = evt.stageX;
		stationEvents.currentY = evt.stageY;
		//canvasのイベントを捨てる
		TNView.removeEvents();
		var canvas = $("canvas")[0];
		canvas.addEventListener('mousemove', OnStationMouseMove, false);
		canvas.addEventListener('mouseup', OnStationMouseUp, false);
	}


	//ドラッグ中
	function OnStationMouseMove(evt){
		if(stationEvents.onDrag){
			 var rect = evt.target.getBoundingClientRect();
			 var x = evt.clientX - rect.left;
			 var y = evt.clientY - rect.top;
			//ドラッグしたら列車同期表示をやめる
			if(stationEvents.currentX != x|| stationEvents.currentY != y){
				var deltaX = (x - stationEvents.currentX);
				var deltaY = (y - stationEvents.currentY);
				var station = stationEvents.target.station;
				station.absX += deltaX;
				station.absY += deltaY;
				var gmap = TNView.getGmap();
				var latlng = TNFuncs.fromPointToLatLng(new google.maps.Point(x, y), gmap);
				station.latitude = latlng.lat();
				station.longitude = latlng.lng();

				var rel = TNView.getRelativePos();
				station.moveObject(rel.x, rel.y);
				var rail1 = station.prevRail;
				var rail2 = station.nextRail;
				if(rail1){
					rail1.makeObject(createjs, stationEvents.stage, rail1.end.absX - rail1.start.absX, rail1.end.absY - rail1.start.absY);
					rail1.moveObject(rel.x, rel.y);
				}
				if(rail2){
					rail2.makeObject(createjs, stationEvents.stage, rail2.end.absX - rail2.start.absX, rail2.end.absY - rail2.start.absY);
					rail2.moveObject(rel.x, rel.y);
				}

				stationEvents.stage.update();
				stationEvents.currentX = x;
				stationEvents.currentY = y;
			}
		}
	}

	//ドラッグ終了
	function OnStationMouseUp(evt){
		stationEvents.onDrag = false;
		//canvasのイベントを元に戻す
		var canvas = $("canvas")[0];
		canvas.removeEventListener('mousemove', OnStationMouseMove, false);
		canvas.removeEventListener('mouseup', OnStationMouseUp, false);
		TNView.resetEvents();
		//駅にチェックを付けておく
		stationEvents.target.station.modified = true;
	}

	//保存
	function Save(){
		$("#prop").text("");
		var status = "";
		var lines = TNModel.getLines();
		$.each(lines, function(i, line){
			if(line.modifiedHalfways){
				//halfwaysを保存
				var halfways_kilo = [];
				var halfways_lat = [];
				var halfways_lon = [];
				$.each(line.halfways, function(j, halfway){
					halfways_kilo.push(halfway.kilo);
					halfways_lat.push(halfway.latitude);
					halfways_lon.push(halfway.longitude);
				});
				$.ajax({
					async: true,
					type: "POST",
					url: "tnajax_edithalfway.php",
					data: { Line : line.lineName, Kilo : halfways_kilo, Lat : halfways_lat, Lon : halfways_lon }
				}).done(function( msg ) {
					status += "halfwaysを保存：" + line.lineName + "\n";
					$("#prop").text(status);
				});
			}
			$.each(line.stations, function(j, station){
				if(station.modified){
					$.ajax({
						async: true,
						type: "POST",
						url: "tnajax_editstation.php",
						data: { Line : line.lineName, Station : station.stationName, Lat : station.latitude, Lon : station.longitude }
					}).done(function( msg ) {
						status += "stationを保存：" + line.lineName + ":" + station.stationName + "\n";
						$("#prop").text(status);
					});
				}
			});
		});
	}

	//public
	return{
		setStationHandlers : function(station){
			station.shape.addEventListener('mousedown', OnStationMouseDown, false);
			//イベントハンドラでstationオブジェクトを参照できるようにしておく
			station.shape.station = station;
		},
		setRailHandlers : function(rail){
			rail.shape.addEventListener('mousedown', OnRailMouseDown, false);
			//イベントハンドラでrailroadオブジェクトを参照できるようにしておく
			rail.shape.rail = rail;
		},
		save : Save,
	};


})();