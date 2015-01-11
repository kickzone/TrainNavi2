/*データベースの内容を読み込み、保持、TNModelからの要請に応じてデータを返すモジュール*/
var TNDb = (function(){

	//private

	//パッケージファイルを使うかどうか
	//使わない場合はDBを読む
	var packageFile = "";
	var zip;
	var PACK_STATIC = "package_static.tn";
	var onLoading = false;

	//パッケージファイル内の路線一覧
	var packageLines = [];

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

	//パッケージ用
	//zipファイルを開いたとき、全列車の開始時刻・終了時刻をキャッシュしておく
	var trainStartTimes = [];
	var trainEndTimes = [];
	var trainServices = [];

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
	function readTrainsFromDB(fromTime, toTime, service, trains, callback)
	{
		var fromTimeStr = ToStringTime(fromTime);
		var toTimeStr = ToStringTime(toTime);
		var loadedTrainList = makeLoadedTrainsList(trains);
		var tlJSON = JSON.stringify(loadedTrainList);
		$.ajax({
			async: true,
			type: "POST",
			url: "tnajax_train.php",
			data: { Lines : validLines, FromTime : fromTimeStr, ToTime : toTimeStr, Service : service, LoadedTrains : tlJSON }
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
		});
	}

	function readLinesFromPackage()
	{
		var textStatic = zip.file(PACK_STATIC).asText();
		var retLines = textStatic.split("\n");
		var currentArr = [];
		var isValidLine = false;
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
				if(retLines[i].indexOf("-") == 0 || sectionName == "line"){
					//有効な路線かどうかチェック
					var items = retLines[i].split(",");
					if(validLines.indexOf(items[1]) == -1) isValidLine = false;
					else isValidLine = true;
				}
				if(isValidLine) currentArr.push(retLines[i]);
			}
		}
	}

	function openPackageMain()
	{
		//zipファイルをfilereaderで開く
		var reader = new FileReader();

		reader.onload = function(e) {
			zip = new JSZip(e.target.result);
			//路線一覧をゲットしておく
			packageLines = [];
			var textStatic = zip.file(PACK_STATIC).asText();
			var aLines = textStatic.split("\n");
			var existLine = false;
			for(var i=0; i<aLines.length; i++)
			{
				if(aLines[i].indexOf("[") == 0)
				{
					if(existLine) break;
					else if(aLines[i].indexOf("[line]") == 0) existLine = true;
				}
				else if(existLine)
				{
					var lineItems = aLines[i].split(",");
					packageLines.push(lineItems[1]);
				}
			}
			onLoading = false;
		}
		// read the file !
		// readAsArrayBuffer and readAsBinaryString both produce valid content for JSZip.
		onLoading = true;
		reader.readAsArrayBuffer(packageFile);
	}

	function ToStringTime(time)
	{
		var retStr = ("0"+(time.getHours())).slice(-2) + ":" + ("0"+(time.getMinutes())).slice(-2) + ":" + ("0"+(time.getSeconds())).slice(-2);
		return retStr;
	}

	//public
	return{
		openPackage : function(name)
		{
			packageFile = name;
			openPackageMain();
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
		readTrains : function(fromTime, toTime, service, trains, callback)
		{
			if(packageFile == "") readTrainsFromDB(fromTime, toTime,service,  trains, callback);
			else readTrainsFromPackage(fromTime, toTime, service, trains, callback);
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
		},
		packageLines : function() {return packageLines; },
		isLoading : function() {return onLoading; }
	};

})();

