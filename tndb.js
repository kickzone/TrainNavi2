/*データベースの内容を読み込み、保持、TNModelからの要請に応じてデータを返すモジュール*/
var TNDb = (function(){

	//private

	//パッケージファイルを使うかどうか
	//使わない場合はDBを読む
	var packageFile = "";

	//スキンファイル(現時点無効)
	var skinFile = "";

	//有効な路線一覧
	//DBモードでは配列番号+1を路線番号として扱う
	//PHPに必ず渡す
	var validLines = [];

	//DBバッファ
	//セクション名がキー、内容はテキストの配列
	var dbBuffer = {};

	//オプション
	var options = {};

	//読み込み済み列車一覧の配列を作成する
	function makeLoadedTrainsList(trains)
	{
		var ret = [];
		$.each(validLines, function(i, line){
			var subArr = [];
			$.each(trains, function(j, train){
				if(train.line.lineName == line){
					subArr.push(train.trainName);
				}
			});
			ret.push(subArr);
		});
		return ret;
	}

	//DBからfromTime～toTimeの列車をゲット、文字列の配列を返す、callbackをコールする
	function readTrainsFromDB(fromTime, toTime, trains, callback)
	{
		var fromTimeStr = ToStringTime(fromTime);
		var toTimeStr = ToStringTime(toTime);
		var loadedTrainList = makeLoadedTrainsList(trains);
		var tlJSON = JSON.stringify(loadedTrainList);
		$.ajax({
			async: true,
			type: "POST",
			url: "tnajax_train.php",
			data: { Lines : validLines, FromTime : fromTimeStr, ToTime : toTimeStr, LoadedTrains : tlJSON }
		}).done(function( msg ) {
			var retStr = msg.split("\n");
			dbBuffer['train'] = retStr;
			callback();
		});
	}

	function readTrainsFromPackage(fromTime, toTime)
	{

	}

	function readLinesFromDB()
	{
		$("#status").text("列車情報読み込み中...");
		//路線、駅一覧などをゲット
		//asyncにする必要はない
		$.ajax({
			async: false,
			type: "POST",
			url: "tnajax_init.php",
			data: { Lines : validLines }
		}).done(function( msg ) {
			var retLines = msg.split("\n");
			var currentArr = [];
			for(var i=0; i<retLines.length; i++)
			{
				//セクションが始まった
				if(retLines[i].indexOf("[") == 0)
				{
					var sectionName = retLines[i].substring(1, retLines[i].length-1);
					currentArr = [];
					dbBuffer[sectionName] = currentArr;
				}
				else
				{
					currentArr.push(retLines[i]);
				}
			}
			$("#status").text("列車情報読み込み終了");
		});
	}

	function readLinesFromPackage(fromTime, toTime, trains, callback)
	{

	}

	function ToStringTime(time)
	{
		var retStr = ("0"+(time.getHours())).slice(-2) + ":" + ("0"+(time.getMinutes())).slice(-2) + ":" + ("0"+(time.getSeconds())).slice(-2);
		return retStr;
	}

	//public
	return{
		setPackageFile : function(name)
		{
			packageFile = name;
		},

		addValidLines : function(line)
		{
			validLines.push(line);
		},
		clearValidLines : function()
		{
			validLines = [];
		},
		//路線、駅などのデータ読み込み(静的でよい)
		readLines : function()
		{
			if(packageFile == "") readLinesFromDB();
			else readLinesFromPackage();
		},
		//列車の読み込み
		readTrains : function(fromTime, toTime, trains, callback)
		{
			if(packageFile == "") readTrainsFromDB(fromTime, toTime, trains, callback);
			else readTrainsFromPackage(fromTime, toTime, trains, callback);
		},
		//あるセクションのデータゲット
		getSectionData : function(sectionName)
		{
			if(sectionName in dbBuffer)
			{
				return dbBuffer[sectionName];
			}
			else return null;
		},
		//いらなくなったのでセクションのデータを削除
		clearSectionData : function(sectionName)
		{
			if(sectionName in dbBuffer)
			{
				//本当にこれでいいんかね？要確認
				delete dbBuffer[sectionName];
			}
		}
	};

})();

