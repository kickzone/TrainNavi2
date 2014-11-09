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

	function readTrainsFromDB(fromTime, toTime)
	{

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
		//路線、駅などのデータ読み込み(静的でよい)
		readLines : function()
		{
			if(packageFile == "") readLinesFromDB();
			else readLinesFromPackage();
		},
		//列車の読み込み
		readTrains : function(fromTime, toTime)
		{
			if(packageFile == "") readTrainsFromDB(fromTime, toTime);
			else readTrainsFromPackage(fromTime, toTime);
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

