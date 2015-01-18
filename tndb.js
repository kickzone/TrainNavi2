/*データベースの内容を読み込み、保持、TNModelからの要請に応じてデータを返すモジュール*/
var TNDb = (function(){

	//private

	//パッケージファイルを使うかどうか
	//使わない場合はDBを読む
	var packageFile = "";
	var zip;
	var PACK_STATIC = "package_static.tn";
	var PACK_BASE  = "package_train";
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
	var trainHeaders = {};

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


	function readTrainsFromPackage(fromTime, toTime, service, trains, callback)
	{
		//まずキャッシュを基に読み込む行番号のリストを作成
		var lineListToRead = makeLineListToRead(fromTime, toTime, service, trains);
		//zipファイルを読んでdbBufferに追加
		var buffer = [];
		$.each(validLines, function(i, lineName){
			var lineid = packageLines.indexOf(lineName) + 1;
			buffer.push("-" + lineid + "," + lineName);
			var tmp = "00" + String( lineid );
			var fileName = PACK_BASE + tmp.substr(tmp.length - 2) + ".tn";
			var textTrains = zip.file(fileName).asText();
			var textLines = textTrains.split("\n");
			var lineList = lineListToRead[lineName];
			for(var j=0; j<lineList.length; j++){
				buffer.push(textLines[lineList[j]]);
			}
		});
		dbBuffer['train'] = buffer;
		callback();
	}

	//読み込む行番号のリストを作成
	function makeLineListToRead(fromTime, toTime, service, trains){
		var retList = {};
		//まず時間を見て追加
		$.each(validLines, function(i, lineName){
			var retListSub = [];
			retList[lineName] = retListSub;
			var thArr = trainHeaders[lineName];
			for(var j=0; j<thArr.length; j++){
				if(thArr[j].isMatch(fromTime, toTime, service, trains, lineName)){
					retList[lineName].push(j);
				}
			}
		});
		//次に直通列車を追加
		$.each(validLines, function(i, lineName){
			var retListSub = retList[lineName]
			var thArr = trainHeaders[lineName];
			var currentLineName = lineName;
			for(var j=0; j<retListSub.length; j++){
				var header = thArr[retListSub[j]];
				while(header.nextLineID){
					var nextLineName = packageLines[header.nextLineID-1];
					//読み込み対象の路線か？
					if(validLines.indexOf(nextLineName) == -1) break;
					var nextList = retList[nextLineName];
					var nextThArr = trainHeaders[nextLineName];
					//直通先のheaderをゲット
					var nextTh = null;
					var nextThIdx = -1;
					for(var k=0; k<nextThArr.length; k++){
						if(nextThArr[k].trainName == header.nextTrainName){
							nextTh = nextThArr[k];
							nextThIdx = k;
							break;
						}
					}
					if(!nextTh) break;
					//すでに読み込み済み、または読み込む予定ではないか？
					var alreadyLoaded = false;
					for(var k=0; k<trains.length; k++){
						if(trains[k].line.lineName == currentLineName && trains[k].trainName == header.nextTrainName){
							alreadyLoaded = true;
							break;
						}
					}
					if(alreadyLoaded) break;
					if(nextList.indexOf(nextThIdx) != -1) break;

					//配列に加える
					nextList.push(nextThIdx);

					//さらに直通先があれば再起読み込み
					header = nextTh;
					currentLineName = nextLineName;
				}
			}
		});

		return retList;
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

	//パッケージファイル用 lineidの路線をTNTrainHeadersの配列にして保存
	function cacheLinesFromPackage(lineName)
	{
		var lineid = packageLines.indexOf(lineName) + 1;
		var tmp = "00" + String( lineid );
		var fileName = PACK_BASE + tmp.substr(tmp.length - 2) + ".tn";
		var textTrains = zip.file(fileName).asText();
		var textLines = textTrains.split("\n");
		var headers = [];
		for(var i=0; i<textLines.length; i++){
			var header = new TNTrainHeader(textLines[i]);
			headers.push(header);
		}
		trainHeaders[lineName] = headers;
	}

	//路線データをパッケージから読み込む DBと違って列車のヘッダーも作成する
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
					if(validLines.indexOf(items[1]) == -1)
					{
						isValidLine = false;
					}
					else
					{
						isValidLine = true;
						//この時点で列車のキャッシュをしておく
						if(sectionName == "line"){
							cacheLinesFromPackage(items[1]);
						}
					}
				}
				if(isValidLine){
					currentArr.push(retLines[i]);
				}
			}
		}
	}

	//パッケージファイルを開く zipファイルは開きっぱなしにしておく
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

