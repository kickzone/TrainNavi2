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

	//路線、駅などの静的オブジェクト読み込み
	function readLines(aStrLines)
	{
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
				if(val.indexOf("-") == 0)
				{
					var lineid = val.substring(1, val.indexOf(","));
					currentLine = lines[lineid-1];
				}
				else
				{
					currentLine.halfways.push(new TNHalfway(currentLine, val));
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
					line.railroads.push(new TNRailroad(line, beforePoint, point));
				}
				beforePoint = point;
			});
		});
	}

	//public
	return{
		init : function(aStrLines)
		{
			lines = [];
			trains = [];
			DB = TNDb
			View = TNView;
			makeLines(aStrLines);

		},
		GetLines : function(){
			return lines;
		}

	};

})();